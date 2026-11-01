/**
 * feedbackService.js
 * -----------------------------------------------------------------------------
 * Guest feedback about a stay.
 *
 * Kept apart from contentService: that module serves marketing copy, whereas
 * this writes an operational record the admin dashboard reports on.
 */

import { request } from "./apiClient";
import { FEEDBACK_CATEGORY, FEEDBACK_CATEGORY_LABELS } from "./constants";

export { FEEDBACK_CATEGORY, FEEDBACK_CATEGORY_LABELS };

/**
 * Lists feedback, newest first.
 * @param {{ guestId?: string, category?: string }} [query]
 */
export async function getFeedback(query = {}) {
  return request("/feedback", { params: query });
}

/**
 * Records a guest's feedback.
 * @param {{ guestId, guestName, bookingId?, category, rating, comment }} payload
 */
export async function submitFeedback(payload) {
  return request("/feedback", { method: "POST", body: payload });
}
