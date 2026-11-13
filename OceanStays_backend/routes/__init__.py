"""Route modules, one blueprint per area of the hotel."""

from routes import (
    admin,
    auth_routes,
    bookings,
    content,
    feedback,
    housekeeping,
    notifications,
    payments,
    rooms,
    service_requests,
    users,
)

BLUEPRINTS = [
    auth_routes.bp,
    rooms.bp,
    bookings.bp,
    payments.bp,
    service_requests.bp,
    housekeeping.bp,
    users.bp,
    feedback.bp,
    notifications.bp,
    content.bp,
    admin.bp,
]
