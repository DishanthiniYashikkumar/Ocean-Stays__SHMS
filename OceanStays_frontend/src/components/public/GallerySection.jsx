import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import ErrorState from "../common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getGallery } from "../../services/contentService";
import "../../styles/home.css";

/**
 * Gallery preview. A full lightbox lives on the gallery page (Phase 3); here
 * each tile links through to it.
 */

/* Five fills the feature-tile grid exactly at 4, 3 and 2 columns. */
const VISIBLE_COUNT = 5;

function GallerySection() {
  const navigate = useNavigate();
  const load = useCallback(() => getGallery(), []);
  const { data: images, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <section className="shms-section" aria-labelledby="gallery-title">
      <div className="shms-container">
        <div className="shms-section-head shms-section-head-center">
          <p className="shms-eyebrow">Gallery</p>
          <h2 className="shms-heading" id="gallery-title">
            A Look Around
          </h2>
          <p className="shms-subheading">
            The property, the rooms and the stretch of coastline they sit on.
          </p>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : isEmpty ? (
          <EmptyState
            title="No photographs yet"
            message="Our gallery is being refreshed. Please check back shortly."
            icon="bi-images"
          />
        ) : isLoading ? (
          <div className="shms-gallery-grid">
            {Array.from({ length: VISIBLE_COUNT }, (_, index) => (
              <div
                key={index}
                className="shms-skeleton shms-gallery-item"
                style={{
                  gridColumn: index === 0 ? "span 2" : undefined,
                  gridRow: index === 0 ? "span 2" : undefined,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="shms-gallery-grid">
              {images.slice(0, VISIBLE_COUNT).map(({ id, src, caption, category }) => (
                <button
                  key={id}
                  type="button"
                  className="shms-gallery-item"
                  onClick={() => navigate("/gallery")}
                  aria-label={`${caption} — open the full gallery`}
                >
                  <img src={src} alt={caption} loading="lazy" decoding="async" />
                  <span className="shms-gallery-caption">
                    {caption}
                    <span className="visually-hidden"> ({category})</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="shms-section-more">
              <button
                type="button"
                className="shms-btn shms-btn-outline shms-btn-lg"
                onClick={() => navigate("/gallery")}
              >
                <i className="bi bi-images" aria-hidden="true" />
                View full gallery
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default GallerySection;
