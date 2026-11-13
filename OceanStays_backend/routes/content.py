"""Public website content: facilities, experiences, testimonials, gallery, contact."""

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from content_data import (
    DEFAULT_EXPERIENCE_IMAGE,
    DEFAULT_FACILITY_IMAGE,
    EXPERIENCE_EXTRAS,
    FACILITY_EXTRAS,
    GALLERY,
    HIGHLIGHTS,
)
from config import Config
from errors import ApiError, json_body, optional_text, require_text
from mappings import ADMIN, FACILITY_STATUS
from serializers import full_name
from services import audit, notify_role, operational_settings

bp = Blueprint("content", __name__)


def _facility_row_out(row):
    """Raw columns, as src/services/contentService.js getFacilities() maps them."""
    icon, image = FACILITY_EXTRAS.get(row["facility_name"], (None, DEFAULT_FACILITY_IMAGE))
    return {
        "facility_id": row["facility_id"],
        "facility_name": row["facility_name"],
        "description": row["description"],
        "department": row["department"],
        "hours": row["hours"],
        "availability_status": row["availability_status"],
        "icon": row.get("icon") or icon or "bi-building",
        "capacity": row.get("capacity") or "",
        "image": image,
    }


def _facility_out(row):
    raw = _facility_row_out(row)
    return {
        "id": raw["facility_id"], "name": raw["facility_name"], "description": raw["description"] or "",
        "summary": raw["description"] or "", "department": raw["department"] or "", "hours": raw["hours"] or "",
        "status": FACILITY_STATUS.api(raw["availability_status"]), "icon": raw["icon"],
        "capacity": raw["capacity"], "image": raw["image"],
    }


@bp.get("/facilities")
def facilities():
    rows = db.query("SELECT * FROM facility ORDER BY facility_id")
    return {"facilities": [_facility_row_out(row) for row in rows]}


def _facility_values(data, partial):
    values = {}
    if not partial or "name" in data:
        values["facility_name"] = require_text(data, "name", "Name", 100)
    for key, column, limit in (("department", "department", 100), ("hours", "hours", 100),
                               ("icon", "icon", 50), ("capacity", "capacity", 50)):
        if key in data:
            values[column] = optional_text(data, key, limit)
    if "summary" in data or "description" in data:
        values["description"] = optional_text(data, "summary") or optional_text(data, "description")
    if "status" in data:
        values["availability_status"] = FACILITY_STATUS.db(data["status"])
    elif not partial:
        values["availability_status"] = "Open"
    return values


@bp.post("/content/facilities")
@require_roles(ADMIN)
def create_facility():
    values = _facility_values(json_body(), partial=False)
    columns = ", ".join(values)
    placeholders = ", ".join(["%s"] * len(values))
    with db.transaction() as cur:
        if db.fetch_one(cur, "SELECT 1 FROM facility WHERE LOWER(facility_name) = LOWER(%s)",
                        (values["facility_name"],)):
            raise ApiError(409, "A facility with that name already exists.")
        row = db.fetch_one(cur, f"INSERT INTO facility ({columns}) VALUES ({placeholders}) RETURNING *",
                           list(values.values()))
    audit(current_actor().user_id, "Create", "Settings", f"Facility {row['facility_name']}")
    return _facility_out(row), 201


@bp.patch("/content/facilities/<int:facility_id>")
@require_roles(ADMIN)
def update_facility(facility_id):
    values = _facility_values(json_body(), partial=True)
    if not values:
        raise ApiError(400, "Nothing to update.")
    with db.transaction() as cur:
        if "facility_name" in values and db.fetch_one(
            cur, "SELECT 1 FROM facility WHERE LOWER(facility_name) = LOWER(%s) AND facility_id <> %s",
            (values["facility_name"], facility_id)):
            raise ApiError(409, "A facility with that name already exists.")
        assignments = ", ".join(f"{column} = %s" for column in values)
        row = db.fetch_one(cur, f"UPDATE facility SET {assignments} WHERE facility_id = %s RETURNING *",
                           [*values.values(), facility_id])
        if not row:
            raise ApiError(404, "That facility doesn't exist.")
    audit(current_actor().user_id, "Update", "Settings", f"Facility {row['facility_name']}")
    return _facility_out(row)


@bp.get("/content/experiences")
def experiences():
    rows = db.query("SELECT * FROM activity ORDER BY activity_id")
    items = []
    for row in rows:
        icon, image, summary = EXPERIENCE_EXTRAS.get(
            row["activity_name"], ("bi-compass", DEFAULT_EXPERIENCE_IMAGE, None))
        items.append({
            "id": row["activity_id"], "name": row["activity_name"], "icon": icon,
            "summary": summary or row["description"], "description": row["description"],
            "image": image, "duration": row["duration"], "price": row["price_per_person"],
            "currency": Config.CURRENCY,
        })
    return items


@bp.get("/content/testimonials")
def testimonials():
    rows = db.query(
        """SELECT f.feedback_id, f.rating, f.comments, u.first_name, u.last_name, g.nationality, rc.room_name
           FROM feedback f
           JOIN reservation_room rr ON rr.reservation_room_id = f.reservation_room_id
           JOIN reservation r ON r.reservation_id = rr.reservation_id
           JOIN guest g ON g.guest_id = r.guest_id
           JOIN "user" u ON u.user_id = g.user_id
           JOIN room rm ON rm.room_id = rr.room_id
           JOIN room_category rc ON rc.room_category_id = rm.room_category_id
           WHERE f.rating >= 4 AND COALESCE(TRIM(f.comments), '') <> ''
           ORDER BY f.rating DESC, f.feedback_date DESC
           LIMIT 12"""
    )
    return [
        {
            "id": row["feedback_id"],
            "name": f"{row['first_name'] or 'Guest'} {(row['last_name'] or '')[:1]}.".strip(),
            "fullName": full_name(row["first_name"], row["last_name"], "Guest"),
            "location": row["nationality"] or "Guest",
            "rating": row["rating"],
            "quote": row["comments"],
            "stayedIn": row["room_name"],
            "avatar": None,
        }
        for row in rows
    ]


@bp.get("/content/gallery")
def gallery():
    category = (request.args.get("category") or "All").strip()
    if category.lower() == "all":
        return GALLERY
    return [image for image in GALLERY if image["category"].lower() == category.lower()]


@bp.get("/content/highlights")
def highlights():
    return HIGHLIGHTS


@bp.post("/content/contact")
def contact():
    data = json_body()
    name = require_text(data, "name", "Name", 150)
    email = require_text(data, "email", "Email", 150)
    if "@" not in email:
        raise ApiError(400, "Enter a valid email address.", {"email": "Enter a valid email address."})
    subject = optional_text(data, "subject", 200)
    message = require_text(data, "message", "Message", 5000, min_length=5)
    row = db.query_one(
        """INSERT INTO contact_message (name, email, subject, message)
           VALUES (%s, %s, %s, %s) RETURNING contact_message_id""",
        (name, email, subject, message),
    )
    reference = f"MSG-{row['contact_message_id']}"
    notify_role("Administrator", "System", "New contact message", f"{reference} from {name}: {subject or 'No subject'}")
    return {"reference": reference, "message": "Thanks — we'll reply within one working day."}, 201


@bp.get("/content/hotel")
def hotel():
    """Hotel details and booking policy for the public site (admin Settings edits them)."""
    info = db.query_one("SELECT * FROM hotel_information ORDER BY hotel_id LIMIT 1") or {}
    settings = operational_settings()
    return {
        "hotel": {
            "name": info.get("hotel_name"),
            "tagline": info.get("tagline"),
            "email": info.get("reservations_email"),
            "phone": info.get("phone"),
            "addressLine1": info.get("address_line1"),
            "addressLine2": info.get("address_line2"),
            "country": info.get("country"),
        },
        "policy": {
            "checkInTime": settings.get("check_in_from"),
            "checkOutTime": settings.get("check_out_by"),
            "freeCancellationHours": settings["free_cancellation_hours"],
            "modificationCutoffHours": settings["modification_cutoff_hours"],
            "taxRate": float(settings["tax_rate"]) / 100,
            "serviceChargeRate": float(settings["service_charge"]) / 100,
        },
    }
