import { useState } from "react";
import Modal from "./Modal";

/**
 * Confirmation for actions that are hard to undo.
 *
 * `onConfirm` may return a promise; the dialog stays open and disabled while
 * it settles, so the user sees the action complete rather than a dialog that
 * vanishes before anything has happened.
 *
 * @param {{
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   tone?: "danger"|"warning"|"default",
 *   icon?: string,
 *   onConfirm: () => void | Promise<void>,
 *   onCancel: () => void
 * }} props
 */
function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  tone = "danger",
  icon = "bi-exclamation-triangle",
  onConfirm,
  onCancel,
}) {
  const [isWorking, setIsWorking] = useState(false);

  async function handleConfirm() {
    if (isWorking) return;
    setIsWorking(true);
    try {
      await onConfirm();
    } finally {
      setIsWorking(false);
    }
  }

  const confirmClass = tone === "danger" ? "shms-btn-danger" : "shms-btn-primary";

  return (
    <Modal
      title={title}
      icon={icon}
      tone={tone}
      dismissible={!isWorking}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            className="shms-btn shms-btn-outline"
            onClick={onCancel}
            disabled={isWorking}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`shms-btn ${confirmClass}`}
            onClick={handleConfirm}
            disabled={isWorking}
            aria-busy={isWorking}
          >
            {isWorking ? (
              <>
                <span className="shms-spinner" aria-hidden="true" />
                Working&hellip;
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
