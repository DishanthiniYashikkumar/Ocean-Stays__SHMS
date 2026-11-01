/**
 * notificationService.js
 * -----------------------------------------------------------------------------
 * In-app notifications backing the bell dropdown and the notification centre.
 *
 * Polling is used here rather than websockets so the backend can start with a
 * plain REST endpoint. Swap `subscribe` for a socket listener later without
 * touching the components that consume it.
 */

import { request } from "./apiClient";
import { NOTIFICATION_META, NOTIFICATION_TYPE } from "./constants";

export { NOTIFICATION_META, NOTIFICATION_TYPE };

/** Always empty until the API has a notifications route, so the bell stays quiet. */
export async function getNotifications() {
  return [];
}

export async function getUnreadCount(userId) {
  return request("/notifications/unread-count", { params: { userId } });
}

export async function markAsRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: "POST" });
}

export async function markAllAsRead(userId) {
  return request("/notifications/read-all", { method: "POST", body: { userId } });
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
