import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getFacilities } from "../../services/contentService";
import "../../styles/cards.css";

/** Full facilities listing. */
function Facilities() {
  const load = useCallback(() => getFacilities(), []);
  const { data: facilities, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <>
      <header className="shms-page-head">
        <div className="shms-container">
          <ul className="shms-breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Facilities</li>
          </ul>

          <h1>Facilities</h1>
          <span className="shms-rule-gold" />
          <p>
            Two pools, a spa in the gardens, dining above the water and a concierge desk that
            never closes.
          </p>
        </div>
      </header>

      <section className="shms-section">
        <div className="shms-container">
          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : isEmpty ? (
            <EmptyState
              title="Facility details are being updated"
              message="Please check back shortly, or ask our team directly."
              icon="bi-buildings"
            >
              <Link className="shms-btn shms-btn-outline" to="/contact">
                Contact us
              </Link>
            </EmptyState>
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
            <div className="shms-grid shms-grid-3">
              {facilities.map(({ id, name, icon, summary, image, hours }) => (
                <article key={id} className="shms-facility-card">
                  <img src={image} alt={`${name} at Ocean Stays`} loading="lazy" decoding="async" />

                  <span className="shms-facility-icon" aria-hidden="true">
                    <i className={`bi ${icon}`} />
                  </span>

                  <h2 className="shms-facility-name">{name}</h2>
                  <p className="shms-facility-summary">{summary}</p>

                  <span className="shms-facility-hours">
                    <i className="bi bi-clock" aria-hidden="true" />
                    {hours}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="shms-section shms-section-alt shms-section-tight">
        <div className="shms-container">
          <div className="shms-section-head shms-section-head-center" style={{ marginBottom: 0 }}>
            <h2 className="shms-heading">Ready to see it in person?</h2>
            <p className="shms-subheading" style={{ marginBottom: "var(--space-6)" }}>
              Every facility is included for resident guests, with the exception of spa
              treatments and excursions.
            </p>
            <Link className="shms-btn shms-btn-primary shms-btn-lg" to="/rooms">
              Explore rooms
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default Facilities;
