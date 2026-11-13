/**
 * Star rating display, e.g. on testimonials and room cards.
 *
 * @param {{ rating: number, max?: number, className?: string, round?: boolean }} props
 */
export function StarRating({ rating, max = 5, className = "", round = true }) {
  const filled = round ? Math.round(rating) : rating;

  return (
    <span
      className={`shms-stars ${className}`.trim()}
      role="img"
      aria-label={`Rated ${rating} out of ${max}`}
    >
      {Array.from({ length: max }, (_, index) => (
        <i
          key={index}
          className={index < filled ? "bi bi-star-fill" : "bi bi-star"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * Star rating input: one toggle button per star.
 *
 * `shown` is the value to paint (the hovered star while hovering, else the
 * chosen rating), so the caller keeps its own hover state and wording.
 *
 * @param {{
 *   value: number,
 *   shown?: number,
 *   max?: number,
 *   onChange: (value: number) => void,
 *   onHover?: (value: number) => void,
 * }} props
 */
export function StarRatingInput({ value, shown = value, max = 5, onChange, onHover }) {
  return (
    <div className="shms-star-input">
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1;
        const isOn = star <= shown;
        return (
          <button
            key={star}
            type="button"
            className={`shms-star-btn${isOn ? " is-on" : ""}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover?.(star)}
            onFocus={() => onHover?.(star)}
            onBlur={() => onHover?.(0)}
            aria-label={`${star} of ${max} stars`}
            aria-pressed={value === star}
          >
            <i className={isOn ? "bi bi-star-fill" : "bi bi-star"} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
