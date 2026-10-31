/**
 * Permission catalogue and the role -> permission map.
 *
 * Mirrors the Role / Permission entities. Grouped by module so the admin screen
 * can render a matrix rather than a flat list of eighty checkboxes.
 *
 * FRONTEND ONLY: this describes what the UI should offer a role. It is not an
 * enforcement mechanism — the API must check permissions on every request.
 */

import { ROLES } from "../roles";

/** Every permission the system understands, grouped by the module it governs. */
export const PERMISSION_GROUPS = [
  {
    module: "Reservations",
    icon: "bi-journal-text",
    permissions: [
      { id: "booking.view", label: "View reservations" },
      { id: "booking.create", label: "Create reservations" },
      { id: "booking.edit", label: "Modify reservations" },
      { id: "booking.cancel", label: "Cancel reservations" },
      { id: "booking.checkin", label: "Check guests in and out" },
    ],
  },
  {
    module: "Rooms",
    icon: "bi-door-open",
    permissions: [
      { id: "room.view", label: "View rooms" },
      { id: "room.edit", label: "Edit room details" },
      { id: "room.status", label: "Change room status" },
      { id: "room.inspect", label: "Pass rooms at inspection" },
    ],
  },
  {
    module: "Guests & Users",
    icon: "bi-people",
    permissions: [
      { id: "user.view", label: "View users" },
      { id: "user.create", label: "Create users" },
      { id: "user.edit", label: "Edit users" },
      { id: "user.deactivate", label: "Deactivate accounts" },
      { id: "user.roles", label: "Assign roles" },
    ],
  },
  {
    module: "Payments",
    icon: "bi-credit-card",
    permissions: [
      { id: "payment.view", label: "View invoices" },
      { id: "payment.take", label: "Take payment" },
      { id: "payment.refund", label: "Issue refunds" },
    ],
  },
  {
    module: "Service requests",
    icon: "bi-bell",
    permissions: [
      { id: "request.view", label: "View requests" },
      { id: "request.create", label: "Raise requests" },
      { id: "request.assign", label: "Assign to staff" },
      { id: "request.resolve", label: "Complete or cancel requests" },
    ],
  },
  {
    module: "Administration",
    icon: "bi-shield-lock",
    permissions: [
      { id: "admin.reports", label: "View reports" },
      { id: "admin.audit", label: "View audit logs" },
      { id: "admin.settings", label: "Change system settings" },
      { id: "admin.permissions", label: "Manage roles and permissions" },
    ],
  },
];

/** Flat list, for validating an id exists. */
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id),
);

/**
 * What each role can do today.
 *
 * ADMIN holds everything. The rest are deliberately narrow: a receptionist
 * cannot change system settings, and housekeeping cannot see payments.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.GUEST]: ["booking.view", "request.create", "request.view", "payment.view"],

  [ROLES.RECEPTIONIST]: [
    "booking.view", "booking.create", "booking.edit", "booking.cancel", "booking.checkin",
    "room.view", "room.status",
    "user.view",
    "payment.view", "payment.take",
    "request.view", "request.assign",
  ],

  [ROLES.HOUSEKEEPING]: [
    "room.view", "room.status", "room.inspect",
    "request.view", "request.create", "request.resolve",
  ],

  [ROLES.SERVICE_STAFF]: [
    "room.view",
    "request.view", "request.assign", "request.resolve",
    "booking.view",
  ],

  [ROLES.ADMIN]: [...ALL_PERMISSIONS],
};

/** Roles that ship with the product and cannot be deleted. */
export const SYSTEM_ROLES = Object.values(ROLES);

/** Descriptions shown beside each role in the admin screen. */
export const ROLE_DESCRIPTIONS = {
  [ROLES.GUEST]: "Books stays, raises requests and settles their own bills.",
  [ROLES.RECEPTIONIST]: "Runs the front desk: reservations, check-in, check-out and payments.",
  [ROLES.HOUSEKEEPING]: "Cleans and inspects rooms, and reports faults found on the floor.",
  [ROLES.SERVICE_STAFF]: "Works the guest request queue across all service types.",
  [ROLES.ADMIN]: "Full access, including settings, permissions and audit logs.",
};
