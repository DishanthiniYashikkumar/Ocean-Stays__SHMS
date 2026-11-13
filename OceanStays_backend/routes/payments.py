"""Payments and invoices, with a simulated card / bank gateway.

The flow matches src/services/paymentService.js:
  POST /payments/intent  -> a Pending payment row, {intentId, clientSecret}
  POST /payments/confirm -> the row becomes Paid; a Pending booking becomes Confirmed
"""

import secrets
from decimal import Decimal

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, json_body, to_int, to_number
from mappings import ADMIN, GUEST, PAYMENT_METHOD, PAYMENT_STATUS, RECEPTIONIST
from routes.bookings import load_booking, load_bookings, lock_reservation
from serializers import BOOKING_SELECT, booking_out, invoice_out
from services import audit, notify, operational_settings, today

bp = Blueprint("payments", __name__)


def _invoices(payments):
    if not payments:
        return []
    ids = sorted({p["reservation_id"] for p in payments})
    settings = operational_settings()
    bookings = {b["id"]: b for b in load_bookings("r.reservation_id = ANY(%s)", [ids], settings=settings)}
    return [invoice_out(p, bookings[p["reservation_id"]]) for p in payments if p["reservation_id"] in bookings]


def _query_invoices(where, params):
    """Payments joined to their booking in one round trip."""
    rows = db.query(
        f"""SELECT row_to_json(p.*) AS payment_json, b.*
            FROM payment p
            JOIN ({BOOKING_SELECT}) b ON b.reservation_id = p.reservation_id
            {where}
            ORDER BY p.payment_date DESC, p.payment_id DESC""",
        params,
    )
    settings = operational_settings()
    return [invoice_out(row["payment_json"], booking_out(row, settings)) for row in rows]


@bp.get("/payments")
@require_roles(GUEST, RECEPTIONIST, ADMIN)
def list_payments():
    actor = current_actor()
    conditions, params = [], []
    if actor.role == GUEST:
        conditions.append("b.guest_user_id = %s")
        params.append(actor.user_id)
    else:
        guest_user = to_int(request.args.get("guestId"), "guestId")
        if guest_user:
            conditions.append("b.guest_user_id = %s")
            params.append(guest_user)
    status = request.args.get("status")
    if status:
        conditions.append("p.payment_status = %s")
        params.append(PAYMENT_STATUS.db(status))
    booking_id = to_int(request.args.get("bookingId"), "bookingId")
    if booking_id:
        conditions.append("p.reservation_id = %s")
        params.append(booking_id)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    return {"payments": _query_invoices(where, params)}


@bp.get("/payments/invoices/<int:payment_id>")
@require_roles(GUEST, RECEPTIONIST, ADMIN)
def get_invoice(payment_id):
    payment = db.query_one("SELECT * FROM payment WHERE payment_id = %s", (payment_id,))
    invoices = _invoices([payment] if payment else [])
    if not invoices or (current_actor().role == GUEST and invoices[0]["guestId"] != current_actor().user_id):
        raise ApiError(404, "We couldn't find that invoice.")
    return invoices[0]


def _booking_for(cur, booking_id, actor):
    res = lock_reservation(cur, booking_id)
    if actor.role == GUEST and res["guest_user_id"] != actor.user_id:
        raise ApiError(404, "We couldn't find that booking.")
    if res["reservation_status"] == "Cancelled":
        raise ApiError(409, "That booking has been cancelled.")
    return res


@bp.post("/payments/intent")
@require_roles(GUEST, RECEPTIONIST, ADMIN)
def create_intent():
    actor = current_actor()
    data = json_body()
    booking_id = to_int(data.get("bookingId"), "Booking", required=True)
    method_db = PAYMENT_METHOD.db(data.get("method") or "card")
    requested = to_number(data.get("amount"), "Amount")

    with db.transaction() as cur:
        _booking_for(cur, booking_id, actor)
        booking = load_booking(booking_id, cur)
        balance = Decimal(str(booking["balanceDue"]))
        if balance <= 0:
            raise ApiError(409, "This booking is already paid in full.")
        amount = balance if not requested or requested <= 0 else min(Decimal(str(requested)), balance)
        # One open intent per booking: replace any earlier unfinished attempt.
        cur.execute("UPDATE payment SET payment_status = 'Failed' WHERE reservation_id = %s "
                    "AND payment_status = 'Pending'", (booking_id,))
        payment = db.fetch_one(
            cur,
            """INSERT INTO payment (reservation_id, payment_date, amount, payment_method, payment_status)
               VALUES (%s, %s, %s, %s, 'Pending') RETURNING payment_id""",
            (booking_id, today(), amount, method_db),
        )

    return {
        "intentId": payment["payment_id"],
        "clientSecret": f"sim_{secrets.token_hex(12)}",
        "amount": float(amount),
        "currency": booking["currency"],
        "method": PAYMENT_METHOD.api(method_db),
    }, 201


@bp.post("/payments/confirm")
@require_roles(GUEST, RECEPTIONIST, ADMIN)
def confirm():
    actor = current_actor()
    data = json_body()
    intent_id = to_int(data.get("intentId"), "Payment", required=True)
    token = str(data.get("providerToken") or "")

    with db.transaction() as cur:
        payment = db.fetch_one(cur, "SELECT * FROM payment WHERE payment_id = %s FOR UPDATE", (intent_id,))
        if not payment:
            raise ApiError(404, "We couldn't find that payment.")
        booking_id = to_int(data.get("bookingId"), "Booking") or payment["reservation_id"]
        if booking_id != payment["reservation_id"]:
            raise ApiError(400, "That payment belongs to a different booking.")
        res = _booking_for(cur, booking_id, actor)
        if payment["payment_status"] == "Paid":
            raise ApiError(409, "This payment has already been completed.")
        if payment["payment_status"] != "Pending":
            raise ApiError(409, "This payment attempt has expired. Please start again.")

        if not token.startswith("sim_"):  # the simulated gateway declines anything else
            cur.execute("UPDATE payment SET payment_status = 'Failed' WHERE payment_id = %s", (intent_id,))
            declined = True
        else:
            declined = False
            reference = f"TXN-{secrets.token_hex(5).upper()}"
            cur.execute(
                """UPDATE payment SET payment_status = 'Paid', payment_date = %s, transaction_reference = %s
                   WHERE payment_id = %s""",
                (today(), reference, intent_id),
            )
            if res["reservation_status"] == "Pending":
                cur.execute("UPDATE reservation SET reservation_status = 'Confirmed' WHERE reservation_id = %s",
                            (booking_id,))
        booking = load_booking(booking_id, cur)
        payment = db.fetch_one(cur, "SELECT * FROM payment WHERE payment_id = %s", (intent_id,))

    if declined:
        audit(actor.user_id, "Payment", "Payments", f"INV-{intent_id} declined", "Failed")
        raise ApiError(402, "The payment was declined. Please try another method.")

    audit(actor.user_id, "Payment", "Payments", f"INV-{intent_id} {booking['reference']}")
    notify(booking["guestId"], "Payment", "Payment received",
           f"{float(payment['amount']):,.0f} {booking['currency']} received for {booking['reference']}. "
           f"Receipt {payment['transaction_reference']}.")
    invoice = invoice_out(payment, booking)
    return {"receiptReference": payment["transaction_reference"], "invoice": invoice, "booking": booking}
