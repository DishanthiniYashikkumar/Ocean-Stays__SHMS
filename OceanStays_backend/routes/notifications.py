"""In-app notifications (the bell in every dashboard)."""

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, arg_int, json_body, to_int
from mappings import ADMIN
from serializers import notification_out

bp = Blueprint("notifications", __name__)


def _target_user(actor, requested):
    """Admins may act on anyone's notifications; everyone else only on their own."""
    if requested and requested != actor.user_id and actor.role != ADMIN:
        raise ApiError(403, "You can only see your own notifications.")
    return requested or actor.user_id


@bp.get("/notifications")
@require_roles()
def list_notifications():
    actor = current_actor()
    requested = to_int(request.args.get("userId"), "userId")
    limit = arg_int("limit", 100, 1, 500)
    conditions, params = [], []
    if actor.role == ADMIN and not requested:
        pass  # the admin Notifications page reviews everything
    else:
        conditions.append("n.user_id = %s")
        params.append(_target_user(actor, requested))
    if request.args.get("unread") in ("1", "true"):
        conditions.append("COALESCE(n.status, 'Unread') NOT IN ('Read', 'Archived')")
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = db.query(
        f"""SELECT n.* FROM notification n {where}
            ORDER BY n.sent_at DESC NULLS LAST, n.notification_id DESC LIMIT %s""",
        params + [limit],
    )
    return [notification_out(row) for row in rows]


@bp.get("/notifications/unread-count")
@require_roles()
def unread_count():
    actor = current_actor()
    user_id = _target_user(actor, to_int(request.args.get("userId"), "userId"))
    count = db.scalar(
        """SELECT COUNT(*) FROM notification
           WHERE user_id = %s AND COALESCE(status, 'Unread') NOT IN ('Read', 'Archived')""",
        (user_id,),
    )
    return {"userId": user_id, "count": count}


@bp.post("/notifications/<int:notification_id>/read")
@require_roles()
def mark_read(notification_id):
    actor = current_actor()
    row = db.query_one("SELECT * FROM notification WHERE notification_id = %s", (notification_id,))
    if not row or (row["user_id"] != actor.user_id and actor.role != ADMIN):
        raise ApiError(404, "We couldn't find that notification.")
    db.execute("UPDATE notification SET status = 'Read' WHERE notification_id = %s", (notification_id,))
    row["status"] = "Read"
    return notification_out(row)


@bp.post("/notifications/read-all")
@require_roles()
def mark_all_read():
    actor = current_actor()
    user_id = _target_user(actor, to_int(json_body().get("userId"), "userId"))
    updated = db.execute(
        """UPDATE notification SET status = 'Read'
           WHERE user_id = %s AND COALESCE(status, 'Unread') NOT IN ('Read', 'Archived')""",
        (user_id,),
    )
    return {"userId": user_id, "updated": updated}
