/**
 * auditService.js
 * -----------------------------------------------------------------------------
 * The audit trail.
 *
 * Deliberately read-only. An audit log that can be edited or deleted from the
 * application that writes it is not evidence of anything, so there is no update
 * or delete function here and the admin screen offers no controls for either.
 * Writing, retention and immutability are the backend's problem.
 */

import { request } from "./apiClient";
import { AUDIT_ACTION, AUDIT_MODULES, AUDIT_RESULT } from "./constants";

export { AUDIT_ACTION, AUDIT_RESULT, AUDIT_MODULES };

/**
 * Lists audit entries, newest first.
 *
 * @param {object} [query]
 * @param {string} [query.search]  Matches actor, entity or summary
 * @param {string} [query.action]
 * @param {string} [query.module]
 * @param {string} [query.result]
 * @param {string} [query.from]    ISO date, inclusive
 * @param {string} [query.to]      ISO date, inclusive
 */
export async function getAuditLogs(query = {}) {
  return request("/admin/audit-logs", { params: query });
}

/** Distinct actors, for the filter dropdown. */
export async function getAuditActors() {
  return request("/admin/audit-logs/actors");
}
