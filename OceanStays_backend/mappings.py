"""The one place that translates database values to the frontend's enums.

The database stores human spellings ("Checked in", "In Progress", "Medium",
"Maintaining"); the React app uses the constants in
OceanStays_frontend/src/services/constants.js ("CHECKED_IN", "IN_PROGRESS",
"NORMAL", "MAINTENANCE"). The API always speaks the frontend's values and
converts at the edge with to_api() / to_db().
"""

from errors import ApiError


class Mapping:
    def __init__(self, label, pairs, aliases=None, default_api=None):
        self.label = label
        self.db_to_api = dict(pairs)
        self.api_to_db = {api: db for db, api in pairs}
        for alias, db in (aliases or {}).items():
            self.api_to_db[alias] = db
        self.default_api = default_api

    def api(self, db_value, default=None):
        if db_value is None:
            return default if default is not None else self.default_api
        return self.db_to_api.get(db_value, default if default is not None else self.default_api)

    def db(self, api_value, required=True):
        if api_value is None or api_value == "":
            if required:
                raise ApiError(400, f"{self.label} is required.")
            return None
        key = str(api_value).strip()
        for candidate in (key, key.upper(), key.upper().replace(" ", "_")):
            if candidate in self.api_to_db:
                return self.api_to_db[candidate]
        if key in self.db_to_api:  # already a database spelling
            return key
        allowed = ", ".join(sorted(self.db_to_api.values()))
        raise ApiError(400, f"{self.label} '{api_value}' isn't valid. Use one of: {allowed}.")

    def api_values(self):
        return list(self.db_to_api.values())


RESERVATION_STATUS = Mapping(
    "Booking status",
    [
        ("Pending", "PENDING"),
        ("Confirmed", "CONFIRMED"),
        ("Checked in", "CHECKED_IN"),
        ("Checked out", "CHECKED_OUT"),
        ("Cancelled", "CANCELLED"),
    ],
    aliases={"COMPLETED": "Checked out"},
    default_api="PENDING",
)

ROOM_STATUS = Mapping(
    "Room status",
    [
        ("Available", "AVAILABLE"),
        ("Reserved", "RESERVED"),
        ("Occupied", "OCCUPIED"),
        ("Dirty", "DIRTY"),
        ("Cleaning", "CLEANING"),
        ("Clean", "CLEAN"),
        ("Inspected", "INSPECTED"),
        ("Maintaining", "MAINTENANCE"),
    ],
    aliases={"READY": "Inspected", "MAINTAINING": "Maintaining"},
    default_api="AVAILABLE",
)

REQUEST_STATUS = Mapping(
    "Request status",
    [
        ("Pending", "PENDING"),
        ("Assigned", "ASSIGNED"),
        ("In Progress", "IN_PROGRESS"),
        ("Completed", "COMPLETED"),
        ("Cancelled", "CANCELLED"),
    ],
    default_api="PENDING",
)

PRIORITY = Mapping(
    "Priority",
    [("Low", "LOW"), ("Medium", "NORMAL"), ("High", "HIGH"), ("Urgent", "URGENT")],
    aliases={"MEDIUM": "Medium"},
    default_api="NORMAL",
)

PAYMENT_STATUS = Mapping(
    "Payment status",
    [("Pending", "PENDING"), ("Paid", "PAID"), ("Failed", "FAILED"), ("Refunded", "REFUNDED")],
    default_api="PENDING",
)

PAYMENT_METHOD = Mapping(
    "Payment method",
    [
        ("Credit Card", "card"),
        ("Bank Transfer", "bank"),
        ("Cash", "cash"),
        ("Online Payment", "online"),
    ],
    aliases={"onArrival": "Cash", "ONARRIVAL": "Cash", "CARD": "Credit Card", "BANK": "Bank Transfer",
             "CASH": "Cash", "ONLINE": "Online Payment"},
    default_api="cash",
)

AUDIT_ACTION = Mapping(
    "Audit action",
    [(name, name.upper()) for name in
     ("Create", "Update", "Status", "Payment", "Login", "Logout", "Permission", "Delete")],
)

AUDIT_RESULT = Mapping("Audit result", [("Success", "SUCCESS"), ("Failed", "FAILURE")],
                       aliases={"FAILED": "Failed"})

USER_STATUS = Mapping(
    "Account status",
    [("Active", "ACTIVE"), ("Inactive", "INACTIVE"), ("Suspended", "SUSPENDED")],
    default_api="INACTIVE",
)

FACILITY_STATUS = Mapping(
    "Facility status",
    [("Open", "OPEN"), ("Closed", "CLOSED"), ("Maintenance", "MAINTENANCE")],
    default_api="CLOSED",
)

ROLE = Mapping(
    "Role",
    [
        ("Guest", "GUEST"),
        ("Receptionist", "RECEPTIONIST"),
        ("Housekeeping", "HOUSEKEEPING"),
        ("Service Staff", "SERVICE_STAFF"),
        ("Administrator", "ADMIN"),
    ],
    aliases={"ADMINISTRATOR": "Administrator", "HOUSEKEEPER": "Housekeeping"},
)

SERVICE_TYPE = Mapping(
    "Request type",
    [
        ("Room Service", "ROOM_SERVICE"),
        ("Housekeeping", "HOUSEKEEPING"),
        ("Dining", "DINING"),
        ("Transport", "TRANSPORT"),
        ("Maintenance", "MAINTENANCE"),
    ],
)

NOTIFICATION_TYPE = Mapping(
    "Notification type",
    [(name, name.upper()) for name in ("Booking", "Payment", "Service", "Housekeeping", "System")],
    default_api="SYSTEM",
)

FEEDBACK_CATEGORIES = ("OVERALL", "ROOM", "DINING", "SERVICE", "FACILITIES", "HOUSEKEEPING")

# Role constants used throughout the routes.
GUEST, RECEPTIONIST, HOUSEKEEPING, SERVICE_STAFF, ADMIN = (
    "GUEST", "RECEPTIONIST", "HOUSEKEEPING", "SERVICE_STAFF", "ADMIN")
STAFF_ROLES = (RECEPTIONIST, HOUSEKEEPING, SERVICE_STAFF, ADMIN)


def task_type_key(task_type):
    """housekeeping_task.task_type is free text; the UI groups it into 4 keys."""
    text = (task_type or "").lower()
    if "inspect" in text:
        return "INSPECTION"
    if "deep" in text:
        return "DEEP_CLEAN"
    if "departure" in text or "check-out" in text or "checkout" in text:
        return "DEPARTURE_CLEAN"
    return "STAYOVER_SERVICE"


TASK_TYPE_LABELS = {
    "DEPARTURE_CLEAN": "Departure Clean",
    "STAYOVER_SERVICE": "Stayover Service",
    "INSPECTION": "Inspection",
    "DEEP_CLEAN": "Deep Cleaning",
}

# permission.permission_name (database) <-> permission id used by the frontend's
# src/services/permissionCatalogue.js. The labels are identical on both sides.
PERMISSION_IDS = {
    "View reservations": "booking.view",
    "Create reservations": "booking.create",
    "Modify reservations": "booking.edit",
    "Cancel reservations": "booking.cancel",
    "Check guests in and out": "booking.checkin",
    "View rooms": "room.view",
    "Edit room details": "room.edit",
    "Change room status": "room.status",
    "Pass rooms at inspection": "room.inspect",
    "View users": "user.view",
    "Create users": "user.create",
    "Edit users": "user.edit",
    "Deactivate accounts": "user.deactivate",
    "Assign roles": "user.roles",
    "View invoices": "payment.view",
    "Take payment": "payment.take",
    "Issue refunds": "payment.refund",
    "View requests": "request.view",
    "Raise requests": "request.create",
    "Assign to staff": "request.assign",
    "Complete or cancel requests": "request.resolve",
    "View reports": "admin.reports",
    "View audit logs": "admin.audit",
    "Change system settings": "admin.settings",
    "Manage roles and permissions": "admin.permissions",
}
PERMISSION_NAMES = {pid: name for name, pid in PERMISSION_IDS.items()}
