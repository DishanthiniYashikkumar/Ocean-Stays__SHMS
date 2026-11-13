"""SQL for the main read models and the functions that shape them for the UI.

Shapes follow what the React pages read (see src/services/*.js):
Booking, ServiceRequest, HousekeepingTask, Invoice, Notification and User.
"""

from datetime import datetime
from decimal import Decimal

from config import Config
from mappings import (
    NOTIFICATION_TYPE,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    PRIORITY,
    REQUEST_STATUS,
    RESERVATION_STATUS,
    ROLE,
    ROOM_STATUS,
    SERVICE_TYPE,
    TASK_TYPE_LABELS,
    USER_STATUS,
    task_type_key,
)
from services import booking_totals, today


def money(value):
    return float(value or 0)


def full_name(first, last, fallback=""):
    name = f"{first or ''} {last or ''}".strip()
    return name or fallback


def floor_number(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def iso_datetime(day, clock):
    if not day:
        return None
    if not clock:
        return datetime.combine(day, datetime.min.time()).isoformat()
    return datetime.combine(day, clock).isoformat()


# ---------------------------------------------------------------------------
# Bookings (reservation + its room + payments), one row per reservation
# ---------------------------------------------------------------------------

BOOKING_SELECT = """
    SELECT
        r.reservation_id, r.guest_id, g.user_id AS guest_user_id,
        r.reservation_date, r.check_in_date, r.check_out_date, r.number_of_guests,
        r.reservation_status, r.special_requests, r.total_amount, r.booking_channel,
        u.first_name, u.last_name, u.email, u.phone_number,
        rr.reservation_room_id, rr.room_id, rr.room_rate, rr.number_of_nights,
        rm.room_number, rm.floor, rm.status AS room_status,
        rc.room_category_id, rc.room_name, rc.base_price, rt.type_name,
        COALESCE(pay.paid, 0) AS paid_amount,
        COALESCE(pay.refunded, 0) AS refunded_amount,
        COALESCE(pay.failed, false) AS any_failed,
        pay.last_method, pay.last_paid_at,
        ci.actual_check_in, co.actual_check_out
    FROM reservation r
    JOIN guest g ON g.guest_id = r.guest_id
    JOIN "user" u ON u.user_id = g.user_id
    LEFT JOIN LATERAL (
        SELECT x.* FROM reservation_room x
        WHERE x.reservation_id = r.reservation_id
        ORDER BY x.reservation_room_id LIMIT 1
    ) rr ON true
    LEFT JOIN room rm ON rm.room_id = rr.room_id
    LEFT JOIN room_category rc ON rc.room_category_id = rm.room_category_id
    LEFT JOIN room_type rt ON rt.room_type_id = rc.room_type_id
    LEFT JOIN LATERAL (
        SELECT SUM(p.amount) FILTER (WHERE p.payment_status = 'Paid') AS paid,
               SUM(p.amount) FILTER (WHERE p.payment_status = 'Refunded') AS refunded,
               bool_or(p.payment_status = 'Failed') AS failed,
               (array_agg(p.payment_method ORDER BY p.payment_id DESC))[1] AS last_method,
               MAX(p.payment_date) FILTER (WHERE p.payment_status = 'Paid') AS last_paid_at
        FROM payment p WHERE p.reservation_id = r.reservation_id
    ) pay ON true
    LEFT JOIN check_in ci ON ci.reservation_id = r.reservation_id
    LEFT JOIN check_out co ON co.reservation_id = r.reservation_id
"""


def booking_payment_status(row):
    total = Decimal(row.get("total_amount") or 0)
    paid = Decimal(row.get("paid_amount") or 0)
    refunded = Decimal(row.get("refunded_amount") or 0)
    if paid == 0 and refunded > 0:
        return "REFUNDED"
    if total > 0 and paid >= total - Decimal("0.5"):
        return "PAID"
    if paid == 0 and row.get("any_failed"):
        return "FAILED"
    return "PENDING"


def booking_out(row, settings=None):
    check_in, check_out = row["check_in_date"], row["check_out_date"]
    nights = row.get("number_of_nights") or ((check_out - check_in).days if check_in and check_out else 0)
    total = Decimal(row.get("total_amount") or 0)
    rate = row.get("room_rate") or row.get("base_price")

    if rate is not None and settings is not None:
        parts = booking_totals(rate, nights, settings)
        room_total, taxes, service = parts["roomTotal"], parts["taxes"], parts["serviceCharge"]
        discount = max(Decimal(0), room_total + taxes + service - total) if total else Decimal(0)
    else:
        room_total, taxes, service, discount = total, Decimal(0), Decimal(0), Decimal(0)

    paid = Decimal(row.get("paid_amount") or 0)
    status = RESERVATION_STATUS.api(row["reservation_status"])
    return {
        "id": row["reservation_id"],
        "reference": f"RSV-{row['reservation_id']}",
        "guestId": row["guest_user_id"],
        "guestRecordId": row["guest_id"],
        "guestName": full_name(row.get("first_name"), row.get("last_name"), "Guest"),
        "guestEmail": row.get("email"),
        "guestPhone": row.get("phone_number"),
        "roomTypeId": row.get("room_category_id"),
        "roomTypeName": row.get("room_name") or "Not allocated",
        "roomCategory": row.get("type_name"),
        "roomId": row.get("room_id"),
        "roomNumber": row.get("room_number"),
        "floor": floor_number(row.get("floor")),
        "roomStatus": ROOM_STATUS.api(row.get("room_status")) if row.get("room_status") else None,
        "checkIn": check_in,
        "checkOut": check_out,
        "nights": nights,
        "guests": {"adults": row.get("number_of_guests") or 0, "children": 0},
        "status": status,
        "paymentStatus": booking_payment_status(row),
        "paymentMethod": PAYMENT_METHOD.api(row.get("last_method")) if row.get("last_method") else None,
        "channel": row.get("booking_channel"),
        "specialRequests": row.get("special_requests") or "",
        "createdAt": row.get("reservation_date"),
        "checkedInAt": row.get("actual_check_in"),
        "checkedOutAt": row.get("actual_check_out"),
        "roomRate": money(rate),
        "roomTotal": money(room_total),
        "taxes": money(taxes),
        "serviceCharge": money(service),
        "discount": money(discount),
        "total": money(total),
        "amountPaid": money(paid),
        "balanceDue": money(max(Decimal(0), total - paid)) if status != "CANCELLED" else 0.0,
        "currency": Config.CURRENCY,
    }


def split_guest_bookings(bookings):
    day = today().isoformat()
    current, upcoming, past = [], [], []
    for booking in bookings:
        check_in = booking["checkIn"].isoformat() if booking["checkIn"] else ""
        check_out = booking["checkOut"].isoformat() if booking["checkOut"] else ""
        status = booking["status"]
        if status in ("CANCELLED", "CHECKED_OUT"):
            past.append(booking)
        elif status == "CHECKED_IN" or check_in <= day < check_out:
            current.append(booking)
        elif check_in > day:
            upcoming.append(booking)
        else:  # the stay's dates have passed without a check-in
            past.append(booking)
    upcoming.sort(key=lambda b: b["checkIn"])
    past.sort(key=lambda b: b["checkIn"], reverse=True)
    return {"current": current, "upcoming": upcoming, "past": past}


# ---------------------------------------------------------------------------
# Service requests
# ---------------------------------------------------------------------------

REQUEST_SELECT = """
    SELECT
        sr.service_request_id, sr.function_id, sr.reservation_room_id, sr.request_date,
        sr.request_time, sr.description, sr.priority, sr.request_status, sr.assigned_staff_id,
        sr.completed_at, sr.raised_at,
        sf.function_name, st.service_type_id, st.service_name,
        r.reservation_id, g.user_id AS guest_user_id,
        gu.first_name AS guest_first, gu.last_name AS guest_last,
        rm.room_id, rm.room_number, rm.floor,
        su.user_id AS staff_user_id, su.first_name AS staff_first, su.last_name AS staff_last
    FROM service_request sr
    JOIN service_function sf ON sf.function_id = sr.function_id
    JOIN service_type st ON st.service_type_id = sf.service_type_id
    LEFT JOIN reservation_room rr ON rr.reservation_room_id = sr.reservation_room_id
    LEFT JOIN reservation r ON r.reservation_id = rr.reservation_id
    LEFT JOIN guest g ON g.guest_id = r.guest_id
    LEFT JOIN "user" gu ON gu.user_id = g.user_id
    LEFT JOIN room rm ON rm.room_id = COALESCE(sr.room_id, rr.room_id)
    LEFT JOIN staff s ON s.staff_id = sr.assigned_staff_id
    LEFT JOIN "user" su ON su.user_id = s.user_id
"""


def request_out(row):
    created = row.get("raised_at") or iso_datetime(row.get("request_date"), row.get("request_time"))
    status = REQUEST_STATUS.api(row.get("request_status"))
    return {
        "id": row["service_request_id"],
        "reference": f"SR-{row['service_request_id']}",
        "type": SERVICE_TYPE.api(row.get("service_name")),
        "serviceName": row.get("service_name"),
        "title": row.get("function_name"),
        "details": row.get("description") or "",
        "description": row.get("description") or "",
        "priority": PRIORITY.api(row.get("priority")),
        "status": status,
        "guestId": row.get("guest_user_id"),
        "guestName": full_name(row.get("guest_first"), row.get("guest_last"), "Hotel staff"),
        "roomId": row.get("room_id"),
        "roomNumber": row.get("room_number"),
        "floor": floor_number(row.get("floor")),
        "bookingId": row.get("reservation_id"),
        "assignedToId": row.get("staff_user_id"),
        "assignedToName": full_name(row.get("staff_first"), row.get("staff_last")) or None,
        "assignedStaffId": row.get("assigned_staff_id"),
        "requestDate": row.get("request_date"),
        "requestTime": row.get("request_time"),
        "createdAt": created,
        "updatedAt": row.get("completed_at") or created,
        "completedAt": row.get("completed_at"),
    }


# ---------------------------------------------------------------------------
# Housekeeping tasks
# ---------------------------------------------------------------------------

TASK_SELECT = """
    SELECT
        ht.housekeeping_task_id, ht.service_request_id, ht.task_type, ht.task_date,
        ht.start_time, ht.completion_time, ht.task_status, ht.remarks,
        sr.priority, sr.assigned_staff_id, sr.raised_at,
        rm.room_id, rm.room_number, rm.floor, rm.status AS room_status,
        rc.room_name,
        su.user_id AS staff_user_id, su.first_name AS staff_first, su.last_name AS staff_last
    FROM housekeeping_task ht
    JOIN service_request sr ON sr.service_request_id = ht.service_request_id
    LEFT JOIN reservation_room rr ON rr.reservation_room_id = sr.reservation_room_id
    LEFT JOIN room rm ON rm.room_id = COALESCE(sr.room_id, rr.room_id)
    LEFT JOIN room_category rc ON rc.room_category_id = rm.room_category_id
    LEFT JOIN staff s ON s.staff_id = sr.assigned_staff_id
    LEFT JOIN "user" su ON su.user_id = s.user_id
"""


def task_out(row):
    key = task_type_key(row.get("task_type"))
    day = row.get("task_date")
    return {
        "id": row["housekeeping_task_id"],
        "taskId": row["housekeeping_task_id"],
        "requestId": row["service_request_id"],
        "roomId": row.get("room_id"),
        "roomNumber": row.get("room_number"),
        "roomTypeName": row.get("room_name") or "Room",
        "roomStatus": ROOM_STATUS.api(row.get("room_status")) if row.get("room_status") else None,
        "floor": floor_number(row.get("floor")),
        "taskType": key,
        "taskLabel": row.get("task_type") or TASK_TYPE_LABELS[key],
        "status": REQUEST_STATUS.api(row.get("task_status")),
        "priority": PRIORITY.api(row.get("priority")),
        "note": row.get("remarks") or "",
        "remarks": row.get("remarks") or "",
        "assignedToId": row.get("staff_user_id"),
        "assignedToName": full_name(row.get("staff_first"), row.get("staff_last")) or None,
        "taskDate": day,
        "createdAt": row.get("raised_at") or iso_datetime(day, None),
        "startedAt": iso_datetime(day, row.get("start_time")) if row.get("start_time") else None,
        "completedAt": iso_datetime(day, row.get("completion_time")) if row.get("completion_time") else None,
    }


# ---------------------------------------------------------------------------
# Payments / invoices
# ---------------------------------------------------------------------------


def invoice_out(payment, booking):
    """payment: payment row; booking: booking_out() of its reservation."""
    total = booking["total"]
    lines = [{"id": f"{payment['payment_id']}-room",
              "label": f"{booking['roomTypeName']} · {booking['nights']} night(s)",
              "amount": booking["roomTotal"]}]
    if booking["taxes"]:
        lines.append({"id": f"{payment['payment_id']}-tax", "label": "Taxes", "amount": booking["taxes"]})
    if booking["serviceCharge"]:
        lines.append({"id": f"{payment['payment_id']}-svc", "label": "Service charge",
                      "amount": booking["serviceCharge"]})
    if booking["discount"]:
        lines.append({"id": f"{payment['payment_id']}-disc", "label": "Discount",
                      "amount": -booking["discount"]})
    return {
        "id": payment["payment_id"],
        "bookingId": booking["id"],
        "reference": f"INV-{payment['payment_id']}",
        "bookingReference": booking["reference"],
        "guestId": booking["guestId"],
        "guestName": booking["guestName"],
        "status": PAYMENT_STATUS.api(payment.get("payment_status")),
        "method": PAYMENT_METHOD.api(payment.get("payment_method")) if payment.get("payment_method") else None,
        "methodLabel": payment.get("payment_method"),
        "issuedAt": payment.get("payment_date"),
        "transactionReference": payment.get("transaction_reference"),
        "amount": money(payment.get("amount")),
        "lines": lines,
        "total": total,
        "amountPaid": booking["amountPaid"],
        "balanceDue": booking["balanceDue"],
        "currency": Config.CURRENCY,
    }


# ---------------------------------------------------------------------------
# Users and notifications
# ---------------------------------------------------------------------------

USER_SELECT = """
    SELECT u.user_id, u.username, u.email, u.phone_number, u.first_name, u.last_name,
           u.status, u.last_sign_in, u.created_at, r.role_id, r.role_name,
           s.staff_id, s.position, s.department, s.employment_date,
           g.guest_id, g.nationality, g.date_of_birth, g.gender, g.address
    FROM "user" u
    JOIN role r ON r.role_id = u.role_id
    LEFT JOIN staff s ON s.user_id = u.user_id
    LEFT JOIN guest g ON g.user_id = u.user_id
"""


def user_out(row):
    return {
        "id": row["user_id"],
        "username": row["username"],
        "firstName": row.get("first_name") or "",
        "lastName": row.get("last_name") or "",
        "name": full_name(row.get("first_name"), row.get("last_name"), row["username"]),
        "email": row["email"],
        "phone": row.get("phone_number") or "",
        "role": ROLE.api(row["role_name"]),
        "roleName": row["role_name"],
        "status": USER_STATUS.api(row.get("status"), "ACTIVE"),
        "department": row.get("department") or "",
        "position": row.get("position") or "",
        "nationality": row.get("nationality") or "",
        "address": row.get("address") or "",
        "createdAt": row.get("created_at"),
        "lastLoginAt": row.get("last_sign_in"),
        "lastSignIn": row.get("last_sign_in"),
    }


def notification_out(row):
    return {
        "id": row["notification_id"],
        "userId": row["user_id"],
        "type": NOTIFICATION_TYPE.api(row.get("notification_type")),
        "title": row["title"],
        "message": row["message"],
        "read": row.get("status") in ("Read", "Archived"),
        "status": row.get("status") or "Unread",
        "createdAt": row.get("sent_at"),
        "link": None,
    }
