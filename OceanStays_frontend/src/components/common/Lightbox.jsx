import { useCallback, useEffect, useRef } from "react";
import "../../styles/lightbox.css";

/**
 * Accessible image viewer.
 *
 * Keyboard: Escape closes, ArrowLeft / ArrowRight move between images.
 * Focus is moved into the dialog on open and restored to the trigger on close,
 * and the page behind it is locked from scrolling.
 *
 * @param {{
 *   images: Array<{ id: string, src: string, caption?: string, category?: string }>,
 *   index: number,
 *   onClose: () => void,
 *   onNavigate: (nextIndex: number) => void
 * }} props
 */
function Lightbox({ images, index, onClose, onNavigate }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);

  const total = images.length;
  const current = images[index];

  const goPrevious = useCallback(() => {
    onNavigate((index - 1 + total) % total);
  }, [index, total, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % total);
  }, [index, total, onNavigate]);

  /* ---- Keyboard, scroll lock and focus ---------------------------------- */
  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }

      // Keep Tab inside the dialog.
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    const restoreTo = previouslyFocused.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown);
      // Send focus back to whatever opened the viewer.
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  }, [onClose, goPrevious, goNext]);

  if (!current) return null;

  return (
    <div
      ref={dialogRef}
      className="shms-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${current.caption ?? "photograph"}, ${index + 1} of ${total}`}
    >
      <div className="shms-lightbox-bar">
        <span className="shms-lightbox-count">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>

        <button ref={closeRef} type="button" className="shms-lightbox-close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
          Close
        </button>
      </div>

      <div className="shms-lightbox-stage">
        {total > 1 && (
          <button
            type="button"
            className="shms-lightbox-nav shms-lightbox-prev"
            onClick={goPrevious}
            aria-label="Previous image"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
        )}

        <figure className="shms-lightbox-figure">
          <img className="shms-lightbox-image" src={current.src} alt={current.caption ?? ""} />
          {current.caption && (
            <figcaption className="shms-lightbox-caption">
              {current.caption}
              {current.category && <span>{current.category}</span>}
            </figcaption>
          )}
        </figure>

        {total > 1 && (
          <button
            type="button"
            className="shms-lightbox-nav shms-lightbox-next"
            onClick={goNext}
            aria-label="Next image"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="shms-lightbox-thumbs">
          {images.map((image, position) => (
            <button
              key={image.id}
              type="button"
              className={`shms-lightbox-thumb${position === index ? " is-active" : ""}`}
              onClick={() => onNavigate(position)}
              aria-label={`View image ${position + 1}`}
              aria-current={position === index}
            >
              <img src={image.src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Lightbox;
