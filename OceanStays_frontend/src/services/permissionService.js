/**
 * permissionService.js
 * -----------------------------------------------------------------------------
 * Roles and what each may do.
 *
 * FRONTEND ONLY. Granting a permission here changes what the UI offers; it does
 * not grant anything. The backend must verify the caller's permissions on every
 * request, and must reject a role change from anyone lacking `user.roles`.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { ROLES, ROLE_LABELS } from "./roles";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "./mock/permissions";
import { users } from "./mock/users";

export { PERMISSION_GROUPS, ALL_PERMISSIONS, SYSTEM_ROLES };

/**
 * Every role with its permissions, description and how many users hold it.
 * @returns {Promise<Array<{id, label, description, permissions, userCount, isSystem}>>}
 */
export async function getRoles() {
  if (!USE_MOCK_API) return request("/roles");

  await delay(400);

  return Object.values(ROLES).map((role) => ({
    id: role,
    label: ROLE_LABELS[role] ?? role,
    description: ROLE_DESCRIPTIONS[role] ?? "",
    permissions: clone(ROLE_PERMISSIONS[role] ?? []),
    userCount: users.filter((user) => user.role === role).length,
    isSystem: SYSTEM_ROLES.includes(role),
  }));
}

/** One role's permission ids. */
export async function getRolePermissions(roleId) {
  if (!USE_MOCK_API) return request(`/roles/${roleId}/permissions`);

  await delay(300);
  return clone(ROLE_PERMISSIONS[roleId] ?? []);
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
  if (!USE_MOCK_API) {
    return request(`/roles/${roleId}/permissions`, { method: "PUT", body: { permissions } });
  }

  await delay(700);

  if (roleId === ROLES.ADMIN) {
    throw new Error(
      "The Administrator role always holds every permission and can't be narrowed.",
    );
  }
  if (!ROLE_PERMISSIONS[roleId]) {
    throw new Error("We couldn't find that role.");
  }

  const unknown = permissions.filter((id) => !ALL_PERMISSIONS.includes(id));
  if (unknown.length > 0) {
    throw new Error(`Unknown permission: ${unknown[0]}`);
  }

  ROLE_PERMISSIONS[roleId] = [...permissions];
  return clone(ROLE_PERMISSIONS[roleId]);
}

/** Whether a role holds a permission — for conditional UI. */
export function roleHasPermission(roleId, permissionId) {
  return (ROLE_PERMISSIONS[roleId] ?? []).includes(permissionId);
}
