"""Room categories ("room types" in the UI), physical rooms and availability."""

from datetime import timedelta

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, json_body, optional_text, to_date, to_int
from mappings import ADMIN, HOUSEKEEPING, RECEPTIONIST, ROOM_STATUS
from serializers import floor_number
from services import audit, room_note, today

bp = Blueprint("rooms", __name__)

# Statuses each role may set by hand. Turnaround states (Cleaning, Clean,
# Inspected) normally move through the housekeeping endpoints instead.
SETTABLE_BY = {
    RECEPTIONIST: {"Available", "Reserved", "Dirty", "Maintaining", "Inspected"},
    HOUSEKEEPING: {"Dirty", "Cleaning", "Clean", "Inspected", "Available", "Maintaining"},
    ADMIN: set(ROOM_STATUS.db_to_api),
}


def room_out(row):
    return {
        "id": row["room_id"],
        "number": row["room_number"],
        "roomTypeId": row["room_category_id"],
        "roomTypeName": row.get("room_name"),
        "floor": floor_number(row.get("floor")),
        "status": ROOM_STATUS.api(row["status"]),
        "notes": row.get("notes") or "",
    }


@bp.get("/rooms")
def list_rooms():
    """Positional rows, as src/services/roomService.js reads them:
    [room_id, room_number, room_category_id, status, floor, notes]."""
    status = request.args.get("status")
    params, where = [], ""
    if status:
        where = "WHERE status = %s"
        params.append(ROOM_STATUS.db(status))
    rows = db.query(
        f"SELECT room_id, room_number, room_category_id, status, floor, notes FROM room {where} ORDER BY room_id",
        params,
    )
    return {
        "rooms": [
            [r["room_id"], str(r["room_number"]), r["room_category_id"], ROOM_STATUS.api(r["status"]),
             floor_number(r["floor"]), r["notes"] or ""]
            for r in rows
        ]
    }


@bp.get("/roomfacilities")
def room_facilities():
    rows = db.query(
        """SELECT ra.room_category_id, ra.amenity_id, a.amenity_name
           FROM room_amenity ra JOIN amenity a ON a.amenity_id = ra.amenity_id
           ORDER BY ra.room_category_id, ra.amenity_id"""
    )
    return {"room_facilities": rows}


@bp.get("/roomtypes")
def room_types():
    """Positional rows: [id, name, description, capacity, price, bedType, roomSize,
    avgRating, reviewCount, amenities[{id,name}], typeName, typeId]."""
    rows = db.query(
        """
        SELECT rc.room_category_id, rc.room_name, rc.description, rc.capacity, rc.base_price,
               rc.bed_type, rc.room_size,
               COALESCE(ROUND(AVG(f.rating)::numeric, 1), 0) AS average_rating,
               COUNT(DISTINCT f.feedback_id) AS review_count,
               COALESCE((
                   SELECT json_agg(json_build_object('id', a.amenity_id, 'name', a.amenity_name)
                                   ORDER BY a.amenity_id)
                   FROM room_amenity ra JOIN amenity a ON a.amenity_id = ra.amenity_id
                   WHERE ra.room_category_id = rc.room_category_id
               ), '[]'::json) AS amenities,
               rt.type_name, rt.room_type_id
        FROM room_category rc
        JOIN room_type rt ON rt.room_type_id = rc.room_type_id
        LEFT JOIN room rm ON rm.room_category_id = rc.room_category_id
        LEFT JOIN reservation_room rr ON rr.room_id = rm.room_id
        LEFT JOIN feedback f ON f.reservation_room_id = rr.reservation_room_id
        GROUP BY rc.room_category_id, rt.type_name, rt.room_type_id
        ORDER BY rc.room_category_id
        """
    )
    return {
        "room_types": [
            [r["room_category_id"], r["room_name"], r["description"], r["capacity"], r["base_price"],
             r["bed_type"], r["room_size"], r["average_rating"], r["review_count"], r["amenities"],
             r["type_name"], r["room_type_id"]]
            for r in rows
        ]
    }


@bp.get("/rooms/availability")
def availability():
    """How many rooms of each category are free for the given stay."""
    check_in = to_date(request.args.get("checkIn"), "Check-in date")
    check_out = to_date(request.args.get("checkOut"), "Check-out date")
    guests = to_int(request.args.get("guests"), "Guests")
    if check_in is None and check_out is None:
        check_in = today()
    if check_in and check_out is None:
        check_out = check_in + timedelta(days=1)
    if check_in is None or check_out <= check_in:
        raise ApiError(400, "Check-out must be after check-in.")

    rows = db.query(
        """
        SELECT rc.room_category_id, rc.capacity,
               COUNT(rm.room_id) AS total,
               COUNT(rm.room_id) FILTER (
                   WHERE rm.status <> 'Maintaining'
                     AND NOT EXISTS (
                         SELECT 1 FROM reservation_room rr
                         JOIN reservation r ON r.reservation_id = rr.reservation_id
                         WHERE rr.room_id = rm.room_id
                           AND r.reservation_status IN ('Pending', 'Confirmed', 'Checked in')
                           AND r.check_in_date < %(check_out)s AND r.check_out_date > %(check_in)s)
               ) AS available
        FROM room_category rc
        LEFT JOIN room rm ON rm.room_category_id = rc.room_category_id
        GROUP BY rc.room_category_id
        ORDER BY rc.room_category_id
        """,
        {"check_in": check_in, "check_out": check_out},
    )
    items = [
        {"roomTypeId": r["room_category_id"], "total": r["total"],
         "available": r["available"] if not guests or r["capacity"] >= guests else 0}
        for r in rows
    ]
    return {"checkIn": check_in, "checkOut": check_out,
            "nights": (check_out - check_in).days, "items": items}


@bp.get("/rooms/<int:room_id>")
@require_roles(RECEPTIONIST, HOUSEKEEPING, ADMIN)
def get_room(room_id):
    row = db.query_one(
        """SELECT rm.*, rc.room_name FROM room rm
           JOIN room_category rc ON rc.room_category_id = rm.room_category_id
           WHERE rm.room_id = %s""",
        (room_id,),
    )
    if not row:
        raise ApiError(404, "That room doesn't exist.")
    return room_out(row)


@bp.patch("/rooms/<int:room_id>")
@require_roles(RECEPTIONIST, HOUSEKEEPING, ADMIN)
def update_room(room_id):
    actor = current_actor()
    data = json_body()
    status = ROOM_STATUS.db(data.get("status"), required=False)
    notes = optional_text(data, "notes", 500) if "notes" in data or "housekeepingNote" in data else None
    if "housekeepingNote" in data and notes is None:
        notes = optional_text(data, "housekeepingNote", 500)
    if status is None and notes is None:
        raise ApiError(400, "Send a status or notes to change.")
    if status and status not in SETTABLE_BY[actor.role]:
        raise ApiError(403, f"Your role can't set a room to {ROOM_STATUS.api(status)}.")

    with db.transaction() as cur:
        room = db.fetch_one(cur, "SELECT * FROM room WHERE room_id = %s FOR UPDATE", (room_id,))
        if not room:
            raise ApiError(404, "That room doesn't exist.")
        if status == "Occupied" and room["status"] != "Occupied":
            raise ApiError(409, "Rooms become occupied when a guest is checked in.")
        # A new status without a note of its own gets that status's default
        # note, so the old note can't contradict it.
        if status and status != room["status"] and notes is None:
            notes = room_note(status)
        cur.execute(
            "UPDATE room SET status = COALESCE(%s, status), notes = COALESCE(%s, notes) WHERE room_id = %s",
            (status, notes, room_id),
        )
        row = db.fetch_one(
            cur,
            """SELECT rm.*, rc.room_name FROM room rm
               JOIN room_category rc ON rc.room_category_id = rm.room_category_id WHERE rm.room_id = %s""",
            (room_id,),
        )

    if status and status != room["status"]:
        audit(actor.user_id, "Status", "Rooms",
              f"Room {room['room_number']}: {room['status']} → {status}")
    return room_out(row)
