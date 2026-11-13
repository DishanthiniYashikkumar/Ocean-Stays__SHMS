"""Administrator: dashboard figures, audit log, settings, roles and permissions."""

from datetime import datetime

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from config import Config
from errors import ApiError, arg_int, json_body, optional_text, require_text, to_date, to_int, to_number
from mappings import ADMIN, AUDIT_ACTION, AUDIT_RESULT, PERMISSION_IDS, PERMISSION_NAMES, ROLE
from services import audit, clear_settings_cache, today

bp = Blueprint("admin", __name__)


@bp.get("/admin/stats")
@require_roles(ADMIN)
def stats():
    day = today()
    row = db.query_one(
        """
        SELECT
            (SELECT COUNT(*) FROM room) AS total_rooms,
            (SELECT COUNT(*) FROM room WHERE status IN ('Available', 'Inspected')) AS available_rooms,
            (SELECT COUNT(DISTINCT rm.room_id) FROM room rm
              WHERE rm.status = 'Occupied'
                 OR EXISTS (SELECT 1 FROM reservation_room rr
                            JOIN reservation r ON r.reservation_id = rr.reservation_id
                            WHERE rr.room_id = rm.room_id AND r.reservation_status = 'Checked in')
            ) AS occupied_rooms,
            (SELECT COUNT(*) FROM reservation WHERE check_in_date = %(day)s
                AND reservation_status <> 'Cancelled') AS check_ins_today,
            (SELECT COUNT(*) FROM reservation WHERE check_out_date = %(day)s
                AND reservation_status <> 'Cancelled') AS check_outs_today,
            (SELECT COUNT(*) FROM reservation
              WHERE reservation_status IN ('Confirmed', 'Checked in')) AS active_bookings,
            (SELECT COUNT(*) FROM service_request
              WHERE request_status NOT IN ('Completed', 'Cancelled')) AS pending_requests,
            (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE payment_status = 'Paid') AS revenue,
            (SELECT COUNT(*) FROM room WHERE status = 'Maintaining') AS maintenance_rooms,
            (SELECT COUNT(*) FROM room WHERE status IN ('Dirty', 'Cleaning', 'Clean')) AS cleaning_rooms,
            (SELECT COUNT(*) FROM reservation) AS total_bookings
        """,
        {"day": day},
    )
    total = row["total_rooms"]
    return {
        "totalRooms": total,
        "availableRooms": row["available_rooms"],
        "occupiedRooms": row["occupied_rooms"],
        "occupancyRate": round(row["occupied_rooms"] * 100 / total, 2) if total else 0,
        "checkInsToday": row["check_ins_today"],
        "checkOutsToday": row["check_outs_today"],
        "activeBookings": row["active_bookings"],
        "pendingRequests": row["pending_requests"],
        "revenue": row["revenue"],
        "currency": Config.CURRENCY,
        "maintenanceRooms": row["maintenance_rooms"],
        "cleaningRooms": row["cleaning_rooms"],
        "totalBookings": row["total_bookings"],
    }


@bp.get("/admin/trends")
@require_roles(ADMIN)
def trends():
    day = today()
    with db.connection() as conn, conn.cursor() as cur:
        occupancy = db.fetch_all(
            cur,
            """
            WITH months AS (
                SELECT generate_series(date_trunc('month', %(day)s::date) - INTERVAL '5 months',
                                       date_trunc('month', %(day)s::date), INTERVAL '1 month')::date AS month_start
            ),
            days AS (
                SELECT m.month_start, d::date AS occupancy_day
                FROM months m
                CROSS JOIN LATERAL generate_series(
                    m.month_start::timestamp,
                    LEAST((m.month_start + INTERVAL '1 month' - INTERVAL '1 day')::date, %(day)s::date)::timestamp,
                    INTERVAL '1 day') AS d
            ),
            daily AS (
                SELECT d.month_start, d.occupancy_day, COUNT(DISTINCT rr.room_id) AS occupied
                FROM days d
                LEFT JOIN reservation r ON r.check_in_date <= d.occupancy_day
                     AND r.check_out_date > d.occupancy_day AND r.reservation_status <> 'Cancelled'
                LEFT JOIN reservation_room rr ON rr.reservation_id = r.reservation_id
                GROUP BY d.month_start, d.occupancy_day
            )
            SELECT to_char(month_start, 'Mon') AS month,
                   ROUND(COALESCE(SUM(occupied) * 100.0 / NULLIF((SELECT COUNT(*) FROM room) * COUNT(*), 0), 0), 2)
                       AS rate
            FROM daily GROUP BY month_start ORDER BY month_start
            """,
            {"day": day},
        )
        revenue = db.fetch_all(
            cur,
            """SELECT to_char(m.month_start, 'Mon') AS month, COALESCE(SUM(p.amount), 0) AS amount
               FROM generate_series(date_trunc('month', %(day)s::date) - INTERVAL '5 months',
                                    date_trunc('month', %(day)s::date), INTERVAL '1 month') AS m(month_start)
               LEFT JOIN payment p ON date_trunc('month', p.payment_date) = m.month_start
                    AND p.payment_status = 'Paid'
               GROUP BY m.month_start ORDER BY m.month_start""",
            {"day": day},
        )
        # room_type -> room_category -> room (the old query joined type ids to category ids)
        room_types = db.fetch_all(
            cur,
            """SELECT rt.type_name AS name,
                      COUNT(DISTINCT r.reservation_id) AS bookings,
                      COALESCE(SUM(rr.room_rate * rr.number_of_nights)
                               FILTER (WHERE r.reservation_id IS NOT NULL), 0) AS revenue
               FROM room_type rt
               LEFT JOIN room_category rc ON rc.room_type_id = rt.room_type_id
               LEFT JOIN room rm ON rm.room_category_id = rc.room_category_id
               LEFT JOIN reservation_room rr ON rr.room_id = rm.room_id
               LEFT JOIN reservation r ON r.reservation_id = rr.reservation_id
                    AND r.reservation_status <> 'Cancelled'
               GROUP BY rt.room_type_id, rt.type_name
               ORDER BY revenue DESC""",
        )
        channels = db.fetch_all(
            cur,
            """SELECT booking_channel AS channel, COUNT(*) AS bookings FROM reservation
               WHERE reservation_status <> 'Cancelled'
               GROUP BY booking_channel ORDER BY COUNT(*) DESC""",
        )
    return {"occupancy": occupancy, "revenue": revenue, "bookingsByChannel": channels,
            "roomTypePerformance": room_types}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


@bp.get("/admin/audit-logs")
@require_roles(ADMIN)
def audit_logs():
    page_size = arg_int("pageSize", 6, 1, 500)
    page = arg_int("page", 1, 1)
    conditions, params = [], []

    search = (request.args.get("search") or "").strip()
    if search:
        conditions.append("""(u.username ILIKE %s OR u.first_name ILIKE %s OR u.last_name ILIKE %s
                              OR al.entity_reference ILIKE %s OR al.action_type ILIKE %s
                              OR al.module_name ILIKE %s)""")
        params += [f"%{search}%"] * 6
    if request.args.get("action"):
        conditions.append("al.action_type = %s")
        params.append(AUDIT_ACTION.db(request.args["action"]))
    if request.args.get("module"):
        conditions.append("al.module_name = %s")
        params.append(request.args["module"])
    if request.args.get("result"):
        conditions.append("al.result_status = %s")
        params.append(AUDIT_RESULT.db(request.args["result"]))
    actor_id = to_int(request.args.get("actorId"), "actorId")
    if actor_id:
        conditions.append("al.user_id = %s")
        params.append(actor_id)
    date_from = to_date(request.args.get("from"), "from")
    if date_from:
        conditions.append("al.created_at::date >= %s")
        params.append(date_from)
    date_to = to_date(request.args.get("to"), "to")
    if date_to:
        conditions.append("al.created_at::date <= %s")
        params.append(date_to)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total = db.scalar(f"""SELECT COUNT(*) FROM audit_log al LEFT JOIN "user" u ON u.user_id = al.user_id
                          {where}""", params)
    rows = db.query(
        f"""SELECT al.audit_log_id, al.created_at, al.user_id, al.action_type, al.module_name,
                   al.entity_reference, al.result_status, u.username, u.first_name, u.last_name, ro.role_name
            FROM audit_log al
            LEFT JOIN "user" u ON u.user_id = al.user_id
            LEFT JOIN role ro ON ro.role_id = u.role_id
            {where}
            ORDER BY al.created_at DESC NULLS LAST, al.audit_log_id DESC
            LIMIT %s OFFSET %s""",
        params + [page_size, (page - 1) * page_size],
    )
    items = []
    for row in rows:
        name = f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or row["username"] or "Not signed in"
        action = AUDIT_ACTION.api(row["action_type"], row["action_type"].upper())
        items.append({
            "id": row["audit_log_id"],
            "timestamp": row["created_at"],
            "actorId": row["user_id"],
            "actorName": name,
            "actorRole": ROLE.api(row["role_name"]) if row["role_name"] else None,
            "actorRoleName": row["role_name"],
            "action": action,
            "module": row["module_name"],
            "entity": row["entity_reference"] or "",
            "result": AUDIT_RESULT.api(row["result_status"], "SUCCESS"),
            "summary": f"{row['action_type']} · {row['entity_reference'] or row['module_name']}",
            "ip": None,
        })
    return {"items": items, "total": total, "page": page, "pageSize": page_size}


@bp.get("/admin/audit-logs/actors")
@require_roles(ADMIN)
def audit_actors():
    rows = db.query(
        """SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name, ro.role_name
           FROM audit_log al JOIN "user" u ON u.user_id = al.user_id JOIN role ro ON ro.role_id = u.role_id
           ORDER BY u.first_name, u.last_name"""
    )
    return [
        {"id": r["user_id"],
         "name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or r["username"],
         "role": ROLE.api(r["role_name"])}
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

NOTIFICATION_FIELDS = {
    "bookingConfirmation": "booking_confirmation",
    "checkInReminder": "check_in_reminder",
    "checkOutReminder": "check_out_reminder",
    "paymentReceipts": "payment_receipts",
    "serviceUpdates": "service_updates",
    "marketingEmails": "marketing_emails",
}


def _settings():
    hotel = db.query_one("SELECT * FROM hotel_information ORDER BY hotel_id LIMIT 1") or {}
    ops = db.query_one("SELECT * FROM operational_settings ORDER BY setting_id LIMIT 1") or {}
    notes = db.query_one("SELECT * FROM notification_setting WHERE setting_id = 1") or {}
    return {
        "hotel": {
            "name": hotel.get("hotel_name") or "",
            "email": hotel.get("reservations_email") or "",
            "phone": hotel.get("phone") or "",
            "addressLine1": hotel.get("address_line1") or "",
            "addressLine2": hotel.get("address_line2") or "",
            "country": hotel.get("country") or "",
            "tagline": hotel.get("tagline") or "",
        },
        "operations": {
            "checkInTime": ops.get("check_in_from"),
            "checkOutTime": ops.get("check_out_by"),
            "freeCancellationHours": ops.get("free_cancellation_hours"),
            "modificationCutoffHours": ops.get("modification_cutoff_hours"),
            "taxRatePercent": ops.get("tax_rate"),
            "serviceChargePercent": ops.get("service_charge"),
        },
        "notifications": {key: bool(notes.get(column, True)) for key, column in NOTIFICATION_FIELDS.items()},
    }


def _time(value, label):
    try:
        return datetime.strptime(str(value).strip()[:5], "%H:%M").time()
    except ValueError as error:
        raise ApiError(400, f"{label} must be a time like 14:00.") from error


def _bounded(value, label, low, high):
    number = to_number(value, label, required=True)
    if not low <= number <= high:
        raise ApiError(400, f"{label} must be between {low} and {high}.")
    return number


@bp.get("/admin/settings")
@require_roles(ADMIN)
def get_settings():
    return _settings()


@bp.patch("/admin/settings/<section>")
@require_roles(ADMIN)
def update_settings(section):
    data = json_body()
    if section == "hotel":
        values = (
            require_text(data, "name", "Hotel name", 150),
            require_text(data, "email", "Reservations email", 150),
            require_text(data, "phone", "Phone", 20),
            require_text(data, "addressLine1", "Address", 255),
            optional_text(data, "addressLine2", 255),
            require_text(data, "country", "Country", 100),
            optional_text(data, "tagline", 255),
        )
        with db.transaction() as cur:
            cur.execute("SELECT hotel_id FROM hotel_information ORDER BY hotel_id LIMIT 1")
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """UPDATE hotel_information SET hotel_name = %s, reservations_email = %s, phone = %s,
                              address_line1 = %s, address_line2 = %s, country = %s, tagline = %s
                       WHERE hotel_id = %s""", (*values, existing["hotel_id"]))
            else:
                cur.execute(
                    """INSERT INTO hotel_information (hotel_name, reservations_email, phone, address_line1,
                                                      address_line2, country, tagline)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""", values)
    elif section == "operations":
        values = (
            _time(data.get("checkInTime"), "Check-in time"),
            _time(data.get("checkOutTime"), "Check-out time"),
            int(_bounded(data.get("freeCancellationHours"), "Free cancellation hours", 0, 720)),
            int(_bounded(data.get("modificationCutoffHours"), "Modification cut-off hours", 0, 720)),
            _bounded(data.get("taxRatePercent"), "Tax rate", 0, 100),
            _bounded(data.get("serviceChargePercent"), "Service charge", 0, 100),
        )
        with db.transaction() as cur:
            cur.execute("SELECT setting_id FROM operational_settings ORDER BY setting_id LIMIT 1")
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """UPDATE operational_settings SET check_in_from = %s, check_out_by = %s,
                              free_cancellation_hours = %s, modification_cutoff_hours = %s,
                              tax_rate = %s, service_charge = %s WHERE setting_id = %s""",
                    (*values, existing["setting_id"]))
            else:
                cur.execute(
                    """INSERT INTO operational_settings (check_in_from, check_out_by, free_cancellation_hours,
                                                         modification_cutoff_hours, tax_rate, service_charge)
                       VALUES (%s, %s, %s, %s, %s, %s)""", values)
    elif section == "notifications":
        values = {column: bool(data.get(key)) for key, column in NOTIFICATION_FIELDS.items() if key in data}
        if not values:
            raise ApiError(400, "Nothing to update.")
        assignments = ", ".join(f"{column} = %s" for column in values)
        db.execute(
            f"""INSERT INTO notification_setting (setting_id) VALUES (1) ON CONFLICT (setting_id) DO NOTHING;
                UPDATE notification_setting SET {assignments}, updated_at = CURRENT_TIMESTAMP
                WHERE setting_id = 1""",
            list(values.values()),
        )
    else:
        raise ApiError(404, "Unknown settings section.")

    clear_settings_cache()
    audit(current_actor().user_id, "Update", "Settings", f"{section.capitalize()} settings")
    return _settings()


# ---------------------------------------------------------------------------
# Roles and permissions
# ---------------------------------------------------------------------------

ROLE_DESCRIPTIONS = {
    "GUEST": "Books stays, raises requests and manages their own profile.",
    "RECEPTIONIST": "Runs the front desk: reservations, check-in/out and payments.",
    "HOUSEKEEPING": "Cleans and inspects rooms and reports maintenance issues.",
    "SERVICE_STAFF": "Handles room service, dining, transport and maintenance requests.",
    "ADMIN": "Full access to every module, settings and the audit log.",
}


def _role_row(key):
    if str(key).isdigit():
        row = db.query_one("SELECT * FROM role WHERE role_id = %s", (int(key),))
    else:
        row = db.query_one("SELECT * FROM role WHERE role_name = %s", (ROLE.db(key),))
    if not row:
        raise ApiError(404, "That role doesn't exist.")
    return row


def _role_out(row):
    permissions = db.query(
        """SELECT p.permission_name FROM role_permission rp JOIN permission p ON p.permission_id = rp.permission_id
           WHERE rp.role_id = %s ORDER BY p.permission_id""", (row["role_id"],))
    user_count = db.scalar('SELECT COUNT(*) FROM "user" WHERE role_id = %s', (row["role_id"],))
    key = ROLE.api(row["role_name"])
    return {
        "id": key,
        "roleId": row["role_id"],
        "label": row["role_name"],
        "description": row.get("description") or ROLE_DESCRIPTIONS.get(key, ""),
        "permissions": [PERMISSION_IDS[p["permission_name"]] for p in permissions
                        if p["permission_name"] in PERMISSION_IDS],
        "userCount": user_count,
        "isSystem": True,
    }


@bp.get("/roles")
@require_roles(ADMIN)
def list_roles():
    return [_role_out(row) for row in db.query("SELECT * FROM role ORDER BY role_id")]


@bp.get("/roles/<key>/permissions")
@require_roles(ADMIN)
def role_permissions(key):
    role = _role_out(_role_row(key))
    return {"roleId": role["id"], "permissions": role["permissions"]}


@bp.put("/roles/<key>/permissions")
@require_roles(ADMIN)
def set_role_permissions(key):
    row = _role_row(key)
    if row["role_name"] == "Administrator":
        raise ApiError(403, "The Administrator role always has every permission.")
    requested = json_body().get("permissions")
    if not isinstance(requested, list):
        raise ApiError(400, "Send the full list of permissions for the role.")
    unknown = [pid for pid in requested if pid not in PERMISSION_NAMES]
    if unknown:
        raise ApiError(400, f"Unknown permission(s): {', '.join(map(str, unknown))}.")

    names = [PERMISSION_NAMES[pid] for pid in dict.fromkeys(requested)]
    with db.transaction() as cur:
        cur.execute("DELETE FROM role_permission WHERE role_id = %s", (row["role_id"],))
        if names:
            cur.execute(
                """INSERT INTO role_permission (role_id, permission_id)
                   SELECT %s, permission_id FROM permission WHERE permission_name = ANY(%s)""",
                (row["role_id"], names),
            )
    audit(current_actor().user_id, "Permission", "Permissions", f"{row['role_name']}: {len(names)} permission(s)")
    return _role_out(row)


