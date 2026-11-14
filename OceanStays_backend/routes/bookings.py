"""Reservations: search, booking, changes, cancellation, check-in and check-out."""

from decimal import Decimal

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, arg_int, json_body, optional_text, to_date, to_int
from mappings import ADMIN, GUEST, RECEPTIONIST, RESERVATION_STATUS
from serializers import BOOKING_SELECT, booking_out, invoice_out, split_guest_bookings
from services import (
    audit,
    room_note,
    booking_totals,
    free_rooms,
    guest_id_for_user,
    hours_until_check_in,
    is_room_free,
    lock_category,
    notify,
    notify_role,
    now_naive,
    operational_settings,
    require_staff_id,
    today,
)

bp = Blueprint("bookings", __name__)

FRONT_DESK = (RECEPTIONIST, ADMIN)
READY_STATUSES = ("Available", "Inspected", "Reserved", "Clean")
MAX_NIGHTS = 30


# ---------------------------------------------------------------------------
# Loading and access checks
# ---------------------------------------------------------------------------


def load_bookings(where="", params=None, order="r.reservation_date DESC, r.reservation_id DESC",
                  limit=None, offset=None, cur=None, settings=None):
    sql = f"{BOOKING_SELECT} {('WHERE ' + where) if where else ''} ORDER BY {order}"
    params = list(params or [])
    if limit is not None:
        sql += " LIMIT %s OFFSET %s"
        params += [limit, offset or 0]
    rows = db.fetch_all(cur, sql, params) if cur is not None else db.query(sql, params)
    settings = settings or operational_settings(cur)
    return [booking_out(row, settings) for row in rows]


def load_booking(booking_id, cur=None):
    items = load_bookings("r.reservation_id = %s", [booking_id], cur=cur)
    if not items:
        raise ApiError(404, "We couldn't find that booking.")
    return items[0]


def ensure_can_see(booking, actor):
    if actor.role == GUEST and booking["guestId"] != actor.user_id:
        raise ApiError(404, "We couldn't find that booking.")
    if actor.role not in (GUEST, RECEPTIONIST, ADMIN):
        raise ApiError(403, "You don't have permission to view bookings.")


def lock_reservation(cur, booking_id):
    row = db.fetch_one(
        cur,
        """SELECT r.*, g.user_id AS guest_user_id FROM reservation r
           JOIN guest g ON g.guest_id = r.guest_id
           WHERE r.reservation_id = %s FOR UPDATE OF r""",
        (booking_id,),
    )
    if not row:
        raise ApiError(404, "We couldn't find that booking.")
    return row


def first_room(cur, booking_id):
    return db.fetch_one(
        cur,
        """SELECT rr.*, rm.room_number, rm.status AS room_status, rm.room_category_id
           FROM reservation_room rr JOIN room rm ON rm.room_id = rr.room_id
           WHERE rr.reservation_id = %s ORDER BY rr.reservation_room_id LIMIT 1""",
        (booking_id,),
    )


def guests_count(value):
    if isinstance(value, dict):
        total = (to_int(value.get("adults"), "Adults") or 0) + (to_int(value.get("children"), "Children") or 0)
    else:
        total = to_int(value, "Guests") or 0
    if total < 1:
        raise ApiError(400, "At least one guest is required.")
    return total


def validate_dates(check_in, check_out, allow_past=False):
    if check_in is None or check_out is None:
        raise ApiError(400, "Choose check-in and check-out dates.")
    if check_out <= check_in:
        raise ApiError(400, "Check-out must be after check-in.")
    if not allow_past and check_in < today():
        raise ApiError(400, "Check-in can't be in the past.")
    if (check_out - check_in).days > MAX_NIGHTS:
        raise ApiError(400, f"Online bookings are limited to {MAX_NIGHTS} nights.")


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------


@bp.get("/bookings")
@require_roles(*FRONT_DESK)
def list_bookings():
    conditions, params = [], []
    status = request.args.get("status")
    if status:
        conditions.append("r.reservation_status = %s")
        params.append(RESERVATION_STATUS.db(status))
    guest_user = to_int(request.args.get("guestId"), "guestId")
    if guest_user:
        conditions.append("g.user_id = %s")
        params.append(guest_user)
    on_date = to_date(request.args.get("date"), "date")
    if on_date:
        conditions.append("r.check_in_date <= %s AND r.check_out_date >= %s")
        params += [on_date, on_date]
    search = (request.args.get("search") or "").strip()
    if search:
        like = f"%{search}%"
        conditions.append(
            """(('RSV-' || r.reservation_id) ILIKE %s OR u.first_name ILIKE %s OR u.last_name ILIKE %s
                OR u.email ILIKE %s OR rc.room_name ILIKE %s OR rm.room_number ILIKE %s
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE %s)"""
        )
        params += [like] * 7

    where = " AND ".join(conditions)
    page_size = arg_int("pageSize", 10, 1, 500)
    page = arg_int("page", 1, 1)
    rows = db.query(
        f"""SELECT x.*, COUNT(*) OVER () AS total_count
            FROM ({BOOKING_SELECT} {('WHERE ' + where) if where else ''}) x
            ORDER BY x.reservation_date DESC, x.reservation_id DESC LIMIT %s OFFSET %s""",
        params + [page_size, (page - 1) * page_size],
    )
    if rows:
        total = rows[0]["total_count"]
    else:
        total = db.scalar(f"SELECT COUNT(*) FROM ({BOOKING_SELECT} {('WHERE ' + where) if where else ''}) x", params)
    settings = operational_settings()
    items = [booking_out(row, settings) for row in rows]
    return {"items": items, "page": page, "pageSize": page_size, "total": total,
            "totalPages": max(1, -(-total // page_size))}


@bp.get("/bookings/guest/<int:user_id>")
@require_roles(GUEST, *FRONT_DESK)
def guest_bookings(user_id):
    actor = current_actor()
    if actor.role == GUEST and actor.user_id != user_id:
        raise ApiError(403, "You can only see your own bookings.")
    guest_id = guest_id_for_user(user_id)
    if guest_id is None:
        return {"current": [], "upcoming": [], "past": []}
    return split_guest_bookings(load_bookings("r.guest_id = %s", [guest_id], order="r.check_in_date"))


@bp.get("/bookings/front-desk")
@require_roles(*FRONT_DESK)
def front_desk():
    day = today()
    # One round trip: every live booking, split into the four desk lists here.
    bookings = load_bookings("r.reservation_status <> 'Cancelled'", [], order="r.check_in_date, r.reservation_id")
    day_iso = day.isoformat()

    def iso(value):
        return value.isoformat() if value else ""

    arrivals = [b for b in bookings if b["status"] in ("PENDING", "CONFIRMED")
                and iso(b["checkIn"]) <= day_iso < iso(b["checkOut"])]
    in_house = sorted((b for b in bookings if b["status"] == "CHECKED_IN"), key=lambda b: iso(b["checkOut"]))
    departures = [b for b in in_house if iso(b["checkOut"]) <= day_iso]
    unpaid = sorted((b for b in bookings if b["balanceDue"] > 0.5), key=lambda b: iso(b["checkIn"]), reverse=True)[:50]
    return {"date": day, "arrivals": arrivals, "departures": departures,
            "inHouse": in_house, "unpaid": unpaid}


@bp.get("/bookings/<int:booking_id>")
@require_roles()
def get_booking(booking_id):
    booking = load_booking(booking_id)
    ensure_can_see(booking, current_actor())
    return booking


@bp.get("/bookings/<int:booking_id>/invoice")
@require_roles()
def booking_invoice(booking_id):
    booking = load_booking(booking_id)
    ensure_can_see(booking, current_actor())
    payment = db.query_one(
        "SELECT * FROM payment WHERE reservation_id = %s ORDER BY payment_id DESC LIMIT 1", (booking_id,))
    if payment is None:
        payment = {"payment_id": booking_id, "payment_status": "Pending", "payment_method": None,
                   "payment_date": None, "amount": 0, "transaction_reference": None}
    invoice = invoice_out(payment, booking)
    invoice["reference"] = f"INV-{payment['payment_id']}" if payment.get("amount") else f"QUOTE-{booking_id}"
    return invoice


# ---------------------------------------------------------------------------
# Create / change / confirm / cancel
# ---------------------------------------------------------------------------


@bp.post("/bookings")
@require_roles(GUEST, *FRONT_DESK)
def create_booking():
    actor = current_actor()
    data = json_body()
    category_id = to_int(data.get("roomTypeId"), "Room type", required=True)
    check_in = to_date(data.get("checkIn"), "Check-in date", required=True)
    check_out = to_date(data.get("checkOut"), "Check-out date", required=True)
    validate_dates(check_in, check_out)
    party = guests_count(data.get("guests", 1))
    special = optional_text(data, "specialRequests", 2000)

    if actor.role == GUEST:
        guest_user_id, channel = actor.user_id, "Direct"
    else:
        guest_user_id = to_int(data.get("guestId"), "Guest")
        if not guest_user_id:
            raise ApiError(400, "Choose the guest this booking is for.")
        channel = data.get("channel") if data.get("channel") in ("Walk-in", "Corporate", "OTA", "Direct") else "Walk-in"

    settings = operational_settings()
    with db.transaction() as cur:
        guest_id = guest_id_for_user(guest_user_id, cur)
        if guest_id is None:
            raise ApiError(400, "Only guest accounts can hold bookings.")
        category = db.fetch_one(
            cur, "SELECT room_category_id, room_name, capacity, base_price FROM room_category WHERE room_category_id = %s",
            (category_id,))
        if not category:
            raise ApiError(404, "That room type doesn't exist.")
        if party > category["capacity"]:
            raise ApiError(400, f"The {category['room_name']} sleeps up to {category['capacity']} guest(s).")

        lock_category(cur, category_id)
        rooms = free_rooms(cur, category_id, check_in, check_out)
        if not rooms:
            raise ApiError(409, f"Sorry, every {category['room_name']} is booked for those dates. "
                                "Try different dates or another room type.")
        nights = (check_out - check_in).days
        totals = booking_totals(category["base_price"], nights, settings)
        reservation = db.fetch_one(
            cur,
            """INSERT INTO reservation (guest_id, reservation_date, check_in_date, check_out_date,
                                        number_of_guests, reservation_status, special_requests,
                                        total_amount, booking_channel)
               VALUES (%s, %s, %s, %s, %s, 'Pending', %s, %s, %s) RETURNING reservation_id""",
            (guest_id, today(), check_in, check_out, party, special, totals["total"], channel),
        )
        booking_id = reservation["reservation_id"]
        cur.execute(
            """INSERT INTO reservation_room (reservation_id, room_id, room_rate, number_of_nights)
               VALUES (%s, %s, %s, %s)""",
            (booking_id, rooms[0]["room_id"], category["base_price"], nights),
        )
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Create", "Reservations", booking["reference"])
    notify(booking["guestId"], "Booking", "Booking received",
           f"{booking['reference']}: {booking['roomTypeName']}, {check_in:%d %b} – {check_out:%d %b %Y}. "
           "Complete payment to confirm your stay.")
    return booking, 201


@bp.patch("/bookings/<int:booking_id>")
@require_roles(GUEST, *FRONT_DESK)
def update_booking(booking_id):
    actor = current_actor()
    data = json_body()
    settings = operational_settings()
    with db.transaction() as cur:
        res = lock_reservation(cur, booking_id)
        if actor.role == GUEST and res["guest_user_id"] != actor.user_id:
            raise ApiError(404, "We couldn't find that booking.")
        if res["reservation_status"] not in ("Pending", "Confirmed"):
            raise ApiError(409, "Only pending or confirmed bookings can be changed.")
        if actor.role == GUEST and hours_until_check_in(res["check_in_date"], settings) < settings["modification_cutoff_hours"]:
            raise ApiError(409, f"Changes close {settings['modification_cutoff_hours']} hours before check-in. "
                                "Please contact reception.")

        check_in = to_date(data.get("checkIn"), "Check-in date") or res["check_in_date"]
        check_out = to_date(data.get("checkOut"), "Check-out date") or res["check_out_date"]
        validate_dates(check_in, check_out, allow_past=check_in == res["check_in_date"])
        party = guests_count(data["guests"]) if "guests" in data else res["number_of_guests"]
        special = optional_text(data, "specialRequests", 2000) if "specialRequests" in data else res["special_requests"]

        room = first_room(cur, booking_id)
        if room is None:
            raise ApiError(409, "This booking has no room assigned; please contact reception.")
        category = db.fetch_one(cur, "SELECT * FROM room_category WHERE room_category_id = %s",
                                (room["room_category_id"],))
        if party > category["capacity"]:
            raise ApiError(400, f"The {category['room_name']} sleeps up to {category['capacity']} guest(s).")

        room_id = room["room_id"]
        if (check_in, check_out) != (res["check_in_date"], res["check_out_date"]):
            lock_category(cur, category["room_category_id"])
            if not is_room_free(cur, room_id, check_in, check_out, booking_id):
                options = free_rooms(cur, category["room_category_id"], check_in, check_out, booking_id)
                if not options:
                    raise ApiError(409, f"No {category['room_name']} is free for those dates.")
                room_id = options[0]["room_id"]

        nights = (check_out - check_in).days
        totals = booking_totals(room["room_rate"], nights, settings)
        cur.execute(
            """UPDATE reservation SET check_in_date = %s, check_out_date = %s, number_of_guests = %s,
                      special_requests = %s, total_amount = %s WHERE reservation_id = %s""",
            (check_in, check_out, party, special, totals["total"], booking_id),
        )
        cur.execute(
            "UPDATE reservation_room SET room_id = %s, number_of_nights = %s WHERE reservation_room_id = %s",
            (room_id, nights, room["reservation_room_id"]),
        )
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Update", "Reservations", booking["reference"])
    notify(booking["guestId"], "Booking", "Booking updated",
           f"{booking['reference']} now runs {check_in:%d %b} – {check_out:%d %b %Y}.")
    return booking


@bp.post("/bookings/<int:booking_id>/confirm")
@require_roles(GUEST, *FRONT_DESK)
def confirm_booking(booking_id):
    actor = current_actor()
    with db.transaction() as cur:
        res = lock_reservation(cur, booking_id)
        if actor.role == GUEST and res["guest_user_id"] != actor.user_id:
            raise ApiError(404, "We couldn't find that booking.")
        if res["reservation_status"] == "Pending":
            cur.execute("UPDATE reservation SET reservation_status = 'Confirmed' WHERE reservation_id = %s",
                        (booking_id,))
        elif res["reservation_status"] != "Confirmed":
            raise ApiError(409, f"A {res['reservation_status'].lower()} booking can't be confirmed.")
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Status", "Reservations", f"{booking['reference']} confirmed")
    notify(booking["guestId"], "Booking", "Booking confirmed",
           f"{booking['reference']} is confirmed. Payment of {booking['balanceDue']:,.0f} {booking['currency']} "
           "is due on arrival." if booking["balanceDue"] else f"{booking['reference']} is confirmed.")
    return booking


@bp.post("/bookings/<int:booking_id>/cancel")
@require_roles(GUEST, *FRONT_DESK)
def cancel_booking(booking_id):
    actor = current_actor()
    reason = optional_text(json_body(), "reason", 500)
    settings = operational_settings()
    with db.transaction() as cur:
        res = lock_reservation(cur, booking_id)
        if actor.role == GUEST and res["guest_user_id"] != actor.user_id:
            raise ApiError(404, "We couldn't find that booking.")
        if res["reservation_status"] not in ("Pending", "Confirmed"):
            raise ApiError(409, f"A {res['reservation_status'].lower()} booking can't be cancelled.")

        free_window = hours_until_check_in(res["check_in_date"], settings) >= settings["free_cancellation_hours"]
        if actor.role == GUEST and not free_window:
            raise ApiError(409, f"Free cancellation closes {settings['free_cancellation_hours']} hours before "
                                "check-in. Please contact reception.")

        cur.execute("UPDATE reservation SET reservation_status = 'Cancelled' WHERE reservation_id = %s",
                    (booking_id,))
        refunded = Decimal(0)
        if free_window:
            paid = db.fetch_all(cur, "SELECT payment_id, amount FROM payment WHERE reservation_id = %s "
                                     "AND payment_status = 'Paid'", (booking_id,))
            for payment in paid:
                cur.execute("UPDATE payment SET payment_status = 'Refunded' WHERE payment_id = %s",
                            (payment["payment_id"],))
                refunded += payment["amount"]
        cur.execute("UPDATE payment SET payment_status = 'Failed' WHERE reservation_id = %s "
                    "AND payment_status = 'Pending'", (booking_id,))
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Status", "Reservations",
          f"{booking['reference']} cancelled" + (f": {reason}" if reason else ""))
    message = f"{booking['reference']} has been cancelled."
    if refunded:
        message += f" {refunded:,.0f} {booking['currency']} will be refunded to your original payment method."
        audit(actor.user_id, "Payment", "Payments", f"Refund {booking['reference']}")
    notify(booking["guestId"], "Booking", "Booking cancelled", message)
    booking["refundedAmount"] = float(refunded)
    return booking


# ---------------------------------------------------------------------------
# Front desk: check-in / check-out
# ---------------------------------------------------------------------------


@bp.post("/bookings/<int:booking_id>/check-in")
@require_roles(*FRONT_DESK)
def check_in(booking_id):
    actor = current_actor()
    data = json_body()
    requested_room = to_int(data.get("roomId"), "Room")
    day = today()

    with db.transaction() as cur:
        res = lock_reservation(cur, booking_id)
        if res["reservation_status"] not in ("Pending", "Confirmed"):
            raise ApiError(409, f"A {res['reservation_status'].lower()} booking can't be checked in.")
        if res["check_in_date"] > day:
            raise ApiError(409, f"This stay starts on {res['check_in_date']:%d %b %Y}.")
        if res["check_out_date"] <= day:
            raise ApiError(409, "This stay's dates have already passed.")

        room = first_room(cur, booking_id)
        target = requested_room or (room["room_id"] if room else None)
        if not requested_room and room and room["room_status"] not in READY_STATUSES:
            # The pre-assigned room isn't ready yet: take a ready one of the same type.
            ready = [r for r in free_rooms(cur, room["room_category_id"], day, res["check_out_date"], booking_id)
                     if r["status"] in READY_STATUSES]
            if ready:
                target = ready[0]["room_id"]
        if target is None:
            raise ApiError(400, "Choose a room to check the guest into.")
        new_room = db.fetch_one(cur, "SELECT * FROM room WHERE room_id = %s FOR UPDATE", (target,))
        if not new_room:
            raise ApiError(404, "That room doesn't exist.")
        if new_room["status"] in ("Maintaining", "Occupied", "Dirty", "Cleaning"):
            raise ApiError(409, f"Room {new_room['room_number']} isn't ready "
                                f"({new_room['status'].lower()}).")
        if not is_room_free(cur, target, day, res["check_out_date"], booking_id):
            raise ApiError(409, f"Room {new_room['room_number']} is held by another booking for these dates.")

        nights = (res["check_out_date"] - res["check_in_date"]).days
        if room is None:
            category = db.fetch_one(cur, "SELECT base_price FROM room_category WHERE room_category_id = %s",
                                    (new_room["room_category_id"],))
            cur.execute("""INSERT INTO reservation_room (reservation_id, room_id, room_rate, number_of_nights)
                           VALUES (%s, %s, %s, %s)""", (booking_id, target, category["base_price"], nights))
        elif room["room_id"] != target:
            cur.execute("UPDATE reservation_room SET room_id = %s WHERE reservation_room_id = %s",
                        (target, room["reservation_room_id"]))
            cur.execute("UPDATE room SET status = 'Available', notes = %s WHERE room_id = %s AND status = 'Reserved'",
                        (room_note("Available"), room["room_id"]))

        staff_id = require_staff_id(actor.user_id, cur)
        cur.execute(
            """INSERT INTO check_in (reservation_id, actual_check_in, check_in_status, checked_in_by)
               VALUES (%s, %s, 'Completed', %s)
               ON CONFLICT (reservation_id) DO UPDATE
               SET actual_check_in = EXCLUDED.actual_check_in, check_in_status = 'Completed',
                   checked_in_by = EXCLUDED.checked_in_by""",
            (booking_id, now_naive(), staff_id),
        )
        cur.execute("UPDATE room SET status = 'Occupied', notes = %s WHERE room_id = %s",
                    (room_note("Occupied"), target))
        cur.execute("UPDATE reservation SET reservation_status = 'Checked in' WHERE reservation_id = %s",
                    (booking_id,))
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Status", "Reservations", f"{booking['reference']} checked in to {booking['roomNumber']}")
    notify(booking["guestId"], "Booking", "Welcome to Ocean Stays",
           f"You're checked in to room {booking['roomNumber']}. Request anything from your dashboard.")
    return booking


@bp.post("/bookings/<int:booking_id>/check-out")
@require_roles(*FRONT_DESK)
def check_out(booking_id):
    actor = current_actor()
    with db.transaction() as cur:
        res = lock_reservation(cur, booking_id)
        if res["reservation_status"] != "Checked in":
            raise ApiError(409, "Only checked-in guests can be checked out.")
        booking = load_booking(booking_id, cur)
        if booking["balanceDue"] > 0.5:
            raise ApiError(409, f"{booking['balanceDue']:,.0f} {booking['currency']} is still outstanding. "
                                "Take payment before checking out.")
        room = first_room(cur, booking_id)
        staff_id = require_staff_id(actor.user_id, cur)
        cur.execute(
            """INSERT INTO check_out (reservation_id, actual_check_out, check_out_status, checked_out_by)
               VALUES (%s, %s, 'Completed', %s)
               ON CONFLICT (reservation_id) DO UPDATE
               SET actual_check_out = EXCLUDED.actual_check_out, check_out_status = 'Completed',
                   checked_out_by = EXCLUDED.checked_out_by""",
            (booking_id, now_naive(), staff_id),
        )
        cur.execute("UPDATE reservation SET reservation_status = 'Checked out' WHERE reservation_id = %s",
                    (booking_id,))
        task_id = None
        if room:
            cur.execute("UPDATE room SET status = 'Dirty', notes = %s WHERE room_id = %s",
                        (room_note("Dirty"), room["room_id"]))
            # Hand the room to housekeeping: a cleaning request plus its task.
            function = db.fetch_one(
                cur,
                """SELECT sf.function_id FROM service_function sf
                   JOIN service_type st ON st.service_type_id = sf.service_type_id
                   WHERE st.service_name = 'Housekeeping'
                   ORDER BY (sf.function_name = 'Room Cleaning') DESC, sf.function_id LIMIT 1""",
            )
            now = now_naive()
            sr = db.fetch_one(
                cur,
                """INSERT INTO service_request (function_id, reservation_room_id, room_id, request_date,
                                                request_time, description, priority, request_status, raised_at)
                   VALUES (%s, %s, %s, %s, %s, %s, 'High', 'Pending', %s) RETURNING service_request_id""",
                (function["function_id"], room["reservation_room_id"], room["room_id"], now.date(), now.time(),
                 f"Departure clean after {booking['reference']}", now),
            )
            task = db.fetch_one(
                cur,
                """INSERT INTO housekeeping_task (service_request_id, task_type, task_date, task_status, remarks)
                   VALUES (%s, 'Departure Clean', %s, 'Pending', %s) RETURNING housekeeping_task_id""",
                (sr["service_request_id"], now.date(), f"Guest checked out of {booking['reference']}"),
            )
            task_id = task["housekeeping_task_id"]
        booking = load_booking(booking_id, cur)

    audit(actor.user_id, "Status", "Reservations", f"{booking['reference']} checked out")
    notify(booking["guestId"], "Booking", "Thank you for staying with us",
           "We hope to welcome you back soon. Tell us about your stay from the Feedback page.")
    if task_id:
        notify_role("Housekeeping", "Housekeeping", "Departure clean needed",
                    f"Room {booking['roomNumber']} is vacant and needs cleaning.")
    booking["housekeepingTaskId"] = task_id
    return booking


