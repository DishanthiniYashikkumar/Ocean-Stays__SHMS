"""JSON encoding used for every response.

Dates come out as ISO strings ("2026-11-13"), times as "HH:MM" and numeric
columns as numbers, so the frontend never has to parse RFC-822 dates or
numeric strings.
"""

from datetime import date, datetime, time
from decimal import Decimal

from flask.json.provider import DefaultJSONProvider


def _encode(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, Decimal):
        return float(value)
    return DefaultJSONProvider.default(value)


class AppJSONProvider(DefaultJSONProvider):
    default = staticmethod(_encode)
    sort_keys = False
