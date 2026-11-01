/**
 * userService.js
 * -----------------------------------------------------------------------------
 * User and staff directory, profile updates, and the admin dashboard's
 * aggregate statistics.
 *
 * Role changes here are a UI affordance only — the backend must verify that the
 * caller is permitted to grant a role before persisting anything.
 */

import { paginate, request } from "./apiClient";
import { ROLES, ROLE_LABELS, normaliseRole } from "./roles";

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
  const { role, status, search, page, pageSize } = query;
  const data = await request("/guests");
  const term = search?.trim().toLowerCase();

  // /guests is the only user listing the API has, so every row here is a guest.
  // Row order: guest_id, user_id, date_of_birth, gender, nationality, address,
  // identification_type, identification_number, first_name, last_name, email.
  const items = data.guests
    .map((row) => {
      const [firstName, lastName, email] = row.slice(8);

      return {
        id: row[1],
        guestId: row[0],
        firstName,
        lastName,
        name: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
        email,
        phone: "",
        role: ROLES.GUEST,
        status: "ACTIVE",
      };
    })
    .filter((user) => {
      if (role && user.role !== role) return false;
      if (status && user.status !== status) return false;
      return !term || `${user.name} ${user.email}`.toLowerCase().includes(term);
    });

  return paginate(items, { page, pageSize: pageSize ?? 10 });
}

export async function getUserById(userId) {
  return request(`/users/${userId}`);
}

/** Staff available to take an assignment, optionally narrowed by role. */
export async function getStaff(role) {
  const data = await request("/staff");

  return data.staff.map((item) => ({
    id: item.user_id,
    userId: item.user_id,
    name: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.position,
    email: item.email ?? "",
    department: item.department ?? "",
    role: normaliseRole(item.role_name),
    phone: item.phone_number ?? "",
    status: (item.employment_status ?? "Inactive").toUpperCase(),
    createdAt: item.employment_date,
  })).filter((item) => !role || item.role === role);
}

export async function updateProfile(userId, changes) {
  return request(`/users/${userId}`, { method: "PATCH", body: changes });
}

export async function updateUserStatus(userId, status) {
  return request(`/users/${userId}/status`, { method: "PATCH", body: { status } });
}

/* -------------------------------------------------------------------------- */
/* Admin dashboard statistics                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Headline numbers for the admin overview.
 * The backend will compute these; the shape is what the UI binds to.
 */
export async function getDashboardStats() {
  return request("/admin/stats");
}

/**
 * Time series for the admin charts. Deterministic shape, so swapping in real
 * aggregates later needs no chart changes.
 */
export async function getDashboardTrends() {
  return request("/admin/trends");
}
