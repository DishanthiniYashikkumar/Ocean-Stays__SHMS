/**
 * feedbackService.js
 * -----------------------------------------------------------------------------
 * Guest feedback about a stay.
 *
 * Kept apart from contentService: that module serves marketing copy, whereas
 * this writes an operational record the admin dashboard reports on.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { FEEDBACK_CATEGORY, FEEDBACK_CATEGORY_LABELS, feedback } from "./mock/feedback";

export { FEEDBACK_CATEGORY, FEEDBACK_CATEGORY_LABELS };

/**
 * Lists feedback, newest first.
 * @param {{ guestId?: string, category?: string }} [query]
 */
export async function getFeedback(query = {}) {
  if (!USE_MOCK_API) return request("/feedback", { params: query });

  await delay();
  const { guestId, category } = query;

  return clone(
    feedback
      .filter((item) => {
        if (guestId && item.guestId !== guestId) return false;
        if (category && item.category !== category) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

/**
 * Records a guest's feedback.
 * @param {{ guestId, guestName, bookingId?, category, rating, comment }} payload
 */
export async function submitFeedback(payload) {
  if (!USE_MOCK_API) return request("/feedback", { method: "POST", body: payload });

  await delay(900);

  if (!payload.rating) {
    throw new Error("Please choose a rating before sending your feedback.");
  }

  const created = {
    id: `fb-${Math.floor(4000 + Math.random() * 5999)}`,
    guestId: payload.guestId ?? null,
    guestName: payload.guestName ?? "Guest",
    bookingId: payload.bookingId ?? null,
    bookingReference: payload.bookingReference ?? null,
    category: payload.category ?? FEEDBACK_CATEGORY.OVERALL,
    rating: payload.rating,
    comment: payload.comment ?? "",
    createdAt: new Date().toISOString(),
  };

  feedback.unshift(created);
  return clone(created);
}
