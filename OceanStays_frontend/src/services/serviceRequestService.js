/**
 * serviceRequestService.js
 * -----------------------------------------------------------------------------
 * Guest-raised requests: room service, dining, transport, maintenance and
 * housekeeping asks. Consumed by the guest portal and the service staff queue.
 */

import { request } from "./apiClient";
import { REQUEST_PRIORITY, REQUEST_STATUS, REQUEST_TYPE, REQUEST_TYPE_META } from "./constants";

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
  return request("/service-requests", { params: query });
}

export async function getServiceRequestById(requestId) {
  return request(`/service-requests/${requestId}`);
}

/** Counts by status, for the service staff dashboard tiles. */
export async function getRequestSummary() {
  return request("/service-requests/summary");
}

/**
 * Raises a new request from the guest portal.
 * @param {{type, title, details, guestId, guestName, bookingId, roomNumber, priority}} payload
 */
export async function createServiceRequest(payload) {
  return request("/service-requests", { method: "POST", body: payload });
}

/** Moves a request along its workflow. */
export async function updateRequestStatus(requestId, status) {
  return request(`/service-requests/${requestId}/status`, { method: "PATCH", body: { status } });
}

/** Assigns a request to a staff member and advances it out of PENDING. */
export async function assignRequest(requestId, { staffId }) {
  return request(`/service-requests/${requestId}/assign`, { method: "POST", body: { staffId } });
}

export async function cancelServiceRequest(requestId) {
  return updateRequestStatus(requestId, REQUEST_STATUS.CANCELLED);
}
