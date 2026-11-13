import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../../styles/overlay.css";

/**
 * Accessible dialog.
 *
 * Escape closes, focus moves inside on open and returns to the trigger on
 * close, Tab is trapped, and the page behind is locked from scrolling. Clicking
 * the scrim closes unless `dismissible` is false — useful while a request is
 * in flight and closing would lose the result.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   icon?: string,
 *   tone?: "default"|"danger"|"warning",
 *   size?: "md"|"lg",
 *   dismissible?: boolean,
 *   onClose: () => void,
 *   children: React.ReactNode,
 *   footer?: React.ReactNode
 * }} props
 */
function Modal({
  title,
  subtitle,
  icon,
  tone = "default",
  size = "md",
  dismissible = true,
  onClose,
  children,
  footer,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Callers pass inline `onClose` arrows, so it is a new function on every
  // render. Reading it (and `dismissible`) through refs keeps the effect below
  // mount-only; otherwise each keystroke in a form re-ran it, restoring focus
  // to the trigger and re-focusing the first control — typing lost focus.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === "Escape" && dismissibleRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

    // Focus the first control inside rather than the dialog itself, so the
    // next Tab continues naturally.
    const target = dialogRef.current?.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    target?.focus();

    const restoreTo = previouslyFocused.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  }, []);

  // Portalled to <body> so no ancestor with a transform/filter (e.g. the
  // route's entrance animation) can trap the fixed scrim inside the page.
  return createPortal(
    <div
      className="shms-modal-scrim"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the scrim dismisses —
        // dragging a text selection out of the dialog must not close it.
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`shms-modal${size === "lg" ? " shms-modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="shms-modal-head">
          <div>
            {icon && (
              <span
                className={`shms-modal-icon${tone !== "default" ? ` shms-modal-icon-${tone}` : ""}`}
                aria-hidden="true"
              >
                <i className={`bi ${icon}`} />
              </span>
            )}
            <h2 className="shms-modal-title" id={titleId}>
              {title}
            </h2>
            {subtitle && <p className="shms-modal-subtitle">{subtitle}</p>}
          </div>

          {dismissible && (
            <button
              type="button"
              className="shms-modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="shms-modal-body">{children}</div>

        {footer && <div className="shms-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
