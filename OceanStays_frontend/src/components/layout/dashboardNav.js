/**
 * dashboardNav.js
 * -----------------------------------------------------------------------------
 * Sidebar navigation AND topbar headings for each role, in one place.
 *
 * The heading shown in the topbar is derived from the same entry that renders
 * the sidebar link, so a route can never appear in the nav with one name and in
 * the heading with another. Phases 8-10 add their sections here rather than
 * editing the shell components.
 *
 * A plain module (no components) so it stays Fast Refresh friendly.
 */

import { ROLES } from "../../services/roles";

/* -------------------------------------------------------------------------- */
/* Guest                                                                      */
/* -------------------------------------------------------------------------- */

const GUEST_NAV = {
  notificationsPath: "/guest/notifications",
  profilePath: "/guest/profile",
  sections: [
    {
      legend: "Your stay",
      items: [
        {
          to: "/guest/dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          subtitle: "Your stay at a glance",
          end: true,
        },
        {
          to: "/guest/bookings",
          label: "My Bookings",
          icon: "bi-calendar2-check",
          subtitle: "Current, upcoming and past stays",
        },
        {
          to: "/guest/requests",
          label: "Service Requests",
          icon: "bi-bell",
          subtitle: "Anything you need, we'll arrange",
        },
      ],
    },
    {
      legend: "Account",
      items: [
        {
          to: "/guest/payments",
          label: "Payments & Bills",
          icon: "bi-credit-card",
          subtitle: "Invoices and outstanding balances",
        },
        {
          to: "/guest/notifications",
          label: "Notifications",
          icon: "bi-inbox",
          subtitle: "Updates about your stay",
        },
        {
          to: "/guest/feedback",
          label: "Give Feedback",
          icon: "bi-chat-quote",
          subtitle: "Tell us how we did",
        },
        {
          to: "/guest/profile",
          label: "Profile",
          icon: "bi-person-gear",
          subtitle: "Your details and preferences",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Receptionist                                                               */
/* -------------------------------------------------------------------------- */

const RECEPTION_NAV = {
  // Reception works from the live queues rather than a notification archive,
  // and staff accounts are managed by an administrator, so neither the bell's
  // "view all" nor the account chip has a destination for this role.
  notificationsPath: null,
  profilePath: null,
  sections: [
    {
      legend: "Front desk",
      items: [
        {
          to: "/reception/dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          subtitle: "Today at the front desk",
          end: true,
        },
        {
          to: "/reception/reservations",
          label: "Reservations",
          icon: "bi-journal-text",
          subtitle: "Every booking, past and future",
        },
        {
          to: "/reception/check-in",
          label: "Check-in",
          icon: "bi-box-arrow-in-right",
          subtitle: "Today's arrivals",
        },
        {
          to: "/reception/check-out",
          label: "Check-out",
          icon: "bi-box-arrow-right",
          subtitle: "Today's departures",
        },
        {
          to: "/reception/rooms",
          label: "Room Allocation",
          icon: "bi-grid-3x3-gap",
          subtitle: "Room status across the property",
        },
      ],
    },
    {
      legend: "Manage",
      items: [
        {
          to: "/reception/guests",
          label: "Guests",
          icon: "bi-people",
          subtitle: "Guest directory and stay history",
        },
        {
          to: "/reception/payments",
          label: "Payments",
          icon: "bi-credit-card",
          subtitle: "Invoices and outstanding balances",
        },
        {
          to: "/reception/requests",
          label: "Requests",
          icon: "bi-bell",
          subtitle: "Guest requests to assign and track",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Housekeeping                                                               */
/* -------------------------------------------------------------------------- */

const HOUSEKEEPING_NAV = {
  notificationsPath: null,
  profilePath: null,
  sections: [
    {
      legend: "Today",
      items: [
        {
          to: "/housekeeping/dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          subtitle: "Your rooms and the property turnaround",
          end: true,
        },
        {
          to: "/housekeeping/tasks",
          label: "Cleaning Tasks",
          icon: "bi-list-check",
          subtitle: "Start and complete your rooms",
        },
        {
          to: "/housekeeping/rooms",
          label: "Assigned Rooms",
          icon: "bi-grid-3x3-gap",
          subtitle: "Inspect and release rooms back to stock",
        },
      ],
    },
    {
      legend: "Reported",
      items: [
        {
          to: "/housekeeping/requests",
          label: "Guest Requests",
          icon: "bi-bell",
          subtitle: "Towels, linen and anything else asked for",
        },
        {
          to: "/housekeeping/maintenance",
          label: "Maintenance",
          icon: "bi-tools",
          subtitle: "Faults found on the floor",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Service staff                                                              */
/* -------------------------------------------------------------------------- */

const SERVICE_NAV = {
  notificationsPath: null,
  profilePath: null,
  sections: [
    {
      legend: "Queue",
      items: [
        {
          to: "/service/dashboard",
          label: "Dashboard",
          icon: "bi-speedometer2",
          subtitle: "Your work and what's waiting",
          end: true,
        },
        {
          to: "/service/requests",
          label: "Guest Requests",
          icon: "bi-bell",
          subtitle: "Every request, whatever the type",
        },
      ],
    },
    {
      legend: "By type",
      items: [
        {
          to: "/service/room-service",
          label: "Room Service",
          icon: "bi-cup-hot",
          subtitle: "Food and drink to a room",
        },
        {
          to: "/service/dining",
          label: "Dining",
          icon: "bi-egg-fried",
          subtitle: "Restaurant bookings and dietary needs",
        },
        {
          to: "/service/transport",
          label: "Transport",
          icon: "bi-car-front",
          subtitle: "Transfers, excursions and pickups",
        },
        {
          to: "/service/maintenance",
          label: "Maintenance",
          icon: "bi-tools",
          subtitle: "Faults reported from the floor",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Administrator                                                              */
/* -------------------------------------------------------------------------- */

const ADMIN_NAV = {
  notificationsPath: "/admin/notifications",
  profilePath: null,
  sections: [
    {
      legend: "Overview",
      items: [
        {
          to: "/admin",
          label: "Dashboard",
          icon: "bi-speedometer2",
          subtitle: "Occupancy, revenue and what needs attention",
          end: true,
        },
        {
          to: "/admin/reports",
          label: "Reports",
          icon: "bi-graph-up",
          subtitle: "Occupancy, revenue, reservations and requests",
        },
      ],
    },
    {
      legend: "Operations",
      items: [
        {
          to: "/admin/reservations",
          label: "Reservations",
          icon: "bi-journal-text",
          subtitle: "Every booking on record",
        },
        {
          to: "/admin/rooms",
          label: "Rooms",
          icon: "bi-door-open",
          subtitle: "Inventory, rates and status",
        },
        {
          to: "/admin/facilities",
          label: "Facilities",
          icon: "bi-buildings",
          subtitle: "What's open and who runs it",
        },
        {
          to: "/admin/payments",
          label: "Payments",
          icon: "bi-credit-card",
          subtitle: "Invoices and outstanding balances",
        },
      ],
    },
    {
      legend: "People",
      items: [
        {
          to: "/admin/users",
          label: "Users",
          icon: "bi-people",
          subtitle: "Every account on the system",
        },
        {
          to: "/admin/staff",
          label: "Staff",
          icon: "bi-person-badge",
          subtitle: "Directory, departments and workload",
        },
        {
          to: "/admin/roles",
          label: "Roles & Permissions",
          icon: "bi-shield-lock",
          subtitle: "What each role is allowed to do",
        },
      ],
    },
    {
      legend: "System",
      items: [
        {
          to: "/admin/notifications",
          label: "Notifications",
          icon: "bi-inbox",
          subtitle: "Everything the system has sent",
        },
        {
          to: "/admin/audit-logs",
          label: "Audit Logs",
          icon: "bi-clock-history",
          subtitle: "Read-only record of every action",
        },
        {
          to: "/admin/settings",
          label: "Settings",
          icon: "bi-gear",
          subtitle: "Hotel details, policy and notifications",
        },
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

/** Fallback for a role with no navigation of its own. */
const EMPTY_NAV = { notificationsPath: null, profilePath: null, sections: [] };

export const NAV_BY_ROLE = {
  [ROLES.GUEST]: GUEST_NAV,
  [ROLES.RECEPTIONIST]: RECEPTION_NAV,
  [ROLES.HOUSEKEEPING]: HOUSEKEEPING_NAV,
  [ROLES.SERVICE_STAFF]: SERVICE_NAV,
  [ROLES.ADMIN]: ADMIN_NAV,
};

function navFor(role) {
  return NAV_BY_ROLE[role] ?? EMPTY_NAV;
}

/** Sidebar sections for a role. */
export function getNavForRole(role) {
  return navFor(role).sections;
}

/** Where the notification bell's "view all" goes, or null to hide it. */
export function getNotificationsPath(role) {
  return navFor(role).notificationsPath;
}

/** Where the topbar account chip goes, or null to render it as plain text. */
export function getProfilePath(role) {
  return navFor(role).profilePath;
}

/**
 * The topbar heading for a route.
 *
 * Falls back to the closest parent section, so detail routes like
 * /guest/bookings/bk-10241 inherit "My Bookings" rather than going blank.
 */
export function resolveHeading(role, pathname) {
  const items = navFor(role).sections.flatMap((section) => section.items);

  const exact = items.find((item) => item.to === pathname);
  if (exact) return { title: exact.label, subtitle: exact.subtitle ?? "" };

  const parent = items
    .filter((item) => pathname.startsWith(`${item.to}/`))
    // Longest match wins, so a nested route picks the most specific parent.
    .sort((a, b) => b.to.length - a.to.length)[0];

  if (parent) return { title: parent.label, subtitle: parent.subtitle ?? "" };

  return { title: "Ocean Stays", subtitle: "" };
}
