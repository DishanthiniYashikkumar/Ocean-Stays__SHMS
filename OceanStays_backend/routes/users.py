"""Users, staff and guest records."""

import re

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, json_body, optional_text
from mappings import ADMIN, RECEPTIONIST, ROLE, STAFF_ROLES, USER_STATUS
from serializers import USER_SELECT, user_out
from services import audit, today

bp = Blueprint("users", __name__)

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
DEFAULT_DEPARTMENT = {
    "Receptionist": "Reception",
    "Housekeeping": "Housekeeping",
    "Service Staff": "Guest Services",
    "Administrator": "Administration",
}


@bp.get("/users")
@require_roles(RECEPTIONIST, ADMIN)
def list_users():
    """Plain array, snake_case — the shape src/services/userService.js maps."""
    actor = current_actor()
    conditions, params = [], []
    role = request.args.get("role")
    if actor.role == RECEPTIONIST:
        conditions.append("r.role_name = 'Guest'")  # reception only manages guests
    elif role:
        conditions.append("r.role_name = %s")
        params.append(ROLE.db(role))
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = db.query(f"{USER_SELECT} {where} ORDER BY u.user_id", params)
    return [
        {
            "user_id": r["user_id"],
            "username": r["username"],
            "email": r["email"],
            "phone_number": r["phone_number"],
            "role": ROLE.api(r["role_name"]),
            "role_name": r["role_name"],
            "department": r["department"],
            "position": r["position"],
            "status": r["status"] or "Active",
            "last_sign_in": r["last_sign_in"],
            "created_at": r["created_at"],
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "nationality": r["nationality"],
        }
        for r in rows
    ]


def _load_user(user_id, cur=None):
    sql = USER_SELECT + " WHERE u.user_id = %s"
    row = db.fetch_one(cur, sql, (user_id,)) if cur is not None else db.query_one(sql, (user_id,))
    if not row:
        raise ApiError(404, "We couldn't find that user.")
    return row


def _ensure_can_view(actor, row):
    if actor.user_id == row["user_id"] or actor.role == ADMIN:
        return
    if actor.role == RECEPTIONIST and row["role_name"] == "Guest":
        return
    raise ApiError(403, "You can only view your own profile.")


@bp.get("/users/<int:user_id>")
@require_roles()
def get_user(user_id):
    row = _load_user(user_id)
    _ensure_can_view(current_actor(), row)
    return user_out(row)


@bp.patch("/users/<int:user_id>")
@require_roles()
def update_user(user_id):
    actor = current_actor()
    data = json_body()
    is_self = actor.user_id == user_id
    if not is_self and actor.role != ADMIN:
        raise ApiError(403, "You can only edit your own profile.")

    changes = {}
    for key, column, limit in (("firstName", "first_name", 50), ("lastName", "last_name", 50),
                               ("phone", "phone_number", 20)):
        if key in data:
            changes[column] = optional_text(data, key, limit)
    if "email" in data:
        email = str(data.get("email") or "").strip().lower()
        if not EMAIL_PATTERN.match(email):
            raise ApiError(400, "Enter a valid email address.", {"email": "Enter a valid email address."})
        changes["email"] = email

    new_role = None
    if "role" in data and data.get("role"):
        if actor.role != ADMIN:
            raise ApiError(403, "Only administrators can change roles.")
        new_role = ROLE.db(data["role"])
        if is_self and new_role != "Administrator":
            raise ApiError(409, "You can't remove your own administrator role.")
    department = optional_text(data, "department", 100) if actor.role == ADMIN and "department" in data else None

    with db.transaction() as cur:
        before = _load_user(user_id, cur)
        if "email" in changes and changes["email"] != before["email"].lower():
            if db.fetch_one(cur, 'SELECT 1 FROM "user" WHERE LOWER(email) = %s AND user_id <> %s',
                            (changes["email"], user_id)):
                raise ApiError(409, "Another account already uses that email.")
        if changes:
            assignments = ", ".join(f"{column} = %s" for column in changes)
            cur.execute(f'UPDATE "user" SET {assignments} WHERE user_id = %s', [*changes.values(), user_id])
        if new_role and new_role != before["role_name"]:
            role = db.fetch_one(cur, "SELECT role_id FROM role WHERE role_name = %s", (new_role,))
            cur.execute('UPDATE "user" SET role_id = %s WHERE user_id = %s', (role["role_id"], user_id))
            if new_role == "Guest":
                cur.execute("INSERT INTO guest (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user_id,))
            else:
                cur.execute(
                    """INSERT INTO staff (user_id, position, department, employment_date)
                       VALUES (%s, %s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET position = EXCLUDED.position""",
                    (user_id, new_role, DEFAULT_DEPARTMENT.get(new_role), today()),
                )
        if department is not None:
            cur.execute("UPDATE staff SET department = %s WHERE user_id = %s", (department, user_id))
        row = _load_user(user_id, cur)

    if new_role and new_role != before["role_name"]:
        audit(actor.user_id, "Permission", "Users", f"{row['email']}: {before['role_name']} → {new_role}")
    if changes or department is not None:
        audit(actor.user_id, "Update", "Users", row["email"])
    return user_out(row)


@bp.patch("/users/<int:user_id>/status")
@require_roles(ADMIN)
def update_user_status(user_id):
    actor = current_actor()
    status = USER_STATUS.db(json_body().get("status"))
    if user_id == actor.user_id and status != "Active":
        raise ApiError(409, "You can't deactivate your own account.")
    with db.transaction() as cur:
        before = _load_user(user_id, cur)
        cur.execute('UPDATE "user" SET status = %s WHERE user_id = %s', (status, user_id))
        row = _load_user(user_id, cur)
    audit(actor.user_id, "Status", "Users", f"{row['email']}: {before['status'] or 'Active'} → {status}")
    return user_out(row)


@bp.get("/staff")
@require_roles(*STAFF_ROLES)
def list_staff():
    rows = db.query(
        """SELECT s.staff_id, s.user_id, u.first_name, u.last_name, s.position, s.department,
                  r.role_name, u.phone_number, u.email, s.employment_date, u.status, u.last_sign_in
           FROM staff s
           JOIN "user" u ON u.user_id = s.user_id
           JOIN role r ON r.role_id = u.role_id
           ORDER BY s.staff_id"""
    )
    for row in rows:
        row["employment_status"] = USER_STATUS.api(row.pop("status"), "ACTIVE")
        row["role"] = ROLE.api(row["role_name"])
    return {"staff": rows}


@bp.get("/guests")
@require_roles(RECEPTIONIST, ADMIN)
def list_guests():
    rows = db.query(
        """SELECT g.guest_id, g.user_id, g.date_of_birth, g.gender, g.nationality, g.address,
                  g.identification_type, u.first_name, u.last_name, u.email, u.phone_number
           FROM guest g JOIN "user" u ON u.user_id = g.user_id ORDER BY g.guest_id"""
    )
    return {"guests": rows}


@bp.get("/reservations")
@require_roles(RECEPTIONIST, ADMIN)
def legacy_reservations():
    """Older positional format; the app now uses GET /bookings."""
    rows = db.query(
        """SELECT DISTINCT ON (r.reservation_id)
                  r.reservation_id, r.guest_id, r.reservation_date, r.check_in_date, r.check_out_date,
                  r.number_of_guests, r.reservation_status, r.special_requests, r.total_amount,
                  u.first_name, u.last_name, u.email,
                  p.payment_status, p.payment_method, p.payment_date
           FROM reservation r
           LEFT JOIN guest g ON g.guest_id = r.guest_id
           LEFT JOIN "user" u ON u.user_id = g.user_id
           LEFT JOIN payment p ON p.reservation_id = r.reservation_id
           ORDER BY r.reservation_id, p.payment_id DESC"""
    )
    return {"reservations": [list(row.values()) for row in rows]}


@bp.get("/reservationrooms")
@require_roles(RECEPTIONIST, ADMIN)
def legacy_reservation_rooms():
    rows = db.query("""SELECT reservation_room_id, reservation_id, room_id, room_rate, number_of_nights
                       FROM reservation_room ORDER BY reservation_room_id""")
    return {"reservation_rooms": [list(row.values()) for row in rows]}


