"""Cleaning tasks, room inspections and maintenance reports.

Room turnaround:  Dirty -> Cleaning (task started) -> Clean (task done)
                  -> Inspected (passed) | Dirty + new task (failed)
"""

from flask import Blueprint, request

import db
from auth import current_actor, require_roles
from errors import ApiError, json_body, optional_text, to_int
from mappings import ADMIN, HOUSEKEEPING, PRIORITY, RECEPTIONIST, REQUEST_STATUS, SERVICE_STAFF
from routes.service_requests import create_request
from serializers import TASK_SELECT, task_out
from services import audit, notify_role, now_naive, staff_id_for_user, today

bp = Blueprint("housekeeping", __name__)

HK_READ = (HOUSEKEEPING, RECEPTIONIST, ADMIN)
HK_WRITE = (HOUSEKEEPING, ADMIN)

TASK_MOVES = {
    "Pending": {"Assigned", "In Progress", "Cancelled"},
    "Assigned": {"In Progress", "Cancelled"},
    "In Progress": {"Completed", "Cancelled"},
    "Completed": set(),
    "Cancelled": set(),
}


def _scope(assigned_user):
    """Tasks for one person: theirs, plus unassigned ones anyone can pick up."""
    if not assigned_user:
        return "", []
    return "(su.user_id = %s OR sr.assigned_staff_id IS NULL)", [assigned_user]


def load_tasks(where="", params=None, cur=None):
    sql = f"""{TASK_SELECT} {('WHERE ' + where) if where else ''}
              ORDER BY CASE ht.task_status WHEN 'In Progress' THEN 0 WHEN 'Assigned' THEN 1
                                           WHEN 'Pending' THEN 2 WHEN 'Completed' THEN 3 ELSE 4 END,
                       ht.task_date DESC, ht.housekeeping_task_id DESC"""
    rows = db.fetch_all(cur, sql, params) if cur is not None else db.query(sql, params)
    return [task_out(row) for row in rows]


@bp.get("/housekeeping/summary")
@require_roles(*HK_READ)
def summary():
    where, params = _scope(to_int(request.args.get("assignedToId"), "assignedToId"))
    row = db.query_one(
        f"""SELECT COUNT(*) FILTER (WHERE ht.task_status = 'Pending') AS pending,
                   COUNT(*) FILTER (WHERE ht.task_status = 'Assigned') AS assigned,
                   COUNT(*) FILTER (WHERE ht.task_status = 'In Progress') AS in_progress,
                   COUNT(*) FILTER (WHERE ht.task_status = 'Completed' AND ht.task_date = %s) AS completed_today,
                   COUNT(*) FILTER (WHERE ht.task_status = 'Completed') AS completed,
                   COUNT(*) FILTER (WHERE ht.task_status = 'Cancelled') AS cancelled,
                   COUNT(*) AS total
            FROM housekeeping_task ht
            JOIN service_request sr ON sr.service_request_id = ht.service_request_id
            LEFT JOIN staff s ON s.staff_id = sr.assigned_staff_id
            LEFT JOIN "user" su ON su.user_id = s.user_id
            {('WHERE ' + where) if where else ''}""",
        [today()] + params,
    )
    awaiting = db.scalar("SELECT COUNT(*) FROM room WHERE status = 'Clean'")
    return {
        "PENDING": row["pending"] + row["assigned"],
        "ASSIGNED": row["assigned"],
        "IN_PROGRESS": row["in_progress"],
        "COMPLETED": row["completed_today"],
        "COMPLETED_ALL": row["completed"],
        "CANCELLED": row["cancelled"],
        "total": row["total"],
        "awaitingInspection": awaiting,
        # Older key names
        "waitingToStart": row["pending"] + row["assigned"],
        "inProgress": row["in_progress"],
        "completedToday": row["completed_today"],
    }


@bp.get("/housekeeping/tasks")
@require_roles(*HK_READ)
def list_tasks():
    conditions, params = [], []
    where, scope_params = _scope(to_int(request.args.get("assignedToId"), "assignedToId"))
    if where:
        conditions.append(where)
        params += scope_params
    status = request.args.get("status")
    if status:
        conditions.append("ht.task_status = %s")
        params.append(REQUEST_STATUS.db(status))
    floor = request.args.get("floor")
    if floor not in (None, ""):
        conditions.append("rm.floor = %s")
        params.append(str(floor))
    return load_tasks(" AND ".join(conditions), params)


@bp.get("/housekeeping/tasks/<int:task_id>")
@require_roles(*HK_READ)
def get_task(task_id):
    items = load_tasks("ht.housekeeping_task_id = %s", [task_id])
    if not items:
        raise ApiError(404, "We couldn't find that task.")
    return items[0]


@bp.patch("/housekeeping/tasks/<int:task_id>/status")
@require_roles(*HK_WRITE)
def update_task(task_id):
    actor = current_actor()
    new_status = REQUEST_STATUS.db(json_body().get("status"))
    with db.transaction() as cur:
        task = db.fetch_one(cur, "SELECT * FROM housekeeping_task WHERE housekeeping_task_id = %s FOR UPDATE",
                            (task_id,))
        if not task:
            raise ApiError(404, "We couldn't find that task.")
        old = task["task_status"] or "Pending"
        if new_status != old and new_status not in TASK_MOVES.get(old, set()):
            raise ApiError(409, f"A {old.lower()} task can't move to {new_status.lower()}.")

        now = now_naive()
        cur.execute(
            """UPDATE housekeeping_task SET task_status = %s,
                      start_time = CASE WHEN %s = 'In Progress' THEN COALESCE(start_time, %s) ELSE start_time END,
                      completion_time = CASE WHEN %s = 'Completed' THEN %s ELSE completion_time END
               WHERE housekeeping_task_id = %s""",
            (new_status, new_status, now.time(), new_status, now.time(), task_id),
        )
        request_row = db.fetch_one(cur, "SELECT * FROM service_request WHERE service_request_id = %s FOR UPDATE",
                                   (task["service_request_id"],))
        staff_id = request_row["assigned_staff_id"] or staff_id_for_user(actor.user_id, cur)
        cur.execute(
            """UPDATE service_request SET request_status = %s, assigned_staff_id = %s,
                      completed_at = CASE WHEN %s = 'Completed' THEN %s ELSE completed_at END
               WHERE service_request_id = %s""",
            (new_status, staff_id, new_status, now, task["service_request_id"]),
        )

        # Keep the room's status in step (not while a guest is still in it).
        room = db.fetch_one(
            cur,
            """SELECT rm.room_id, rm.room_number, rm.status FROM service_request sr
               LEFT JOIN reservation_room rr ON rr.reservation_room_id = sr.reservation_room_id
               JOIN room rm ON rm.room_id = COALESCE(sr.room_id, rr.room_id)
               WHERE sr.service_request_id = %s""",
            (task["service_request_id"],),
        )
        room_status = {"In Progress": "Cleaning", "Completed": "Clean"}.get(new_status)
        if room and room_status and room["status"] in ("Dirty", "Cleaning", "Clean", "Inspected", "Available"):
            if not (room_status == "Cleaning" and room["status"] in ("Inspected", "Available")):
                cur.execute("UPDATE room SET status = %s WHERE room_id = %s", (room_status, room["room_id"]))
        items = load_tasks("ht.housekeeping_task_id = %s", [task_id], cur=cur)

    audit(actor.user_id, "Status", "Rooms",
          f"Task {task_id} room {room['room_number'] if room else '—'}: {old} → {new_status}")
    if new_status == "Completed" and room:
        notify_role("Housekeeping", "Housekeeping", "Room ready for inspection",
                    f"Room {room['room_number']} has been cleaned and is waiting for inspection.")
    return items[0]


@bp.post("/housekeeping/rooms/<int:room_id>/inspect")
@require_roles(*HK_WRITE)
def inspect_room(room_id):
    actor = current_actor()
    data = json_body()
    passed = bool(data.get("passed", True))
    note = optional_text(data, "note", 500)
    with db.transaction() as cur:
        room = db.fetch_one(cur, "SELECT * FROM room WHERE room_id = %s FOR UPDATE", (room_id,))
        if not room:
            raise ApiError(404, "That room doesn't exist.")
        if room["status"] != "Clean":
            raise ApiError(409, f"Room {room['room_number']} isn't waiting for inspection "
                                f"(it's {room['status'].lower()}).")
        task_id = None
        if passed:
            cur.execute("UPDATE room SET status = 'Inspected', notes = COALESCE(%s, notes) WHERE room_id = %s",
                        (note, room_id))
        else:
            cur.execute("UPDATE room SET status = 'Dirty' WHERE room_id = %s", (room_id,))
            request_id = create_request(
                cur, service_name="Housekeeping", title="Room Cleaning",
                details=f"Re-clean after failed inspection{': ' + note if note else ''}",
                priority="High", reservation_room_id=None, room_id=room_id)
            cur.execute("UPDATE housekeeping_task SET task_type = 'Re-clean after inspection' "
                        "WHERE service_request_id = %s RETURNING housekeeping_task_id", (request_id,))
            task_id = cur.fetchone()["housekeeping_task_id"]

    audit(actor.user_id, "Status", "Rooms",
          f"Room {room['room_number']} inspection {'passed' if passed else 'failed'}")
    return {"roomId": room_id, "roomNumber": room["room_number"], "passed": passed,
            "status": "INSPECTED" if passed else "DIRTY", "taskId": task_id}


@bp.post("/housekeeping/maintenance")
@require_roles(HOUSEKEEPING, RECEPTIONIST, SERVICE_STAFF, ADMIN)
def report_maintenance():
    actor = current_actor()
    data = json_body()
    room_id = to_int(data.get("roomId"), "Room")
    title = optional_text(data, "title", 100) or "Maintenance issue"
    details = optional_text(data, "details", 2000)
    priority = PRIORITY.db(data.get("priority") or "NORMAL")

    with db.transaction() as cur:
        if not room_id and data.get("roomNumber"):
            row = db.fetch_one(cur, "SELECT room_id FROM room WHERE room_number = %s", (str(data["roomNumber"]),))
            room_id = row["room_id"] if row else None
        room = db.fetch_one(cur, "SELECT * FROM room WHERE room_id = %s FOR UPDATE", (room_id,)) if room_id else None
        if not room:
            raise ApiError(400, "Choose the room with the problem.")
        stay = db.fetch_one(
            cur,
            """SELECT rr.reservation_room_id FROM reservation_room rr
               JOIN reservation r ON r.reservation_id = rr.reservation_id
               WHERE rr.room_id = %s AND r.reservation_status = 'Checked in' LIMIT 1""",
            (room_id,),
        )
        request_id = create_request(
            cur, service_name="Maintenance", title=title, details=details, priority=priority,
            reservation_room_id=stay["reservation_room_id"] if stay else None, room_id=room_id)
        if room["status"] != "Occupied":
            cur.execute("UPDATE room SET status = 'Maintaining' WHERE room_id = %s", (room_id,))
        maintenance = db.fetch_one(cur, "SELECT maintenance_request_id FROM maintenance_request "
                                        "WHERE service_request_id = %s", (request_id,))

    reference = f"SR-{request_id}"
    audit(actor.user_id, "Create", "Requests", f"{reference} maintenance room {room['room_number']}")
    notify_role("Service Staff", "Service", "Maintenance reported",
                f"{reference} · Room {room['room_number']}: {title}")
    return {"reference": reference, "requestId": request_id,
            "maintenanceRequestId": maintenance["maintenance_request_id"],
            "roomId": room_id, "roomNumber": room["room_number"],
            "roomStatus": "OCCUPIED" if room["status"] == "Occupied" else "MAINTENANCE"}, 201


