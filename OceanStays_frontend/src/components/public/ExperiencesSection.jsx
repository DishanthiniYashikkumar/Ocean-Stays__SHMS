import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getExperiences } from "../../services/contentService";
import { formatCurrency } from "../../utils/format";
import "../../styles/cards.css";

/** Guest experiences the concierge can arrange. Shows the first three. */
const VISIBLE_COUNT = 3;

function ExperiencesSection() {
  const load = useCallback(() => getExperiences(), []);
  const { data: experiences, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section shms-section-alt" aria-labelledby="experiences-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Experiences</p>
          <h2 className="shms-heading" id="experiences-title">
            Beyond the Property
          </h2>
          <p className="shms-subheading">
            Whales off the shelf at dawn, tea country by mid-morning, the ramparts at dusk. Our
            concierge arranges all of it.
          </p>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : isEmpty ? (
          <EmptyState
            title="No experiences listed"
            message="Our excursion programme is being refreshed for the season."
            icon="bi-compass"
          />
        ) : isLoading ? (
          <div className="shms-grid shms-grid-3">
            {Array.from({ length: VISIBLE_COUNT }, (_, index) => (
              <div
                key={index}
                className="shms-skeleton"
                style={{ minHeight: 380, borderRadius: "var(--radius-lg)" }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="shms-grid shms-grid-3">
              {experiences.slice(0, VISIBLE_COUNT).map(
                ({ id, name, summary, image, duration, price, currency }) => (
                  <article key={id} className="shms-experience-card">
                    <div className="shms-experience-media">
                      <img src={image} alt={name} loading="lazy" decoding="async" />
                      <span className="shms-experience-duration">
                        <i className="bi bi-clock" aria-hidden="true" />
                        {duration}
                      </span>
                    </div>

                    <div className="shms-experience-body">
                      <h3 className="shms-experience-name">{name}</h3>
                      <p className="shms-experience-summary">{summary}</p>

                      <div className="shms-experience-foot">
                        <span className="shms-experience-price">
                          {formatCurrency(price, currency)} <span>per person</span>
                        </span>
                        <Link className="shms-btn shms-btn-quiet shms-btn-sm" to="/activities">
                          Details
                          <i className="bi bi-arrow-right" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>

            <div className="shms-section-more">
              <Link className="shms-btn shms-btn-outline shms-btn-lg" to="/activities">
                All experiences
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ExperiencesSection;
