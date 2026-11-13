"""Guest feedback on a stay (one per stay)."""

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, json_body, optional_text, to_int
from mappings import ADMIN, FEEDBACK_CATEGORIES, GUEST, RECEPTIONIST
from serializers import full_name
from services import audit, notify_role, today

bp = Blueprint("feedback", __name__)

FEEDBACK_SELECT = """
    SELECT f.feedback_id, f.reservation_room_id, f.rating, f.comments, f.feedback_date, f.response,
           f.response_date, f.category, r.reservation_id, g.user_id AS guest_user_id,
           u.first_name, u.last_name, g.nationality, rc.room_name
    FROM feedback f
    JOIN reservation_room rr ON rr.reservation_room_id = f.reservation_room_id
    JOIN reservation r ON r.reservation_id = rr.reservation_id
    JOIN guest g ON g.guest_id = r.guest_id
    JOIN "user" u ON u.user_id = g.user_id
    JOIN room rm ON rm.room_id = rr.room_id
    JOIN room_category rc ON rc.room_category_id = rm.room_category_id
"""


def feedback_out(row):
    return {
        "id": row["feedback_id"],
        "bookingId": row["reservation_id"],
        "bookingReference": f"RSV-{row['reservation_id']}",
        "guestId": row["guest_user_id"],
        "guestName": full_name(row["first_name"], row["last_name"], "Guest"),
        "rating": row["rating"],
        "comment": row["comments"] or "",
        "category": row.get("category") or "OVERALL",
        "roomTypeName": row["room_name"],
        "createdAt": row["feedback_date"],
        "response": row["response"],
        "respondedAt": row["response_date"],
    }


@bp.get("/feedback")
@require_roles(GUEST, RECEPTIONIST, ADMIN)
def list_feedback():
    actor = current_actor()
    conditions, params = [], []
    if actor.role == GUEST:
        conditions.append("g.user_id = %s")
        params.append(actor.user_id)
    rating = to_int(request.args.get("minRating"), "minRating")
    if rating:
        conditions.append("f.rating >= %s")
        params.append(rating)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = db.query(f"{FEEDBACK_SELECT} {where} ORDER BY f.feedback_date DESC, f.feedback_id DESC", params)
    return [feedback_out(row) for row in rows]


@bp.post("/feedback")
@require_roles(GUEST)
def submit_feedback():
    actor = current_actor()
    data = json_body()
    rating = to_int(data.get("rating"), "Rating", required=True)
    if not 1 <= rating <= 5:
        raise ApiError(400, "Rating must be between 1 and 5 stars.")
    comment = optional_text(data, "comment", 2000) or optional_text(data, "comments", 2000)
    category = str(data.get("category") or "OVERALL").upper()
    if category not in FEEDBACK_CATEGORIES:
        raise ApiError(400, "Choose what your feedback is about.")
    booking_id = to_int(data.get("bookingId"), "Booking")

    with db.transaction() as cur:
        params = [actor.user_id]
        extra = ""
        if booking_id:
            extra = "AND r.reservation_id = %s"
            params.append(booking_id)
        stay = db.fetch_one(
            cur,
            f"""SELECT rr.reservation_room_id, r.reservation_id, r.reservation_status
                FROM reservation r
                JOIN guest g ON g.guest_id = r.guest_id
                JOIN reservation_room rr ON rr.reservation_id = r.reservation_id
                WHERE g.user_id = %s {extra}
                  AND r.reservation_status IN ('Checked in', 'Checked out')
                  AND NOT EXISTS (SELECT 1 FROM feedback f WHERE f.reservation_room_id = rr.reservation_room_id)
                ORDER BY r.check_out_date DESC LIMIT 1""",
            params,
        )
        if not stay:
            if booking_id and db.fetch_one(
                cur,
                """SELECT 1 FROM feedback f JOIN reservation_room rr ON rr.reservation_room_id = f.reservation_room_id
                   WHERE rr.reservation_id = %s""", (booking_id,)):
                raise ApiError(409, "You've already shared feedback for that stay — thank you!")
            raise ApiError(400, "Feedback can be left for a stay you're on or have completed.")
        row = db.fetch_one(
            cur,
            """INSERT INTO feedback (reservation_room_id, rating, comments, feedback_date, category)
               VALUES (%s, %s, %s, %s, %s) RETURNING feedback_id""",
            (stay["reservation_room_id"], rating, comment, today(), category),
        )
        saved = db.fetch_one(cur, FEEDBACK_SELECT + " WHERE f.feedback_id = %s", (row["feedback_id"],))

    audit(actor.user_id, "Create", "Reservations", f"Feedback for RSV-{stay['reservation_id']}")
    if rating <= 2:
        notify_role("Administrator", "System", "Low rating received",
                    f"RSV-{stay['reservation_id']} rated {rating}/5.")
    return feedback_out(saved), 201
