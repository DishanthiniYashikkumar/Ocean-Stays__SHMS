"""Error responses and request-body validation helpers.

Every error leaves the API as JSON shaped {"message": "..."} (plus "errors"
for field-level problems), which is what src/services/apiClient.js reads.
Raw database errors are logged, never sent to the client.
"""

import logging
from datetime import date, datetime

import psycopg2
from flask import jsonify, request
from werkzeug.exceptions import HTTPException

from db import DatabaseUnavailable

log = logging.getLogger("oceanstays")


class ApiError(Exception):
    def __init__(self, status, message, errors=None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.errors = errors


def _response(status, message, errors=None):
    payload = {"message": message}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        return _response(error.status, error.message, error.errors)

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        messages = {
            404: "We couldn't find what you were looking for.",
            405: "That action isn't allowed on this resource.",
        }
        return _response(error.code, messages.get(error.code, error.description or error.name))

    @app.errorhandler(DatabaseUnavailable)
    def handle_db_unavailable(error):
        log.warning("Database unavailable: %s", error)
        return _response(503, "The database is unavailable right now. Please try again shortly.")

    @app.errorhandler(psycopg2.OperationalError)
    def handle_operational(error):
        log.warning("Database operational error: %s", error)
        return _response(503, "The database is unavailable right now. Please try again shortly.")

    @app.errorhandler(psycopg2.IntegrityError)
    def handle_integrity(error):
        log.info("Integrity error on %s %s: %s", request.method, request.path, error)
        code = getattr(error, "pgcode", None)
        if code == "23505":
            return _response(409, "That record already exists.")
        if code == "23503":
            return _response(400, "A related record could not be found.")
        if code == "23514":
            return _response(400, "One of the values isn't allowed.")
        return _response(400, "The request conflicts with existing data.")

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        log.exception("Unhandled error on %s %s", request.method, request.path)
        return _response(500, "Something went wrong on our side. Please try again.")


# ---------------------------------------------------------------------------
# Body / query helpers
# ---------------------------------------------------------------------------


def json_body():
    data = request.get_json(silent=True)
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ApiError(400, "The request body must be a JSON object.")
    return data


def require_text(data, key, label=None, max_length=None, min_length=1):
    label = label or key
    value = data.get(key)
    if value is None or not isinstance(value, (str, int, float)):
        raise ApiError(400, f"{label} is required.", {key: f"{label} is required."})
    value = str(value).strip()
    if len(value) < min_length:
        raise ApiError(400, f"{label} is required.", {key: f"{label} is required."})
    if max_length and len(value) > max_length:
        raise ApiError(
            400,
            f"{label} must be {max_length} characters or fewer.",
            {key: f"Must be {max_length} characters or fewer."},
        )
    return value


def optional_text(data, key, max_length=None):
    value = data.get(key)
    if value is None:
        return None
    value = str(value).strip()
    if max_length and len(value) > max_length:
        raise ApiError(400, f"{key} must be {max_length} characters or fewer.")
    return value or None


def to_int(value, label="value", required=False):
    if value is None or value == "":
        if required:
            raise ApiError(400, f"{label} is required.")
        return None
    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise ApiError(400, f"{label} must be a whole number.") from error


def to_number(value, label="value", required=False):
    if value is None or value == "":
        if required:
            raise ApiError(400, f"{label} is required.")
        return None
    try:
        return float(value)
    except (TypeError, ValueError) as error:
        raise ApiError(400, f"{label} must be a number.") from error


def to_date(value, label="date", required=False):
    if value is None or value == "":
        if required:
            raise ApiError(400, f"{label} is required.")
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError as error:
        raise ApiError(400, f"{label} must be a date like 2026-12-31.") from error


def arg_int(name, default=None, minimum=None, maximum=None):
    value = to_int(request.args.get(name), name)
    if value is None:
        value = default
    if value is not None and minimum is not None:
        value = max(minimum, value)
    if value is not None and maximum is not None:
        value = min(maximum, value)
    return value
