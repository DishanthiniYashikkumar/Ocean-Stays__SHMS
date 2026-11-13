import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getTestimonials } from "../../services/contentService";
import StarRating from "../../components/common/StarRating";
import PageHeader from "../../components/common/PageHeader";
import { initials } from "../../utils/format";
import "../../styles/cards.css";

/** Guest stories, with an aggregate rating summary above them. */



function Testimonials() {
  const load = useCallback(() => getTestimonials(), []);
  const { data: testimonials, isLoading, error, isEmpty, reload } = useAsync(load);

  const average = useMemo(() => {
    if (!testimonials?.length) return 0;
    const total = testimonials.reduce((sum, item) => sum + item.rating, 0);
    return total / testimonials.length;
  }, [testimonials]);

  return (
    <>
      <PageHeader title="Guest Stories">
        Unedited reviews from guests who stayed with us. We publish every one we receive,
        whatever it says.
      </PageHeader>

      <section className="shms-section">
        <div className="shms-container">
          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : isEmpty ? (
            <EmptyState
              title="No reviews yet"
              message="Be the first to tell us about your stay at Ocean Stays."
              icon="bi-chat-quote"
            >
              <Link className="shms-btn shms-btn-primary" to="/rooms">
                Book your stay
              </Link>
            </EmptyState>
          ) : isLoading ? (
            <div className="shms-grid shms-grid-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="shms-skeleton"
                  style={{ minHeight: 240, borderRadius: "var(--radius-lg)" }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="shms-rating-summary">
                <div className="shms-rating-score">
                  <strong>{average.toFixed(1)}</strong>
                  <StarRating rating={average} className="shms-testimonial-stars" />
                  <span>Average guest rating</span>
                </div>

                <div className="shms-rating-divider" aria-hidden="true" />

                <div className="shms-rating-facts">
                  <div className="shms-rating-fact">
                    <strong>{testimonials.length}</strong>
                    <span>Reviews</span>
                  </div>
                  <div className="shms-rating-fact">
                    <strong>
                      {Math.round(
                        (testimonials.filter((item) => item.rating >= 4).length /
                          testimonials.length) *
                          100,
                      )}
                      %
                    </strong>
                    <span>Rated 4+</span>
                  </div>
                  <div className="shms-rating-fact">
                    <strong>92%</strong>
                    <span>Would return</span>
                  </div>
                </div>
              </div>

              <div className="shms-grid shms-grid-2">
                {testimonials.map(({ id, name, location, rating, quote, stayedIn, avatar }) => (
                  <figure
                    key={id}
                    className="shms-testimonial-card shms-testimonial-light"
                    style={{ margin: 0 }}
                  >
                    <StarRating rating={rating} className="shms-testimonial-stars" />

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
                          {location} · Stayed in {stayedIn}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default Testimonials;
