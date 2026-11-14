/**
 * constants.js
 * -----------------------------------------------------------------------------
 * Status vocabularies and display catalogues shared by the services and pages.
 */

/* Bookings and payments */

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  CHECKED_OUT: "CHECKED_OUT",
  CANCELLED: "CANCELLED",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

/* Rooms */

/**
 * Room states.
 *
 * The housekeeping turnaround is a chain, not a flag:
 *
 *   OCCUPIED -> (check-out) -> DIRTY -> CLEANING -> CLEAN -> INSPECTED -> sellable
 *
 * A room is only sellable once it has been inspected, which is why CLEAN and
 * INSPECTED are separate: "the cleaner says it's done" and "a supervisor has
 * confirmed it" are different claims, and only the second one should put a
 * room back in front of a guest.
 */
export const ROOM_STATUS = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  DIRTY: "DIRTY",
  CLEANING: "CLEANING",
  CLEAN: "CLEAN",
  INSPECTED: "INSPECTED",
  READY: "READY",
  MAINTENANCE: "MAINTENANCE",
};

/**
 * Default note for each room status, pre-filled when staff change a status.
 * Same wording the API writes when a status changes without a note — keep in
 * step with ROOM_STATUS_NOTES in OceanStays_backend/services.py.
 */
export const ROOM_STATUS_NOTES = {
  AVAILABLE: "Ready for guest booking",
  RESERVED: "Allocated for an upcoming reservation",
  OCCUPIED: "Guest checked in",
  DIRTY: "Requires cleaning before next check-in",
  CLEANING: "Cleaning in progress",
  CLEAN: "Cleaned, awaiting inspection",
  INSPECTED: "Cleaned and inspected by housekeeping",
  READY: "Cleaned and inspected by housekeeping",
  MAINTENANCE: "Under maintenance",
};

/** States in which a room may be sold or allocated to an arriving guest. */
export const SELLABLE_STATUSES = [
  ROOM_STATUS.AVAILABLE,
  ROOM_STATUS.READY,
  ROOM_STATUS.INSPECTED,
  ROOM_STATUS.RESERVED,
];

export const BED_TYPES = {
  KING: "King",
  QUEEN: "Queen",
  TWIN: "Twin",
  SOFA: "Sofa bed",
};

/** Amenity catalogue — icon is a Bootstrap Icons class. */
export const AMENITIES = {
  wifi: { id: "wifi", label: "High-speed Wi-Fi", icon: "bi-wifi" },
  ac: { id: "ac", label: "Air conditioning", icon: "bi-snow" },
  tv: { id: "tv", label: "Smart TV", icon: "bi-tv" },
  minibar: { id: "minibar", label: "Minibar", icon: "bi-cup-straw" },
  safe: { id: "safe", label: "In-room safe", icon: "bi-safe" },
  balcony: { id: "balcony", label: "Private balcony", icon: "bi-door-open" },
  oceanView: { id: "oceanView", label: "Ocean view", icon: "bi-water" },
  bathtub: { id: "bathtub", label: "Soaking tub", icon: "bi-droplet" },
  coffee: { id: "coffee", label: "Coffee machine", icon: "bi-cup-hot" },
  desk: { id: "desk", label: "Work desk", icon: "bi-laptop" },
  pool: { id: "pool", label: "Private plunge pool", icon: "bi-water" },
  butler: { id: "butler", label: "Butler service", icon: "bi-bell" },
};

/* Service requests and housekeeping */

export const REQUEST_STATUS = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const REQUEST_PRIORITY = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
};

export const REQUEST_TYPE = {
  ROOM_SERVICE: "ROOM_SERVICE",
  HOUSEKEEPING: "HOUSEKEEPING",
  DINING: "DINING",
  TRANSPORT: "TRANSPORT",
  MAINTENANCE: "MAINTENANCE",
};

export const REQUEST_TYPE_META = {
  [REQUEST_TYPE.ROOM_SERVICE]: { label: "Room Service", icon: "bi-cup-hot" },
  [REQUEST_TYPE.HOUSEKEEPING]: { label: "Housekeeping", icon: "bi-stars" },
  [REQUEST_TYPE.DINING]: { label: "Dining", icon: "bi-egg-fried" },
  [REQUEST_TYPE.TRANSPORT]: { label: "Transport", icon: "bi-car-front" },
  [REQUEST_TYPE.MAINTENANCE]: { label: "Maintenance", icon: "bi-tools" },
};

export const HOUSEKEEPING_TASK_LABELS = {
  DEPARTURE_CLEAN: "Departure clean",
  STAYOVER_SERVICE: "Stayover service",
  INSPECTION: "Inspection",
  DEEP_CLEAN: "Deep clean",
};

/* Notifications */

export const NOTIFICATION_TYPE = {
  BOOKING: "BOOKING",
  PAYMENT: "PAYMENT",
  SERVICE: "SERVICE",
  HOUSEKEEPING: "HOUSEKEEPING",
  SYSTEM: "SYSTEM",
};

export const NOTIFICATION_META = {
  [NOTIFICATION_TYPE.BOOKING]: { icon: "bi-calendar2-check", tone: "info" },
  [NOTIFICATION_TYPE.PAYMENT]: { icon: "bi-credit-card", tone: "gold" },
  [NOTIFICATION_TYPE.SERVICE]: { icon: "bi-bell", tone: "neutral" },
  [NOTIFICATION_TYPE.HOUSEKEEPING]: { icon: "bi-stars", tone: "success" },
  [NOTIFICATION_TYPE.SYSTEM]: { icon: "bi-shield-check", tone: "neutral" },
};

/* Audit log */

export const AUDIT_ACTION = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  PERMISSION: "PERMISSION",
  PAYMENT: "PAYMENT",
  STATUS: "STATUS",
};

export const AUDIT_RESULT = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
};

/** Modules an action can belong to. Matches the admin navigation. */
export const AUDIT_MODULES = [
  "Authentication",
  "Reservations",
  "Rooms",
  "Users",
  "Payments",
  "Requests",
  "Settings",
  "Permissions",
];

/* Feedback */

export const FEEDBACK_CATEGORY = {
  OVERALL: "OVERALL",
  ROOM: "ROOM",
  DINING: "DINING",
  SERVICE: "SERVICE",
  FACILITIES: "FACILITIES",
  HOUSEKEEPING: "HOUSEKEEPING",
};

export const FEEDBACK_CATEGORY_LABELS = {
  [FEEDBACK_CATEGORY.OVERALL]: "Overall stay",
  [FEEDBACK_CATEGORY.ROOM]: "The room",
  [FEEDBACK_CATEGORY.DINING]: "Dining",
  [FEEDBACK_CATEGORY.SERVICE]: "Service & staff",
  [FEEDBACK_CATEGORY.FACILITIES]: "Facilities",
  [FEEDBACK_CATEGORY.HOUSEKEEPING]: "Housekeeping",
};
