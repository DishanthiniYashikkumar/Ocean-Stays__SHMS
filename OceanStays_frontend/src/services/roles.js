/**
 * roles.js
 * -----------------------------------------------------------------------------
 * Roles and RBAC routing.
 *
 * These live apart from authService so that services which need a role constant
 * can import it without depending on the auth module.
 *
 * `authService` re-exports everything here, so existing imports from that
 * module keep working.
 */

export const ROLES = {
  GUEST: "GUEST",
  RECEPTIONIST: "RECEPTIONIST",
  HOUSEKEEPING: "HOUSEKEEPING",
  SERVICE_STAFF: "SERVICE_STAFF",
  ADMIN: "ADMIN",
};

/**
 * Single source of truth for "which dashboard does this role get?".
 * There is ONE login page -- the role returned by the backend picks the route.
 */
export const ROLE_ROUTES = {
  [ROLES.GUEST]: "/guest/dashboard",
  [ROLES.RECEPTIONIST]: "/reception/dashboard",
  [ROLES.HOUSEKEEPING]: "/housekeeping/dashboard",
  [ROLES.SERVICE_STAFF]: "/service/dashboard",
  [ROLES.ADMIN]: "/admin/dashboard",
};

export const ROLE_LABELS = {
  [ROLES.GUEST]: "Guest",
  [ROLES.RECEPTIONIST]: "Receptionist",
  [ROLES.HOUSEKEEPING]: "Housekeeping",
  [ROLES.SERVICE_STAFF]: "Service Staff",
  [ROLES.ADMIN]: "Administrator",
};

/** The database's role names that differ from the app's role constants. */
const ROLES_FROM_DB = { HOUSEKEEPER: ROLES.HOUSEKEEPING };

/** Converts a database role name, e.g. "Housekeeper", to a role constant. */
export function normaliseRole(roleName) {
  const upper = String(roleName ?? "").toUpperCase();
  return ROLES_FROM_DB[upper] ?? upper;
}

/** Maps a role coming off the API to its dashboard path. */
export function getDashboardRoute(role) {
  return ROLE_ROUTES[String(role ?? "").toUpperCase()] ?? "/unauthorized";
}
