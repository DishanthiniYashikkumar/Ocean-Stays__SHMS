/**
 * Friendly failure message with a retry action.
 *
 * @param {{
 *   title?: string,
 *   message?: string,
 *   onRetry?: () => void,
 *   icon?: string
 * }} props
 */
function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this just now. Please try again.",
  onRetry,
  icon = "bi-exclamation-triangle",
}) {
  return (
    <div className="shms-state" role="alert">
      <span className="shms-state-icon shms-state-icon-danger" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>

      <h3 className="shms-state-title">{title}</h3>
      <p className="shms-state-message">{message}</p>

      {onRetry && (
        <div className="shms-state-actions">
          <button type="button" className="shms-btn shms-btn-outline" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
