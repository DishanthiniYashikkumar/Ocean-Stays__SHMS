import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getTestimonials } from "../../services/contentService";
import "../../styles/cards.css";

/**
 * Guest testimonials on the dark section treatment, which gives the page a
 * pause between the two image-heavy sections either side of it.
 */

const MAX_STARS = 5;

function Stars({ rating }) {
  return (
    <span className="shms-testimonial-stars" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <i
          key={index}
          className={index < rating ? "bi bi-star-fill" : "bi bi-star"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function TestimonialsSection() {
  const load = useCallback(() => getTestimonials(), []);
  const { data: testimonials, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section shms-section-dark" aria-labelledby="testimonials-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Guest Stories</p>
          <h2 className="shms-heading" id="testimonials-title">
            What Guests Say When They Leave
          </h2>
          <p className="shms-subheading">
            Unedited reviews from guests who stayed with us this season.
          </p>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : isEmpty ? (
          <EmptyState
            title="No reviews yet"
            message="Be the first to tell us about your stay."
            icon="bi-chat-quote"
          />
        ) : isLoading ? (
          <div className="shms-grid shms-grid-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="shms-skeleton"
                style={{
                  minHeight: 280,
                  borderRadius: "var(--radius-lg)",
                  background: "rgba(255,255,255,0.07)",
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="shms-grid shms-grid-4">
              {testimonials.map(({ id, name, location, rating, quote, stayedIn, avatar }) => (
                <figure key={id} className="shms-testimonial-card" style={{ margin: 0 }}>
                  <Stars rating={rating} />

                  <blockquote className="shms-testimonial-quote">
                    &ldquo;{quote}&rdquo;
                  </blockquote>

                  <figcaption className="shms-testimonial-author">
                    <img
                      className="shms-testimonial-avatar"
                      src={avatar}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span>
                      <span className="shms-testimonial-name">{name}</span>
                      <span className="shms-testimonial-meta">
                        {location} · {stayedIn}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="shms-section-more">
              <Link className="shms-btn shms-btn-ghost-light shms-btn-lg" to="/testimonials">
                Read more stories
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default TestimonialsSection;
