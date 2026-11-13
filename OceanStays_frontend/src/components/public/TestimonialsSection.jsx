import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getTestimonials } from "../../services/contentService";
import StarRating from "../../components/common/StarRating";
import { initials } from "../../utils/format";
import "../../styles/cards.css";

/**
 * Guest testimonials on the dark section treatment, which gives the page a
 * pause between the two image-heavy sections either side of it.
 */



function TestimonialsSection() {
  const load = useCallback(() => getTestimonials(), []);
  const { data: testimonials, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section shms-section-dark shms-wave-top" aria-labelledby="testimonials-title">
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
                  <StarRating rating={rating} round={false} className="shms-testimonial-stars" />

                  <blockquote className="shms-testimonial-quote">
                    &ldquo;{quote}&rdquo;
                  </blockquote>

                  <figcaption className="shms-testimonial-author">
                    {avatar ? (
                      <img
                        className="shms-testimonial-avatar"
                        src={avatar}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="shms-testimonial-avatar shms-testimonial-initials" aria-hidden="true">
                        {initials(name)}
                      </span>
                    )}
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
