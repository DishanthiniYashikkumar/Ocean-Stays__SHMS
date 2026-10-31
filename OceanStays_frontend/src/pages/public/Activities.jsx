import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getExperiences } from "../../services/contentService";
import { formatCurrency } from "../../utils/format";
import "../../styles/cards.css";

/** Full experiences listing. Booking an excursion happens at the concierge desk. */
function Activities() {
  const load = useCallback(() => getExperiences(), []);
  const { data: experiences, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <>
      <header className="shms-page-head">
        <div className="shms-container">
          <ul className="shms-breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Experiences</li>
          </ul>

          <h1>Experiences</h1>
          <span className="shms-rule-gold" />
          <p>
            Whales off the shelf at dawn, tea country by mid-morning, the ramparts at dusk.
            Everything here is arranged by our concierge and guided by people who live on this
            coast.
          </p>
        </div>
      </header>

      <section className="shms-section">
        <div className="shms-container">
          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : isEmpty ? (
            <EmptyState
              title="No experiences listed"
              message="Our excursion programme is being refreshed for the season."
              icon="bi-compass"
            >
              <Link className="shms-btn shms-btn-outline" to="/contact">
                Ask the concierge
              </Link>
            </EmptyState>
          ) : isLoading ? (
            <div className="shms-grid shms-grid-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="shms-skeleton"
                  style={{ minHeight: 380, borderRadius: "var(--radius-lg)" }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <div className="shms-grid shms-grid-3">
              {experiences.map(({ id, name, summary, image, duration, price, currency }) => (
                <article key={id} className="shms-experience-card">
                  <div className="shms-experience-media">
                    <img src={image} alt={name} loading="lazy" decoding="async" />
                    <span className="shms-experience-duration">
                      <i className="bi bi-clock" aria-hidden="true" />
                      {duration}
                    </span>
                  </div>

                  <div className="shms-experience-body">
                    <h2 className="shms-experience-name">{name}</h2>
                    <p className="shms-experience-summary">{summary}</p>

                    <div className="shms-experience-foot">
                      <span className="shms-experience-price">
                        {formatCurrency(price, currency)} <span>per person</span>
                      </span>
                      <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/contact">
                        Enquire
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default Activities;
