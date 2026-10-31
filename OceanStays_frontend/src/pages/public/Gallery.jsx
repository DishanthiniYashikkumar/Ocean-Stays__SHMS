import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import Lightbox from "../../components/common/Lightbox";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { getGallery, getGalleryCategories } from "../../services/contentService";
import "../../styles/gallery.css";

/** Full gallery with category filtering and a keyboard-accessible lightbox. */

const CATEGORIES = getGalleryCategories();

function Gallery() {
  const [category, setCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const load = useCallback(() => getGallery(category), [category]);
  const { data: images, isLoading, error, isEmpty, reload } = useAsync(load);

  return (
    <>
      <header className="shms-page-head">
        <div className="shms-container">
          <ul className="shms-breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Gallery</li>
          </ul>

          <h1>Gallery</h1>
          <span className="shms-rule-gold" />
          <p>The property, the rooms and the stretch of coastline they sit on.</p>
        </div>
      </header>

      <section className="shms-section">
        <div className="shms-container">
          <ul className="shms-gallery-filters">
            {CATEGORIES.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="shms-gallery-filter"
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : isEmpty ? (
            <EmptyState
              title={`No photographs in ${category}`}
              message="Try another category, or view the whole collection."
              icon="bi-images"
            >
              <button
                type="button"
                className="shms-btn shms-btn-primary"
                onClick={() => setCategory("All")}
              >
                View all photographs
              </button>
            </EmptyState>
          ) : isLoading ? (
            <div className="shms-gallery-masonry">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="shms-skeleton shms-gallery-tile"
                  style={{ height: index % 3 === 0 ? 320 : 220 }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <div className="shms-gallery-masonry">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className="shms-gallery-tile"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`View ${image.caption} at full size`}
                >
                  <img src={image.src} alt={image.caption} loading="lazy" decoding="async" />
                  <span className="shms-gallery-tile-caption">
                    <strong>{image.caption}</strong>
                    <span>{image.category}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightboxIndex !== null && images && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

export default Gallery;
