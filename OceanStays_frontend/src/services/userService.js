/**
 * userService.js
 * -----------------------------------------------------------------------------
 * User and staff directory, profile updates, and the admin dashboard's
 * aggregate statistics.
 *
 * Role changes here are a UI affordance only — the backend must verify that the
 * caller is permitted to grant a role before persisting anything.
 */

import { USE_MOCK_API, clone, delay, paginate, request } from "./apiClient";
import { ROLES, ROLE_LABELS } from "./authService";
import { users } from "./mock/users";
import { bookings, BOOKING_STATUS, PAYMENT_STATUS } from "./mock/bookings";
import { rooms, ROOM_STATUS, SELLABLE_STATUSES } from "./mock/rooms";
import { serviceRequests, REQUEST_STATUS } from "./mock/requests";

export { ROLES, ROLE_LABELS };

/** Roles that represent staff rather than guests. */
export const STAFF_ROLES = [
  ROLES.RECEPTIONIST,
  ROLES.HOUSEKEEPING,
  ROLES.SERVICE_STAFF,
  ROLES.ADMIN,
];

/**
 * Lists users with filtering and pagination.
 * @param {object} [query] role, status, search, page, pageSize
 */
export async function getUsers(query = {}) {
  if (!USE_MOCK_API) return request("/guests", { params: query });

  await delay();
  const { role, status, search, page, pageSize } = query;
  const term = search?.trim().toLowerCase();

  const filtered = users.filter((user) => {
    if (role && user.role !== role) return false;
    if (status && user.status !== status) return false;
    if (term) {
      const haystack = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  return paginate(filtered, { page, pageSize: pageSize ?? 10 });
}

export async function getUserById(userId) {
  if (!USE_MOCK_API) return request(`/users/${userId}`);

  await delay();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("We couldn't find that user.");
  return clone(user);
}

/** Staff available to take an assignment, optionally narrowed by role. */
export async function getStaff(role) {
  if (!USE_MOCK_API) {
    const data = await request("/staff");

    return data.staff.map((item) => ({
      id: item.user_id,
      userId: item.user_id,
      name: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.position,
      email: item.email ?? "",
      department: item.department ?? "",
      role: item.role_name,
      phone: item.phone_number ?? "",
      status: (item.employment_status ?? "Inactive").toUpperCase(),
      createdAt: item.employment_date,
    })).filter((item) => !role || item.role === role);
  }

  await delay(400);

  return clone(
    users.filter(
      (user) =>
        STAFF_ROLES.includes(user.role) &&
        user.status === "ACTIVE" &&
        (!role || user.role === role),
    ),
  );
}
  



export async function updateProfile(userId, changes) {
  if (!USE_MOCK_API) return request(`/users/${userId}`, { method: "PATCH", body: changes });

  await delay(700);
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("We couldn't find that user.");

  Object.assign(user, changes);
  user.name = `${user.firstName} ${user.lastName}`.trim();
  return clone(user);
}

export async function updateUserStatus(userId, status) {
  if (!USE_MOCK_API) {
    return request(`/users/${userId}/status`, { method: "PATCH", body: { status } });
  }

  await delay(500);
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("We couldn't find that user.");

  user.status = status;
  return clone(user);
}

/* -------------------------------------------------------------------------- */
/* Admin dashboard statistics                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Headline numbers for the admin overview.
 * The backend will compute these; the shape is what the UI binds to.
 */
export async function getDashboardStats() {
  if (!USE_MOCK_API) return request("/admin/stats");

  await delay(600);
  const today = new Date().toISOString().slice(0, 10);

  const revenue = bookings
    .filter((b) => b.paymentStatus === PAYMENT_STATUS.PAID)
    .reduce((sum, b) => sum + b.total, 0);

  return {
    totalRooms: rooms.length,
    availableRooms: rooms.filter((r) =>
      SELLABLE_STATUSES.includes(r.status),
    ).length,
    occupiedRooms: rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length,
    cleaningRooms: rooms.filter((r) => r.status === ROOM_STATUS.CLEANING).length,
    maintenanceRooms: rooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE).length,
    checkInsToday: bookings.filter((b) => b.checkIn === today).length,
    checkOutsToday: bookings.filter((b) => b.checkOut === today).length,
    totalBookings: bookings.length,
    activeBookings: bookings.filter((b) =>
      [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN].includes(b.status),
    ).length,
    pendingRequests: serviceRequests.filter((r) =>
      [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED].includes(r.status),
    ).length,
    revenue,
    currency: "LKR",
    occupancyRate: Math.round(
      (rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length / rooms.length) * 100,
    ),
  };
}

/**
 * Time series for the admin charts. Deterministic shape, so swapping in real
 * aggregates later needs no chart changes.
 */
export async function getDashboardTrends() {
  if (!USE_MOCK_API) return request("/admin/trends");

  await delay(700);
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  return {
    occupancy: months.map((month, index) => ({
      month,
      rate: [62, 68, 74, 81, 88, 79][index],
    })),
    revenue: months.map((month, index) => ({
      month,
      amount: [4_120_000, 4_680_000, 5_240_000, 6_010_000, 7_150_000, 6_380_000][index],
    })),
    bookingsByChannel: [
      { channel: "Direct", count: 148 },
      { channel: "OTA", count: 212 },
      { channel: "Corporate", count: 64 },
      { channel: "Walk-in", count: 31 },
    ],
    roomTypePerformance: [
      { name: "Ocean Deluxe", bookings: 132, revenue: 2_442_000 },
      { name: "Coastal Suite", bookings: 88, revenue: 2_816_000 },
      { name: "Garden Villa", bookings: 54, revenue: 2_484_000 },
      { name: "Harbour Twin", bookings: 121, revenue: 1_512_500 },
      { name: "Lagoon Double", bookings: 164, revenue: 1_607_200 },
    ],
  };
}
