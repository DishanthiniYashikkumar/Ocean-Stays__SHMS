/**
 * Mock user, staff and notification fixtures.
 * Mirrors the User / Role / Notification entities.
 */

// Imported from roles.js rather than authService, which imports this file.
import { ROLES } from "../roles";

export const users = [
  {
    id: "usr-guest-01",
    firstName: "Amara",
    lastName: "Perera",
    name: "Amara Perera",
    email: "amara.perera@example.com",
    phone: "+94 77 412 8890",
    role: ROLES.GUEST,
    status: "ACTIVE",
    createdAt: "2024-11-04T09:12:00.000Z",
    lastLoginAt: "2025-08-30T07:41:00.000Z",
  },
  {
    id: "usr-recep-01",
    department: "Front Office",
    firstName: "Dilani",
    lastName: "Rathnayake",
    name: "Dilani Rathnayake",
    email: "reception@oceanstays.com",
    phone: "+94 91 224 5510",
    role: ROLES.RECEPTIONIST,
    status: "ACTIVE",
    createdAt: "2024-02-18T06:00:00.000Z",
    lastLoginAt: "2025-09-01T05:55:00.000Z",
  },
  {
    id: "usr-hk-01",
    department: "Housekeeping",
    firstName: "Kumari",
    lastName: "Silva",
    name: "Kumari Silva",
    email: "housekeeping@oceanstays.com",
    phone: "+94 91 224 5511",
    role: ROLES.HOUSEKEEPING,
    status: "ACTIVE",
    createdAt: "2024-03-02T06:00:00.000Z",
    lastLoginAt: "2025-09-01T04:10:00.000Z",
  },
  {
    id: "usr-hk-02",
    department: "Housekeeping",
    firstName: "Sanduni",
    lastName: "Herath",
    name: "Sanduni Herath",
    email: "sanduni.herath@oceanstays.com",
    phone: "+94 91 224 5512",
    role: ROLES.HOUSEKEEPING,
    status: "ACTIVE",
    createdAt: "2024-06-21T06:00:00.000Z",
    lastLoginAt: "2025-08-31T04:32:00.000Z",
  },
  {
    id: "usr-service-01",
    department: "Guest Services",
    firstName: "Nuwan",
    lastName: "Jayasuriya",
    name: "Nuwan Jayasuriya",
    email: "service@oceanstays.com",
    phone: "+94 91 224 5513",
    role: ROLES.SERVICE_STAFF,
    status: "ACTIVE",
    createdAt: "2024-04-11T06:00:00.000Z",
    lastLoginAt: "2025-09-01T06:20:00.000Z",
  },
  {
    id: "usr-service-02",
    department: "Maintenance",
    firstName: "Ishara",
    lastName: "Bandara",
    name: "Ishara Bandara",
    email: "ishara.bandara@oceanstays.com",
    phone: "+94 91 224 5514",
    role: ROLES.SERVICE_STAFF,
    status: "ACTIVE",
    createdAt: "2024-08-05T06:00:00.000Z",
    lastLoginAt: "2025-08-29T09:02:00.000Z",
  },
  {
    id: "usr-service-03",
    department: "Food & Beverage",
    firstName: "Tharindu",
    lastName: "Alwis",
    name: "Tharindu Alwis",
    email: "tharindu.alwis@oceanstays.com",
    phone: "+94 91 224 5515",
    role: ROLES.SERVICE_STAFF,
    status: "INACTIVE",
    createdAt: "2023-12-09T06:00:00.000Z",
    lastLoginAt: "2025-07-14T11:45:00.000Z",
  },
  {
    id: "usr-admin-01",
    department: "Management",
    firstName: "Rohan",
    lastName: "De Silva",
    name: "Rohan De Silva",
    email: "admin@oceanstays.com",
    phone: "+94 91 224 5500",
    role: ROLES.ADMIN,
    status: "ACTIVE",
    createdAt: "2023-09-01T06:00:00.000Z",
    lastLoginAt: "2025-09-01T03:15:00.000Z",
  },
];

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

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

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const notifications = [
  {
    id: "nt-9001",
    userId: "usr-guest-01",
    type: NOTIFICATION_TYPE.BOOKING,
    title: "You're checked in",
    message: "Welcome to Ocean Stays. Room 201 is ready and your key is active.",
    read: false,
    createdAt: minutesAgo(45),
    link: "/guest/bookings/bk-10241",
  },
  {
    id: "nt-9002",
    userId: "usr-guest-01",
    type: NOTIFICATION_TYPE.SERVICE,
    title: "Room service on its way",
    message: "Your breakfast order is being prepared and will arrive by 08:00.",
    read: false,
    createdAt: minutesAgo(12),
    link: "/guest/requests",
  },
  {
    id: "nt-9003",
    userId: "usr-guest-01",
    type: NOTIFICATION_TYPE.PAYMENT,
    title: "Balance outstanding",
    message: "LKR 128,200 remains on booking OS-10255. Settle any time before arrival.",
    read: false,
    createdAt: minutesAgo(2880),
    link: "/guest/payments",
  },
  {
    id: "nt-9004",
    userId: "usr-guest-01",
    type: NOTIFICATION_TYPE.BOOKING,
    title: "Booking confirmed",
    message: "Coastal Suite reserved for 5 nights. Reference OS-10255.",
    read: true,
    createdAt: minutesAgo(4320),
    link: "/guest/bookings/bk-10255",
  },
  {
    id: "nt-9005",
    userId: "usr-guest-01",
    type: NOTIFICATION_TYPE.SYSTEM,
    title: "New sign-in",
    message: "Your account was accessed from a new device in Colombo.",
    read: true,
    createdAt: minutesAgo(7200),
    link: "/guest/profile",
  },
];
