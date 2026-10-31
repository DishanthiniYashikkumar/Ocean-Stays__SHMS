/**
 * auditService.js
 * -----------------------------------------------------------------------------
 * The audit trail.
 *
 * Deliberately read-only apart from `record`. An audit log that can be edited or
 * deleted from the application that writes it is not evidence of anything, so
 * there is no update or delete function here and the admin screen offers no
 * controls for either. Retention and immutability are the backend's problem.
 */

import { USE_MOCK_API, clone, delay, paginate, request } from "./apiClient";
import { AUDIT_ACTION, AUDIT_MODULES, AUDIT_RESULT, auditLogs } from "./mock/audit";

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
  if (!USE_MOCK_API) return request("/admin/audit-logs", { params: query });

  await delay();
  const { search, action, module, result, from, to, page, pageSize } = query;
  const term = search?.trim().toLowerCase();

  const filtered = auditLogs.filter((entry) => {
    if (action && entry.action !== action) return false;
    if (module && entry.module !== module) return false;
    if (result && entry.result !== result) return false;

    const day = entry.timestamp.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;

    if (term) {
      const haystack =
        `${entry.actorName} ${entry.entity} ${entry.summary} ${entry.module}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return paginate(filtered, { page, pageSize: pageSize ?? 200 });
}

/** Distinct actors, for the filter dropdown. */
export async function getAuditActors() {
  if (!USE_MOCK_API) return request("/admin/audit-logs/actors");

  await delay(200);
  const seen = new Map();
  auditLogs.forEach((entry) => {
    if (entry.actorId && !seen.has(entry.actorId)) {
      seen.set(entry.actorId, { id: entry.actorId, name: entry.actorName });
    }
  });
  return [...seen.values()];
}

/**
 * Appends an entry.
 *
 * In production the backend writes these as a side effect of the action itself
 * — a client that decides what to log can also decide not to. This exists so
 * the mock trail grows as you use the app.
 */
export async function record({ actor, action, module, entity, summary, result }) {
  if (!USE_MOCK_API) return null; // the API writes its own trail

  const entry = {
    id: `al-${Math.floor(7000 + Math.random() * 2999)}`,
    timestamp: new Date().toISOString(),
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "System",
    actorRole: actor?.role ?? null,
    action,
    module,
    entity,
    summary,
    result: result ?? AUDIT_RESULT.SUCCESS,
    ip: "10.0.4.2",
  };

  auditLogs.unshift(entry);
  return clone(entry);
}
