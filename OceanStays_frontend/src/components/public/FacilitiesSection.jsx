import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getFacilities } from "../../services/contentService";
import "../../styles/cards.css";

/** Six facility tiles: image, icon, name, summary and opening hours. */
function FacilitiesSection() {
  const load = useCallback(() => getFacilities(), []);
  const { data: facilities, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section" aria-labelledby="facilities-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Facilities</p>
          <h2 className="shms-heading" id="facilities-title">
            Everything the Coast Should Offer
          </h2>
          <p className="shms-subheading">
            Pools, spa treatments, dining above the water and a concierge desk that never
            closes.
          </p>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : isEmpty ? (
          <EmptyState
            title="Facility details are being updated"
            message="Please check back shortly, or ask us directly."
            icon="bi-buildings"
          />
        ) : isLoading ? (
          <div className="shms-grid shms-grid-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="shms-skeleton"
                style={{ minHeight: 300, borderRadius: "var(--radius-lg)" }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="shms-grid shms-grid-3">
              {facilities.map(({ id, name, icon, summary, image, hours }) => (
                <article key={id} className="shms-facility-card">
                  <img src={image} alt={`${name} at Ocean Stays`} loading="lazy" decoding="async" />

                  <span className="shms-facility-icon" aria-hidden="true">
                    <i className={`bi ${icon}`} />
                  </span>

                  <h3 className="shms-facility-name">{name}</h3>
                  <p className="shms-facility-summary">{summary}</p>

                  <span className="shms-facility-hours">
                    <i className="bi bi-clock" aria-hidden="true" />
                    {hours}
                  </span>
                </article>
              ))}
            </div>

            <div className="shms-section-more">
              <Link className="shms-btn shms-btn-outline shms-btn-lg" to="/facilities">
                All facilities
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default FacilitiesSection;
