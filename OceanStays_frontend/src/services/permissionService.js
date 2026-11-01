/**
 * permissionService.js
 * -----------------------------------------------------------------------------
 * Roles and what each may do.
 *
 * FRONTEND ONLY. Granting a permission here changes what the UI offers; it does
 * not grant anything. The backend must verify the caller's permissions on every
 * request, and must reject a role change from anyone lacking `user.roles`.
 */

import { request } from "./apiClient";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, SYSTEM_ROLES } from "./permissionCatalogue";

export { PERMISSION_GROUPS, ALL_PERMISSIONS, SYSTEM_ROLES };

/**
 * Every role with its permissions, description and how many users hold it.
 * @returns {Promise<Array<{id, label, description, permissions, userCount, isSystem}>>}
 */
export async function getRoles() {
  return request("/roles");
}

/** One role's permission ids. */
export async function getRolePermissions(roleId) {
  return request(`/roles/${roleId}/permissions`);
}

/**
 * Replaces a role's permission set.
 *
 * Administrator is deliberately immutable: an admin who removes their own
 * `admin.permissions` locks everybody out of this screen permanently, and
 * there is no second admin role to recover through.
 *
 * @param {string} roleId
 * @param {string[]} permissions
 */
export async function updateRolePermissions(roleId, permissions) {
  return request(`/roles/${roleId}/permissions`, { method: "PUT", body: { permissions } });
}
