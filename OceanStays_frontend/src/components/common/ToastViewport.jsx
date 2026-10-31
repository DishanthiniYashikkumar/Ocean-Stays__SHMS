import "../../styles/overlay.css";

/**
 * Renders the active toast stack. Mounted once by ToastProvider.
 *
 * Errors use role="alert" so they interrupt a screen reader; successes and
 * information use role="status" so they are announced without cutting in.
 *
 * @param {{ toasts: Array, onDismiss: (id: number) => void }} props
 */

const ICONS = {
  success: "bi-check-circle-fill",
  danger: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="shms-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map(({ id, message, tone, title }) => (
        <div
          key={id}
          className={`shms-toast shms-toast-${tone}`}
          role={tone === "danger" ? "alert" : "status"}
        >
          <i className={`bi ${ICONS[tone] ?? ICONS.info} shms-toast-icon`} aria-hidden="true" />

          <div className="shms-toast-body">
            {title && <strong className="shms-toast-title">{title}</strong>}
            <span className="shms-toast-message">{message}</span>
          </div>

          <button
            type="button"
            className="shms-toast-close"
            onClick={() => onDismiss(id)}
            aria-label="Dismiss notification"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastViewport;
