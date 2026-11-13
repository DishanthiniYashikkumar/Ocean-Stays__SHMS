"""Guest service requests and the staff work queues."""

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, arg_int, json_body, optional_text, require_text, to_int
from mappings import (
    ADMIN,
    GUEST,
    HOUSEKEEPING,
    PRIORITY,
    RECEPTIONIST,
    REQUEST_STATUS,
    SERVICE_STAFF,
    SERVICE_TYPE,
    STAFF_ROLES,
)
from serializers import REQUEST_SELECT, request_out
from services import audit, notify, notify_role, now_naive, require_staff_id, staff_id_for_user

bp = Blueprint("service_requests", __name__)

# Same table as NEXT_STATUSES in src/services/serviceRequestService.js
NEXT_STATUSES = {
    "Pending": {"Assigned", "In Progress", "Cancelled"},
    "Assigned": {"In Progress", "Cancelled"},
    "In Progress": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
}

# Which staff team picks up each request type.
TEAM_FOR_TYPE = {
    "Housekeeping": "Housekeeping",
    "Maintenance": "Service Staff",
    "Room Service": "Service Staff",
    "Dining": "Service Staff",
    "Transport": "Service Staff",
}


def load_requests(where="", params=None, order="sr.raised_at DESC NULLS LAST, sr.service_request_id DESC",
                  limit=None, offset=None, cur=None):
    sql = f"{REQUEST_SELECT} {('WHERE ' + where) if where else ''} ORDER BY {order}"
    params = list(params or [])
    if limit is not None:
        sql += " LIMIT %s OFFSET %s"
        params += [limit, offset or 0]
    rows = db.fetch_all(cur, sql, params) if cur is not None else db.query(sql, params)
    return [request_out(row) for row in rows]


def load_request(request_id, cur=None):
    items = load_requests("sr.service_request_id = %s", [request_id], cur=cur)
    if not items:
        raise ApiError(404, "We couldn't find that request.")
    return items[0]


def _filters(actor):
    conditions, params = [], []
    if actor.role == GUEST:
        conditions.append("g.user_id = %s")
        params.append(actor.user_id)
    else:
        guest_user = to_int(request.args.get("guestId"), "guestId")
        if guest_user:
            conditions.append("g.user_id = %s")
            params.append(guest_user)
    req_type = request.args.get("type")
    if req_type:
        conditions.append("st.service_name = %s")
        params.append(SERVICE_TYPE.db(req_type))
    status = request.args.get("status")
    if status:
        conditions.append("sr.request_status = %s")
        params.append(REQUEST_STATUS.db(status))
    assigned = to_int(request.args.get("assignedToId"), "assignedToId")
    if assigned:
        conditions.append("su.user_id = %s")
        params.append(assigned)
    booking_id = to_int(request.args.get("bookingId"), "bookingId")
    if booking_id:
        conditions.append("r.reservation_id = %s")
        params.append(booking_id)
    return " AND ".join(conditions), params


@bp.get("/service-requests")
@require_roles()
def list_requests():
    where, params = _filters(current_actor())
    page_size = arg_int("pageSize", 100, 1, 500)
    page = arg_int("page", 1, 1)
    rows = db.query(
        f"""SELECT x.*, COUNT(*) OVER () AS total_count
            FROM ({REQUEST_SELECT} {('WHERE ' + where) if where else ''}) x
            ORDER BY x.raised_at DESC NULLS LAST, x.service_request_id DESC LIMIT %s OFFSET %s""",
        params + [page_size, (page - 1) * page_size],
    )
    total = rows[0]["total_count"] if rows else (
        db.scalar(f"SELECT COUNT(*) FROM ({REQUEST_SELECT} {('WHERE ' + where) if where else ''}) x", params)
        if page > 1 else 0)
    return {"items": [request_out(row) for row in rows], "total": total, "page": page, "pageSize": page_size}


@bp.get("/service-requests/summary")
@require_roles()
def summary():
    where, params = _filters(current_actor())
    row = db.query_one(
        f"""SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE x.request_status = 'Pending') AS pending,
                   COUNT(*) FILTER (WHERE x.request_status = 'Assigned') AS assigned,
                   COUNT(*) FILTER (WHERE x.request_status = 'In Progress') AS in_progress,
                   COUNT(*) FILTER (WHERE x.request_status = 'Completed') AS completed,
                   COUNT(*) FILTER (WHERE x.request_status = 'Cancelled') AS cancelled
            FROM ({REQUEST_SELECT} {('WHERE ' + where) if where else ''}) x""",
        params,
    )
    return {"total": row["total"], "PENDING": row["pending"], "ASSIGNED": row["assigned"],
            "IN_PROGRESS": row["in_progress"], "COMPLETED": row["completed"], "CANCELLED": row["cancelled"]}


@bp.get("/service-requests/<int:request_id>")
@require_roles()
def get_request(request_id):
    item = load_request(request_id)
    actor = current_actor()
    if actor.role == GUEST and item["guestId"] != actor.user_id:
        raise ApiError(404, "We couldn't find that request.")
    return item


def _active_stay(cur, user_id, booking_id=None):
    """The guest's reservation_room for a stay they're on right now."""
    params = [user_id]
    extra = ""
    if booking_id:
        extra = " AND r.reservation_id = %s"
        params.append(booking_id)
    return db.fetch_one(
        cur,
        f"""SELECT rr.reservation_room_id, rr.room_id, r.reservation_id
            FROM reservation r
            JOIN guest g ON g.guest_id = r.guest_id
            JOIN reservation_room rr ON rr.reservation_id = r.reservation_id
            WHERE g.user_id = %s AND r.reservation_status = 'Checked in' {extra}
            ORDER BY r.check_in_date DESC, rr.reservation_room_id LIMIT 1""",
        params,
    )


def create_request(cur, *, service_name, title, details, priority, reservation_room_id, room_id,
                   status="Pending", staff_id=None):
    """Inserts a service_request (plus its housekeeping/maintenance detail row)."""
    function = db.fetch_one(
        cur,
        """SELECT sf.function_id, sf.function_name FROM service_function sf
           JOIN service_type st ON st.service_type_id = sf.service_type_id
           WHERE st.service_name = %s
           ORDER BY (LOWER(sf.function_name) = LOWER(%s)) DESC,
                    (sf.availability_status = 'Available') DESC, sf.function_id
           LIMIT 1""",
        (service_name, title or ""),
    )
    if not function:
        raise ApiError(400, f"No {service_name} services are set up.")
    description = details or ""
    if title and title.lower() != function["function_name"].lower():
        description = f"{title} — {details}" if details else title
    now = now_naive()
    row = db.fetch_one(
        cur,
        """INSERT INTO service_request (function_id, reservation_room_id, room_id, request_date, request_time,
                                        description, priority, request_status, assigned_staff_id, raised_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING service_request_id""",
        (function["function_id"], reservation_room_id, room_id, now.date(), now.time(), description,
         priority, status, staff_id, now),
    )
    request_id = row["service_request_id"]
    if service_name == "Housekeeping":
        cur.execute(
            """INSERT INTO housekeeping_task (service_request_id, task_type, task_date, task_status, remarks)
               VALUES (%s, %s, %s, %s, %s)""",
            (request_id, title or function["function_name"], now.date(),
             "Assigned" if staff_id else "Pending", details or None),
        )
    elif service_name == "Maintenance":
        cur.execute(
            """INSERT INTO maintenance_request (service_request_id, issue_type, description, reported_date,
                                                request_status)
               VALUES (%s, %s, %s, %s, %s)""",
            (request_id, (title or function["function_name"])[:100], details or None, now.date(),
             "Assigned" if staff_id else "Pending"),
        )
    return request_id


@bp.post("/service-requests")
@require_roles()
def raise_request():
    actor = current_actor()
    data = json_body()
    service_name = SERVICE_TYPE.db(data.get("type"))
    title = optional_text(data, "title", 150)
    details = optional_text(data, "details", 2000) or optional_text(data, "description", 2000)
    if not title and not details:
        require_text(data, "details", "Details")
    priority = PRIORITY.db(data.get("priority") or "NORMAL")
    booking_id = to_int(data.get("bookingId"), "Booking")

    with db.transaction() as cur:
        if actor.role == GUEST:
            stay = _active_stay(cur, actor.user_id, booking_id) or _active_stay(cur, actor.user_id)
            if not stay:
                raise ApiError(400, "You need an active stay to raise a request. "
                                    "Requests open once you've checked in.")
            reservation_room_id, room_id = stay["reservation_room_id"], stay["room_id"]
        elif actor.role in STAFF_ROLES:
            room_id = to_int(data.get("roomId"), "Room")
            room_number = optional_text(data, "roomNumber", 20)
            if not room_id and room_number:
                room = db.fetch_one(cur, "SELECT room_id FROM room WHERE room_number = %s", (room_number,))
                room_id = room["room_id"] if room else None
            if not room_id:
                raise ApiError(400, "Choose the room this request is for.")
            stay = db.fetch_one(
                cur,
                """SELECT rr.reservation_room_id FROM reservation_room rr
                   JOIN reservation r ON r.reservation_id = rr.reservation_id
                   WHERE rr.room_id = %s AND r.reservation_status = 'Checked in' LIMIT 1""",
                (room_id,),
            )
            reservation_room_id = stay["reservation_room_id"] if stay else None
        else:
            raise ApiError(403, "You don't have permission to raise requests.")

        request_id = create_request(cur, service_name=service_name, title=title, details=details,
                                    priority=priority, reservation_room_id=reservation_room_id,
                                    room_id=room_id)
        item = load_request(request_id, cur)

    audit(actor.user_id, "Create", "Requests", f"{item['reference']} {item['title']}")
    notify_role(TEAM_FOR_TYPE[service_name], "Service", f"New {service_name.lower()} request",
                f"{item['reference']} · Room {item['roomNumber'] or '—'}: {item['title']}")
    if actor.role == GUEST:
        notify(actor.user_id, "Service", "Request received",
               f"{item['reference']} ({item['title']}) is with our team.")
    return item, 201


def _sync_details(cur, request_id, status, actor_staff_id=None):
    """Keeps the housekeeping/maintenance detail rows in step with the request."""
    now = now_naive()
    if status == "In Progress":
        cur.execute("""UPDATE housekeeping_task SET task_status = 'In Progress',
                       start_time = COALESCE(start_time, %s) WHERE service_request_id = %s""",
                    (now.time(), request_id))
    elif status == "Completed":
        cur.execute("""UPDATE housekeeping_task SET task_status = 'Completed',
                       completion_time = %s, start_time = COALESCE(start_time, %s)
                       WHERE service_request_id = %s""", (now.time(), now.time(), request_id))
        cur.execute("""UPDATE maintenance_request SET request_status = 'Completed', resolved_date = %s
                       WHERE service_request_id = %s""", (now.date(), request_id))
        # A repaired room goes back through inspection before it's sold again.
        cur.execute("""UPDATE room SET status = 'Clean'
                       WHERE status = 'Maintaining' AND room_id = (
                           SELECT sr.room_id FROM service_request sr
                           JOIN service_function sf ON sf.function_id = sr.function_id
                           JOIN service_type st ON st.service_type_id = sf.service_type_id
                           WHERE sr.service_request_id = %s AND st.service_name = 'Maintenance')""",
                    (request_id,))
    if status in ("Assigned", "Cancelled"):
        cur.execute("UPDATE housekeeping_task SET task_status = %s WHERE service_request_id = %s "
                    "AND task_status NOT IN ('Completed', 'Cancelled')", (status, request_id))
    if status in ("Assigned", "In Progress", "Cancelled"):
        cur.execute("UPDATE maintenance_request SET request_status = %s WHERE service_request_id = %s "
                    "AND request_status NOT IN ('Completed', 'Cancelled')", (status, request_id))


def change_status(cur, request_id, new_status, actor):
    current = db.fetch_one(cur, "SELECT * FROM service_request WHERE service_request_id = %s FOR UPDATE",
                           (request_id,))
    if not current:
        raise ApiError(404, "We couldn't find that request.")
    old = current["request_status"] or "Pending"
    if new_status == old:
        return old
    if new_status not in NEXT_STATUSES.get(old, set()):
        raise ApiError(409, f"A {old.lower()} request can't move to {new_status.lower()}.")

    assign_to = current["assigned_staff_id"]
    if new_status == "In Progress" and assign_to is None and actor.role in STAFF_ROLES:
        assign_to = staff_id_for_user(actor.user_id, cur)
    completed_at = now_naive() if new_status == "Completed" else None
    cur.execute(
        """UPDATE service_request SET request_status = %s, assigned_staff_id = %s,
                  completed_at = COALESCE(%s, completed_at)
           WHERE service_request_id = %s""",
        (new_status, assign_to, completed_at, request_id),
    )
    _sync_details(cur, request_id, new_status)
    return old


@bp.patch("/service-requests/<int:request_id>/status")
@require_roles()
def update_status(request_id):
    actor = current_actor()
    new_status = REQUEST_STATUS.db(json_body().get("status"))
    with db.transaction() as cur:
        item = load_request(request_id, cur)
        if actor.role == GUEST:
            if item["guestId"] != actor.user_id:
                raise ApiError(404, "We couldn't find that request.")
            if new_status != "Cancelled":
                raise ApiError(403, "Guests can only cancel their requests.")
        elif actor.role not in STAFF_ROLES:
            raise ApiError(403, "You don't have permission to update requests.")
        old = change_status(cur, request_id, new_status, actor)
        item = load_request(request_id, cur)

    audit(actor.user_id, "Status", "Requests", f"{item['reference']}: {old} → {new_status}")
    if actor.role != GUEST and item["guestId"]:
        labels = {"Assigned": "has been assigned", "In Progress": "is being handled now",
                  "Completed": "is complete", "Cancelled": "was cancelled"}
        notify(item["guestId"], "Service", f"Request {labels.get(new_status, 'updated')}",
               f"{item['reference']} ({item['title']}) {labels.get(new_status, 'was updated')}.")
    return item


@bp.post("/service-requests/<int:request_id>/assign")
@require_roles(RECEPTIONIST, HOUSEKEEPING, SERVICE_STAFF, ADMIN)
def assign(request_id):
    actor = current_actor()
    data = json_body()
    staff_user = to_int(data.get("staffId"), "Staff member") or actor.user_id
    with db.transaction() as cur:
        staff_id = require_staff_id(staff_user, cur)
        current = db.fetch_one(cur, "SELECT * FROM service_request WHERE service_request_id = %s FOR UPDATE",
                               (request_id,))
        if not current:
            raise ApiError(404, "We couldn't find that request.")
        if current["request_status"] in ("Completed", "Cancelled"):
            raise ApiError(409, f"A {current['request_status'].lower()} request can't be reassigned.")
        status = "Assigned" if current["request_status"] in (None, "Pending") else current["request_status"]
        cur.execute("UPDATE service_request SET assigned_staff_id = %s, request_status = %s "
                    "WHERE service_request_id = %s", (staff_id, status, request_id))
        _sync_details(cur, request_id, status)
        item = load_request(request_id, cur)

    audit(actor.user_id, "Update", "Requests", f"{item['reference']} assigned to {item['assignedToName']}")
    if staff_user != actor.user_id:
        notify(staff_user, "Service", "New request assigned to you",
               f"{item['reference']} · Room {item['roomNumber'] or '—'}: {item['title']}")
    if item["guestId"]:
        notify(item["guestId"], "Service", "Request has been assigned",
               f"{item['assignedToName']} is looking after {item['reference']}.")
    return item
