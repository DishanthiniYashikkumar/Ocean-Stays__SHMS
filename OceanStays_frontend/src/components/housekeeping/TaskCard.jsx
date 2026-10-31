import StatusBadge from "../common/StatusBadge";
import { HOUSEKEEPING_TASK_LABELS, TASK_STATUS } from "../../services/housekeepingService";
import { formatRelative } from "../../utils/format";
import "../../styles/housekeeping.css";

/**
 * One cleaning task, sized for a phone held in one hand.
 *
 * The primary action is always a single full-width tap — start, complete, or
 * inspect — because a housekeeper reading this is usually standing in a
 * corridor, not sitting at a desk.
 *
 * @param {{
 *   task: object,
 *   busyId: string|null,        Task currently being updated
 *   onStart: (task) => void,
 *   onComplete: (task) => void,
 *   onReport: (task) => void
 * }} props
 */
function TaskCard({ task, busyId, onStart, onComplete, onReport }) {
  const isBusy = busyId === task.id;

  return (
    <article className={`shms-hk-task is-${task.status}`}>
      <div className="shms-hk-head">
        <div className="shms-hk-room">
          <span className="shms-hk-number">{task.roomNumber}</span>
          <span className="shms-hk-type">{task.roomTypeName}</span>
        </div>

        <div className="shms-hk-badges">
          <StatusBadge status={task.status} domain="request" />
          <StatusBadge status={task.priority} domain="priority" />
        </div>
      </div>

      <ul className="shms-hk-meta">
        <li>
          <i className="bi bi-brush" aria-hidden="true" />
          {HOUSEKEEPING_TASK_LABELS[task.taskType] ?? task.taskType}
        </li>
        <li>
          <i className="bi bi-building" aria-hidden="true" />
          {task.floor === 0 ? "Garden villas" : `Floor ${task.floor}`}
        </li>
        <li>
          <i className="bi bi-clock" aria-hidden="true" />
          {task.completedAt
            ? `Done ${formatRelative(task.completedAt)}`
            : task.startedAt
              ? `Started ${formatRelative(task.startedAt)}`
              : `Raised ${formatRelative(task.createdAt)}`}
        </li>
      </ul>

      {task.note && (
        <p className="shms-hk-note">
          <i className="bi bi-sticky" aria-hidden="true" />
          {task.note}
        </p>
      )}

      <div className="shms-hk-actions">
        {task.status === TASK_STATUS.PENDING && (
          <button
            type="button"
            className="shms-hk-btn shms-hk-btn-start"
            onClick={() => onStart(task)}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {isBusy ? (
              <>
                <span className="shms-spinner" aria-hidden="true" />
                Starting&hellip;
              </>
            ) : (
              <>
                <i className="bi bi-play-fill" aria-hidden="true" />
                Start cleaning
              </>
            )}
          </button>
        )}

        {task.status === TASK_STATUS.IN_PROGRESS && (
          <button
            type="button"
            className="shms-hk-btn shms-hk-btn-done"
            onClick={() => onComplete(task)}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {isBusy ? (
              <>
                <span className="shms-spinner" aria-hidden="true" />
                Saving&hellip;
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" aria-hidden="true" />
                Mark room cleaned
              </>
            )}
          </button>
        )}

        {task.status === TASK_STATUS.COMPLETED && (
          <p className="shms-row-meta" style={{ textAlign: "center", margin: 0 }}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" style={{ color: "var(--success)" }} />{" "}
            Cleaned — awaiting inspection
          </p>
        )}

        <button
          type="button"
          className="shms-hk-btn shms-hk-btn-outline"
          onClick={() => onReport(task)}
          disabled={isBusy}
        >
          <i className="bi bi-tools" aria-hidden="true" />
          Report an issue
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
