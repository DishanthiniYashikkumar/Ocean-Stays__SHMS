"""Domain helpers shared by the route modules."""

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

import db
from config import Config
from errors import ApiError

log = logging.getLogger("oceanstays")


# ---------------------------------------------------------------------------
# Time — the hotel's local time, not the database server's (Neon runs in UTC)
# ---------------------------------------------------------------------------


def now_local():
    return datetime.now(ZoneInfo(Config.APP_TIMEZONE))


def now_naive():
    """Local wall-clock time for `timestamp without time zone` columns."""
    return now_local().replace(tzinfo=None, microsecond=0)


def today():
    return now_local().date()


# ---------------------------------------------------------------------------
# Identity conversions: the frontend always sends user ids
# ---------------------------------------------------------------------------


def _lookup(cur, sql, params):
    if cur is not None:
        row = db.fetch_one(cur, sql, params)
    else:
        row = db.query_one(sql, params)
    return row


def guest_id_for_user(user_id, cur=None):
    if user_id is None:
        return None
    row = _lookup(cur, "SELECT guest_id FROM guest WHERE user_id = %s", (user_id,))
    return row["guest_id"] if row else None


def staff_id_for_user(user_id, cur=None):
    if user_id is None:
        return None
    row = _lookup(cur, "SELECT staff_id FROM staff WHERE user_id = %s", (user_id,))
    return row["staff_id"] if row else None


def require_staff_id(user_id, cur=None):
    staff_id = staff_id_for_user(user_id, cur)
    if staff_id is None:
        raise ApiError(400, "That person isn't registered as staff.")
    return staff_id


# ---------------------------------------------------------------------------
# Audit trail and notifications (written after the main work commits)
# ---------------------------------------------------------------------------


# Audit entries and notifications don't change the response, so by default
# they're written on a background thread instead of making the user wait for
# extra database round trips. Tests set ASYNC_SIDE_EFFECTS=0 to write inline.
_side_effects = ThreadPoolExecutor(max_workers=2, thread_name_prefix="side-effects")


def _run(fn, *args):
    if Config.ASYNC_SIDE_EFFECTS:
        _side_effects.submit(_safe, fn, *args)
    else:
        _safe(fn, *args)


def _safe(fn, *args):
    try:
        fn(*args)
    except Exception:  # auditing/notifying must never break the request
        log.exception("Side effect %s failed", fn.__name__)


def _write_audit(user_id, action, module, entity, result, at):
    db.execute(
        """INSERT INTO audit_log (user_id, action_type, module_name, entity_reference, result_status, created_at)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (user_id, action, module, (entity or "")[:100] or None, result, at),
    )


def _write_notification(user_id, notification_type, title, message, at):
    db.execute(
        """INSERT INTO notification (user_id, title, message, notification_type, sent_at, status)
           VALUES (%s, %s, %s, %s, %s, 'Unread')""",
        (user_id, title[:200], message, notification_type, at),
    )


def _write_role_notification(role_name, notification_type, title, message, at):
    db.execute(
        """INSERT INTO notification (user_id, title, message, notification_type, sent_at, status)
           SELECT u.user_id, %s, %s, %s, %s, 'Unread'
           FROM "user" u JOIN role r ON r.role_id = u.role_id
           WHERE r.role_name = %s AND COALESCE(u.status, 'Active') = 'Active'""",
        (title[:200], message, notification_type, at, role_name),
    )


def audit(user_id, action, module, entity=None, result="Success"):
    _run(_write_audit, user_id, action, module, entity, result, now_naive())


def notify(user_id, notification_type, title, message):
    if user_id:
        _run(_write_notification, user_id, notification_type, title, message, now_naive())


def notify_role(role_name, notification_type, title, message):
    """Notifies every active user with the given database role name."""
    _run(_write_role_notification, role_name, notification_type, title, message, now_naive())


# ---------------------------------------------------------------------------
# Booking rules
# ---------------------------------------------------------------------------


_settings_cache = {"value": None, "at": 0.0}
_SETTINGS_TTL = 60


def clear_settings_cache():
    _settings_cache["value"] = None


def operational_settings(cur=None):
    cached = _settings_cache["value"]
    if cached is not None and time.monotonic() - _settings_cache["at"] < _SETTINGS_TTL:
        return dict(cached)
    sql = """SELECT check_in_from, check_out_by, free_cancellation_hours,
                    modification_cutoff_hours, tax_rate, service_charge
             FROM operational_settings ORDER BY setting_id LIMIT 1"""
    row = db.fetch_one(cur, sql) if cur is not None else db.query_one(sql)
    if not row:
        return {
            "check_in_from": None, "check_out_by": None, "free_cancellation_hours": 48,
            "modification_cutoff_hours": 24, "tax_rate": Decimal("12"), "service_charge": Decimal("10"),
        }
    _settings_cache.update(value=dict(row), at=time.monotonic())
    return row


def _whole(value):
    return Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def booking_totals(rate, nights, settings):
    """Same arithmetic as calculateQuote() in the frontend's bookingService.js."""
    room_total = Decimal(rate) * nights
    taxes = _whole(room_total * Decimal(settings["tax_rate"]) / 100)
    service = _whole(room_total * Decimal(settings["service_charge"]) / 100)
    return {
        "roomTotal": room_total,
        "taxes": taxes,
        "serviceCharge": service,
        "total": room_total + taxes + service,
    }


def hours_until_check_in(check_in_date, settings):
    check_in_time = settings.get("check_in_from") or datetime.strptime("14:00", "%H:%M").time()
    start = datetime.combine(check_in_date, check_in_time)
    return (start - now_naive()).total_seconds() / 3600


# A room is free for [check_in, check_out) when no live reservation overlaps
# those nights and it isn't out of order.
FREE_ROOMS_SQL = """
    SELECT rm.room_id, rm.room_number, rm.status
    FROM room rm
    WHERE rm.room_category_id = %(category)s
      AND rm.status <> 'Maintaining'
      AND NOT EXISTS (
          SELECT 1
          FROM reservation_room rr
          JOIN reservation r ON r.reservation_id = rr.reservation_id
          WHERE rr.room_id = rm.room_id
            AND r.reservation_status IN ('Pending', 'Confirmed', 'Checked in')
            AND r.check_in_date < %(check_out)s
            AND r.check_out_date > %(check_in)s
            AND (%(exclude)s::int IS NULL OR r.reservation_id <> %(exclude)s::int)
      )
    ORDER BY CASE rm.status WHEN 'Inspected' THEN 0 WHEN 'Available' THEN 1
                            WHEN 'Clean' THEN 2 WHEN 'Reserved' THEN 3 ELSE 4 END,
             rm.room_number
"""


def lock_category(cur, category_id):
    """Serialises concurrent bookings of one room category for this transaction."""
    cur.execute("SELECT pg_advisory_xact_lock(4242, %s)", (category_id,))


def free_rooms(cur, category_id, check_in, check_out, exclude_reservation=None):
    return db.fetch_all(
        cur,
        FREE_ROOMS_SQL,
        {"category": category_id, "check_in": check_in, "check_out": check_out,
         "exclude": exclude_reservation},
    )


def is_room_free(cur, room_id, check_in, check_out, exclude_reservation=None):
    row = db.fetch_one(
        cur,
        """SELECT NOT EXISTS (
               SELECT 1 FROM reservation_room rr
               JOIN reservation r ON r.reservation_id = rr.reservation_id
               WHERE rr.room_id = %(room)s
                 AND r.reservation_status IN ('Pending', 'Confirmed', 'Checked in')
                 AND r.check_in_date < %(check_out)s AND r.check_out_date > %(check_in)s
                 AND (%(exclude)s::int IS NULL OR r.reservation_id <> %(exclude)s::int)
           ) AS free""",
        {"room": room_id, "check_in": check_in, "check_out": check_out,
         "exclude": exclude_reservation},
    )
    return bool(row and row["free"])


def reference_number(prefix, number):
    return f"{prefix}-{number}"


def parse_reference(value, prefix):
    """Accepts 42, "42" or "RSV-42"."""
    if value is None:
        return None
    text = str(value).strip().upper()
    if text.startswith(prefix + "-"):
        text = text[len(prefix) + 1:]
    try:
        return int(text)
    except ValueError as error:
        raise ApiError(400, f"'{value}' isn't a valid reference.") from error
