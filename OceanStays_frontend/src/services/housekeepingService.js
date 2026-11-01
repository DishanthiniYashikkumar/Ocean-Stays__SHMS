/**
 * housekeepingService.js
 * -----------------------------------------------------------------------------
 * Cleaning tasks, room turnaround and maintenance reporting.
 *
 * The backend moves the room's status as a side effect of these task changes.
 */

import { request } from "./apiClient";
import { HOUSEKEEPING_TASK_LABELS, REQUEST_STATUS } from "./constants";

export { HOUSEKEEPING_TASK_LABELS, REQUEST_STATUS as TASK_STATUS };

/**
 * Lists housekeeping tasks.
 * @param {object} [query] status, assignedToId, floor
 */
export async function getHousekeepingTasks(query = {}) {
  return request("/housekeeping/tasks", { params: query });
}

export async function getTaskById(taskId) {
  return request(`/housekeeping/tasks/${taskId}`);
}

/** Counts by status, for the housekeeping dashboard tiles. */
export async function getTaskSummary({ assignedToId } = {}) {
  return request("/housekeeping/summary", { params: { assignedToId } });
}

/**
 * Moves a cleaning task along and syncs the room's status to match.
 * @param {string} taskId
 * @param {string} status One of REQUEST_STATUS
 */
export async function updateTaskStatus(taskId, status) {
  return request(`/housekeeping/tasks/${taskId}/status`, { method: "PATCH", body: { status } });
}

/**
 * Passes a cleaned room at inspection, releasing it back to sellable stock.
 *
 * Separate from completing the task on purpose: a supervisor confirming the
 * room is the last gate before a guest walks into it.
 *
 * @param {string} roomId
 * @param {{ passed: boolean, note?: string }} outcome
 */
export async function inspectRoom(roomId, { passed, note } = { passed: true }) {
  return request(`/housekeeping/rooms/${roomId}/inspect`, {
    method: "POST",
    body: { passed, note },
  });
}

/**
 * Raises a maintenance issue from the housekeeping floor. It lands in the same
 * queue the service staff work from.
 */
export async function reportMaintenanceIssue({ roomId, roomNumber, title, details, priority }) {
  return request("/housekeeping/maintenance", {
    method: "POST",
    body: { roomId, roomNumber, title, details, priority },
  });
}
