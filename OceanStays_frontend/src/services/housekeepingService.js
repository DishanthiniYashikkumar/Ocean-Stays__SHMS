/**
 * housekeepingService.js
 * -----------------------------------------------------------------------------
 * Cleaning tasks, room turnaround and maintenance reporting.
 *
 * Room status changes are delegated to roomService so there is a single place
 * where a room's state is written.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import {
  HOUSEKEEPING_TASK_LABELS,
  REQUEST_PRIORITY,
  REQUEST_STATUS,
  REQUEST_TYPE,
  housekeepingTasks,
  serviceRequests,
} from "./mock/requests";
import { ROOM_STATUS, updateRoomStatus } from "./roomService";

export { HOUSEKEEPING_TASK_LABELS, REQUEST_STATUS as TASK_STATUS };

/**
 * The room state a task transition implies. Keeping this mapping here means the
 * UI never has to reason about room status when a cleaner taps "Complete".
 */
const ROOM_STATE_FOR_TASK = {
  [REQUEST_STATUS.IN_PROGRESS]: ROOM_STATUS.CLEANING,
  // Completing a clean does NOT make a room sellable — it makes it CLEAN and
  // awaiting inspection. Only `inspectRoom` releases it.
  [REQUEST_STATUS.COMPLETED]: ROOM_STATUS.CLEAN,
};

/**
 * Lists housekeeping tasks.
 * @param {object} [query] status, assignedToId, floor
 */
export async function getHousekeepingTasks(query = {}) {
  if (!USE_MOCK_API) return request("/housekeeping/tasks", { params: query });

  await delay();
  const { status, assignedToId, floor } = query;

  return clone(
    housekeepingTasks
      .filter((task) => {
        if (status && task.status !== status) return false;
        if (assignedToId && task.assignedToId !== assignedToId) return false;
        if (floor != null && task.floor !== Number(floor)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getTaskById(taskId) {
  if (!USE_MOCK_API) return request(`/housekeeping/tasks/${taskId}`);

  await delay();
  const task = housekeepingTasks.find((t) => t.id === taskId);
  if (!task) throw new Error("We couldn't find that task.");
  return clone(task);
}

/** Counts by status, for the housekeeping dashboard tiles. */
export async function getTaskSummary({ assignedToId } = {}) {
  if (!USE_MOCK_API) return request("/housekeeping/summary", { params: { assignedToId } });

  await delay(350);
  const mine = assignedToId
    ? housekeepingTasks.filter((task) => task.assignedToId === assignedToId)
    : housekeepingTasks;

  const summary = Object.fromEntries(Object.values(REQUEST_STATUS).map((status) => [status, 0]));
  mine.forEach((task) => {
    summary[task.status] += 1;
  });
  return { total: mine.length, ...summary };
}

/**
 * Moves a cleaning task along and syncs the room's status to match.
 * @param {string} taskId
 * @param {string} status One of REQUEST_STATUS
 */
export async function updateTaskStatus(taskId, status) {
  if (!USE_MOCK_API) {
    return request(`/housekeeping/tasks/${taskId}/status`, { method: "PATCH", body: { status } });
  }

  await delay(450);
  const task = housekeepingTasks.find((t) => t.id === taskId);
  if (!task) throw new Error("We couldn't find that task.");

  task.status = status;
  if (status === REQUEST_STATUS.IN_PROGRESS) task.startedAt = new Date().toISOString();
  if (status === REQUEST_STATUS.COMPLETED) task.completedAt = new Date().toISOString();

  const roomState = ROOM_STATE_FOR_TASK[status];
  if (roomState) {
    await updateRoomStatus(task.roomId, roomState);
  }

  return clone(task);
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
  if (!USE_MOCK_API) {
    return request(`/housekeeping/rooms/${roomId}/inspect`, {
      method: "POST",
      body: { passed, note },
    });
  }

  await delay(500);

  // Failing an inspection sends the room back to the cleaning queue.
  return updateRoomStatus(roomId, passed ? ROOM_STATUS.INSPECTED : ROOM_STATUS.DIRTY);
}

/**
 * Raises a maintenance issue from the housekeeping floor. It lands in the same
 * queue the service staff work from.
 */
export async function reportMaintenanceIssue({ roomId, roomNumber, title, details, priority }) {
  if (!USE_MOCK_API) {
    return request("/housekeeping/maintenance", {
      method: "POST",
      body: { roomId, roomNumber, title, details, priority },
    });
  }

  await delay(700);
  const id = `sr-${Math.floor(1000 + Math.random() * 8999)}`;
  const now = new Date().toISOString();

  const created = {
    id,
    reference: `REQ-${id.slice(3)}`,
    type: REQUEST_TYPE.MAINTENANCE,
    title,
    details: details ?? "",
    guestId: null,
    guestName: null,
    bookingId: null,
    roomNumber,
    priority: priority ?? REQUEST_PRIORITY.HIGH,
    status: REQUEST_STATUS.PENDING,
    assignedToId: null,
    assignedToName: null,
    createdAt: now,
    updatedAt: now,
  };

  serviceRequests.unshift(created);
  await updateRoomStatus(roomId, ROOM_STATUS.MAINTENANCE);

  return clone(created);
}
