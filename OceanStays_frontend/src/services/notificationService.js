/**
 * notificationService.js
 * -----------------------------------------------------------------------------
 * In-app notifications backing the bell dropdown and the notification centre.
 *
 * Polling is used here rather than websockets so the backend can start with a
 * plain REST endpoint. Swap `subscribe` for a socket listener later without
 * touching the components that consume it.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { NOTIFICATION_META, NOTIFICATION_TYPE, notifications } from "./mock/users";

export { NOTIFICATION_META, NOTIFICATION_TYPE };

/** Newest first, optionally only unread. */
export async function getNotifications({ userId, unreadOnly = false } = {}) {
  if (!USE_MOCK_API) return [];

  await delay(400);
  return clone(
    notifications
      .filter((item) => {
        if (userId && item.userId !== userId) return false;
        if (unreadOnly && item.read) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getUnreadCount(userId) {
  if (!USE_MOCK_API) return request("/notifications/unread-count", { params: { userId } });

  await delay(250);
  return notifications.filter((item) => item.userId === userId && !item.read).length;
}

export async function markAsRead(notificationId) {
  if (!USE_MOCK_API) return request(`/notifications/${notificationId}/read`, { method: "POST" });

  await delay(200);
  const found = notifications.find((item) => item.id === notificationId);
  if (found) found.read = true;
  return clone(found ?? null);
}

export async function markAllAsRead(userId) {
  if (!USE_MOCK_API) return request("/notifications/read-all", { method: "POST", body: { userId } });

  await delay(400);
  notifications.forEach((item) => {
    if (item.userId === userId) item.read = true;
  });
  return { updated: true };
}

/**
 * Polls for new notifications.
 *
 * @param {string} userId
 * @param {(items: Array) => void} onUpdate
 * @param {number} [intervalMs=30000]
 * @returns {() => void} unsubscribe
 */
export function subscribe(userId, onUpdate, intervalMs = 30_000) {
  let cancelled = false;

  async function poll() {
    if (cancelled) return;
    try {
      const items = await getNotifications({ userId });
      if (!cancelled) onUpdate(items);
    } catch {
      // A failed poll is not worth surfacing — the next tick will retry.
    }
  }

  poll();
  const timer = setInterval(poll, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
