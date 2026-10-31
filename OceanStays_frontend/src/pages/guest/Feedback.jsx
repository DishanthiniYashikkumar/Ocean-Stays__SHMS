import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getGuestBookings } from "../../services/bookingService";
import {
  FEEDBACK_CATEGORY,
  FEEDBACK_CATEGORY_LABELS,
  submitFeedback,
} from "../../services/feedbackService";
import "../../styles/dashboard.css";

/** Rate a stay and tell us about it. */

const MAX_STARS = 5;
const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Exceptional"];

function Feedback() {
  const { user } = useAuth();
  const toast = useToast();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState(FEEDBACK_CATEGORY.OVERALL);
  const [bookingId, setBookingId] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Offer the guest's real stays to attach the feedback to.
  const loadStays = useCallback(() => getGuestBookings(user.id), [user.id]);
  const { data: stays } = useAsync(loadStays);

  const attachable = [...(stays?.current ?? []), ...(stays?.past ?? [])];
  const shown = hovered || rating;

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    if (!rating) {
      setFormError("Please choose a rating first.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const stay = attachable.find((item) => item.id === bookingId);

      await submitFeedback({
        guestId: user.id,
        guestName: user.name,
        bookingId: stay?.id ?? null,
        bookingReference: stay?.reference ?? null,
        category,
        rating,
        comment: comment.trim(),
      });

      toast.success("Thank you — your feedback goes straight to the team.", {
        title: "Feedback sent",
      });
      setIsSent(true);
    } catch (submitError) {
      setFormError(submitError.message || "We couldn't send that. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSent) {
    return (
      <section className="shms-panel">
        <div className="shms-state" style={{ padding: "var(--space-16) var(--space-6)" }}>
          <span className="shms-state-icon" aria-hidden="true">
            <i className="bi bi-heart" />
          </span>
          <h2 className="shms-state-title">Thank you</h2>
          <p className="shms-state-message">
            Your feedback has reached the team. We read every word, and the things guests tell us
            here are what change how we work.
          </p>
          <div className="shms-state-actions">
            <Link className="shms-btn shms-btn-primary" to="/guest/dashboard">
              Back to dashboard
            </Link>
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => {
                setIsSent(false);
                setRating(0);
                setComment("");
                setBookingId("");
                setCategory(FEEDBACK_CATEGORY.OVERALL);
              }}
            >
              Leave more feedback
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shms-panel" style={{ maxWidth: 720 }}>
      <div className="shms-panel-head">
        <div>
          <h2>How was your stay?</h2>
          <p>Honest feedback is the most useful kind — we publish it either way</p>
        </div>
      </div>

      <div className="shms-panel-body">
        <form className="shms-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="shms-alert" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* --------------------------------------------------- Rating */}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="shms-label" style={{ marginBottom: "var(--space-3)" }}>
              Your rating
            </legend>

            <div
              style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              onMouseLeave={() => setHovered(0)}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: MAX_STARS }, (_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHovered(value)}
                      onFocus={() => setHovered(value)}
                      onBlur={() => setHovered(0)}
                      aria-label={`${value} of ${MAX_STARS} stars`}
                      aria-pressed={rating === value}
                      style={{
                        border: 0,
                        background: "none",
                        padding: 2,
                        fontSize: "1.7rem",
                        lineHeight: 1,
                        cursor: "pointer",
                        color: value <= shown ? "var(--gold-500)" : "var(--line)",
                        transition: "color var(--dur-fast) var(--ease)",
                      }}
                    >
                      <i className={value <= shown ? "bi bi-star-fill" : "bi bi-star"} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--ink)" }}>
                {RATING_WORDS[shown]}
              </span>
            </div>
          </fieldset>

          {/* ------------------------------------------------- Category */}
          <div className="shms-field">
            <label className="shms-label" htmlFor="feedback-category">
              What is this about?
            </label>
            <div className="shms-input-shell">
              <select
                id="feedback-category"
                className="shms-input shms-input-bare"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isSaving}
              >
                {Object.entries(FEEDBACK_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* -------------------------------------------------- Booking */}
          {attachable.length > 0 && (
            <div className="shms-field">
              <label className="shms-label" htmlFor="feedback-booking">
                Which stay?
                <span className="shms-label-optional">optional</span>
              </label>
              <div className="shms-input-shell">
                <select
                  id="feedback-booking"
                  className="shms-input shms-input-bare"
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Not about a specific stay</option>
                  {attachable.map((stay) => (
                    <option key={stay.id} value={stay.id}>
                      {stay.roomTypeName} · {stay.reference}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* -------------------------------------------------- Comment */}
          <div className="shms-field">
            <label className="shms-label" htmlFor="feedback-comment">
              Tell us more
              <span className="shms-label-optional">optional</span>
            </label>
            <div className="shms-input-shell">
              <textarea
                id="feedback-comment"
                className="shms-input shms-input-bare"
                placeholder="What worked, what didn't, and anything we should fix before the next guest arrives."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                disabled={isSaving}
                aria-describedby="feedback-comment-hint"
              />
            </div>
            <p className="shms-field-hint" id="feedback-comment-hint">
              {comment.length} / 1000 characters
            </p>
          </div>

          <button
            type="submit"
            className="shms-submit"
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <span className="shms-spinner" aria-hidden="true" />
                Sending&hellip;
              </>
            ) : (
              <>
                Send feedback
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Feedback;
