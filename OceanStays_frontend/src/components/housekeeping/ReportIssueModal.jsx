import { useState } from "react";
import Modal from "../common/Modal";
import { REQUEST_PRIORITY } from "../../services/serviceRequestService";
import "../../styles/housekeeping.css";

/**
 * Reports a maintenance fault found while cleaning.
 *
 * Raising one takes the room out of service, which is the point — a room with a
 * broken air conditioner should stop being sellable the moment somebody
 * notices, not when a manager gets round to it.
 *
 * @param {{
 *   room: { roomId: string, roomNumber: string },
 *   isSaving: boolean,
 *   onSubmit: (payload) => void,
 *   onClose: () => void
 * }} props
 */

const PRIORITIES = [
  { value: REQUEST_PRIORITY.NORMAL, label: "Normal — can wait for the rota" },
  { value: REQUEST_PRIORITY.HIGH, label: "High — before the next guest" },
  { value: REQUEST_PRIORITY.URGENT, label: "Urgent — room unusable now" },
];

function ReportIssueModal({ room, isSaving, onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState(REQUEST_PRIORITY.HIGH);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    if (!title.trim()) {
      setError("Please say briefly what's wrong.");
      return;
    }

    onSubmit({
      roomId: room.roomId,
      roomNumber: room.roomNumber,
      title: title.trim(),
      details: details.trim(),
      priority,
    });
  }

  return (
    <Modal
      title={`Report an issue in ${room.roomNumber}`}
      subtitle="This goes straight to the maintenance queue"
      icon="bi-tools"
      tone="warning"
      dismissible={!isSaving}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="shms-btn shms-btn-outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="report-issue-form"
            className="shms-btn shms-btn-primary"
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                <span className="shms-spinner" aria-hidden="true" />
                Reporting&hellip;
              </>
            ) : (
              "Report issue"
            )}
          </button>
        </>
      }
    >
      <p className="shms-hk-note" style={{ marginBottom: "var(--space-5)" }}>
        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
        Reporting an issue takes room {room.roomNumber} out of service until maintenance clears
        it, so it can&apos;t be sold or allocated in the meantime.
      </p>

      <form className="shms-form" id="report-issue-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="shms-alert" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="shms-field">
          <label className="shms-label" htmlFor="issue-title">
            What&apos;s wrong?
          </label>
          <div className="shms-input-shell">
            <input
              id="issue-title"
              type="text"
              className="shms-input shms-input-bare"
              placeholder="Air conditioning not cooling, shower leaking…"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              maxLength={120}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="shms-field">
          <label className="shms-label" htmlFor="issue-details">
            Any detail that helps
            <span className="shms-label-optional">optional</span>
          </label>
          <div className="shms-input-shell">
            <textarea
              id="issue-details"
              className="shms-input shms-input-bare"
              placeholder="Where exactly, when it started, whether the guest has been moved…"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={500}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="shms-field">
          <label className="shms-label" htmlFor="issue-priority">
            How urgent?
          </label>
          <div className="shms-input-shell">
            <select
              id="issue-priority"
              className="shms-input shms-input-bare"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={isSaving}
            >
              {PRIORITIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ReportIssueModal;
