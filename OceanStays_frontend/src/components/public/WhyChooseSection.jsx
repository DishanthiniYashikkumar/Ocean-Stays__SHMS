import { useCallback } from "react";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getHighlights } from "../../services/contentService";
import "../../styles/home.css";

/** Four reasons to book direct. Trust signals, not marketing filler. */
function WhyChooseSection() {
  const load = useCallback(() => getHighlights(), []);
  const { data: highlights, isLoading, error, reload } = useAsync(load);

  return (
    <section className="shms-section" aria-labelledby="why-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Why Ocean Stays</p>
          <h2 className="shms-heading" id="why-title">
            Reasons Guests Come Back
          </h2>
          <p className="shms-subheading">
            Four things we hold ourselves to, on every stay and every booking.
          </p>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <div className="shms-grid shms-grid-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="shms-skeleton"
                    style={{ minHeight: 190, borderRadius: "var(--radius-lg)" }}
                    aria-hidden="true"
                  />
                ))
              : highlights.map(({ id, icon, title, description }) => (
                  <article key={id} className="shms-highlight">
                    <span className="shms-highlight-icon" aria-hidden="true">
                      <i className={`bi ${icon}`} />
                    </span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default WhyChooseSection;
