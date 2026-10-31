/**
 * serviceRequestService.js
 * -----------------------------------------------------------------------------
 * Guest-raised requests: room service, dining, transport, maintenance and
 * housekeeping asks. Consumed by the guest portal and the service staff queue.
 */

import { USE_MOCK_API, clone, delay, paginate, request } from "./apiClient";
import {
  REQUEST_PRIORITY,
  REQUEST_STATUS,
  REQUEST_TYPE,
  REQUEST_TYPE_META,
  serviceRequests,
} from "./mock/requests";

export { REQUEST_PRIORITY, REQUEST_STATUS, REQUEST_TYPE, REQUEST_TYPE_META };

/** Statuses a request can move to from its current one. */
export const NEXT_STATUSES = {
  [REQUEST_STATUS.PENDING]: [REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.ASSIGNED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
};

/**
 * Lists service requests.
 * @param {object} [query] status, type, priority, guestId, assignedToId, search, page
 */
export async function getServiceRequests(query = {}) {
  if (!USE_MOCK_API) return request("/service-requests", { params: query });

  await delay();
  const { status, type, priority, guestId, assignedToId, search, page, pageSize } = query;
  const term = search?.trim().toLowerCase();

  const filtered = serviceRequests.filter((item) => {
    if (status && item.status !== status) return false;
    if (type && item.type !== type) return false;
    if (priority && item.priority !== priority) return false;
    if (guestId && item.guestId !== guestId) return false;
    if (assignedToId && item.assignedToId !== assignedToId) return false;
    if (term) {
      const haystack =
        `${item.reference} ${item.title} ${item.guestName ?? ""} ${item.roomNumber ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(filtered, { page, pageSize: pageSize ?? 10 });
}

export async function getServiceRequestById(requestId) {
  if (!USE_MOCK_API) return request(`/service-requests/${requestId}`);

  await delay();
  const found = serviceRequests.find((item) => item.id === requestId);
  if (!found) throw new Error("We couldn't find that request.");
  return clone(found);
}

/** Counts by status, for the service staff dashboard tiles. */
export async function getRequestSummary() {
  if (!USE_MOCK_API) return request("/service-requests/summary");

  await delay(350);
  const summary = Object.fromEntries(Object.values(REQUEST_STATUS).map((status) => [status, 0]));
  serviceRequests.forEach((item) => {
    summary[item.status] += 1;
  });
  return { total: serviceRequests.length, ...summary };
}

/**
 * Raises a new request from the guest portal.
 * @param {{type, title, details, guestId, guestName, bookingId, roomNumber, priority}} payload
 */
export async function createServiceRequest(payload) {
  if (!USE_MOCK_API) return request("/service-requests", { method: "POST", body: payload });

  await delay(800);
  const id = `sr-${Math.floor(1000 + Math.random() * 8999)}`;
  const now = new Date().toISOString();

  const created = {
    id,
    reference: `REQ-${id.slice(3)}`,
    type: payload.type,
    title: payload.title,
    details: payload.details ?? "",
    guestId: payload.guestId ?? null,
    guestName: payload.guestName ?? null,
    bookingId: payload.bookingId ?? null,
    roomNumber: payload.roomNumber ?? null,
    priority: payload.priority ?? REQUEST_PRIORITY.NORMAL,
    status: REQUEST_STATUS.PENDING,
    assignedToId: null,
    assignedToName: null,
    createdAt: now,
    updatedAt: now,
  };

  serviceRequests.unshift(created);
  return clone(created);
}

/** Moves a request along its workflow. */
export async function updateRequestStatus(requestId, status) {
  if (!USE_MOCK_API) {
    return request(`/service-requests/${requestId}/status`, { method: "PATCH", body: { status } });
  }

  await delay(500);
  const found = serviceRequests.find((item) => item.id === requestId);
  if (!found) throw new Error("We couldn't find that request.");

  found.status = status;
  found.updatedAt = new Date().toISOString();
  return clone(found);
}

/** Assigns a request to a staff member and advances it out of PENDING. */
export async function assignRequest(requestId, { staffId, staffName }) {
  if (!USE_MOCK_API) {
    return request(`/service-requests/${requestId}/assign`, { method: "POST", body: { staffId } });
  }

  await delay(500);
  const found = serviceRequests.find((item) => item.id === requestId);
  if (!found) throw new Error("We couldn't find that request.");

  Object.assign(found, {
    assignedToId: staffId,
    assignedToName: staffName,
    status: REQUEST_STATUS.ASSIGNED,
    updatedAt: new Date().toISOString(),
  });
  return clone(found);
}

export async function cancelServiceRequest(requestId) {
  return updateRequestStatus(requestId, REQUEST_STATUS.CANCELLED);
}
