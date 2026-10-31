import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { TASK_STATUS, getHousekeepingTasks, getTaskSummary } from "../../services/housekeepingService";
import { getRoomStatusSummary } from "../../services/roomService";
import { HOUSEKEEPING_TASK_LABELS } from "../../services/housekeepingService";
import { formatRelative, getGreeting } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/housekeeping.css";

/**
 * Housekeeping overview: what this housekeeper has to do today, and where the
 * property's rooms sit in the turnaround chain.
 */

/** The chain a room walks after a guest leaves. */
const TURNAROUND = ["DIRTY", "CLEANING", "CLEAN", "INSPECTED"];

function HousekeepingDashboard() {
  const { user } = useAuth();

  const loadSummary = useCallback(() => getTaskSummary({ assignedToId: user.id }), [user.id]);
  const summary = useAsync(loadSummary);

  const loadTasks = useCallback(
    () => getHousekeepingTasks({ assignedToId: user.id }),
    [user.id],
  );
  const tasks = useAsync(loadTasks);

  const loadRooms = useCallback(() => getRoomStatusSummary(), []);
  const rooms = useAsync(loadRooms);

  const mine = tasks.data ?? [];
  const outstanding = mine.filter((task) =>
    [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS].includes(task.status),
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="shms-heading" style={{ fontSize: "1.7rem", marginBottom: "var(--space-2)" }}>
          {getGreeting()}, {firstName}.
        </h2>
        <p className="shms-subheading" style={{ fontSize: "var(--text-base)" }}>
          {outstanding.length === 0
            ? "Nothing outstanding on your list. Well done."
            : `${outstanding.length} ${outstanding.length === 1 ? "room" : "rooms"} still to do today.`}
        </p>
      </div>

      {/* --------------------------------------------------------- Tiles */}
      <div className="shms-stats">
        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-warning" aria-hidden="true">
            <i className="bi bi-list-check" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{summary.data?.PENDING ?? 0}</span>
            <span className="shms-stat-label">Waiting to start</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-gold" aria-hidden="true">
            <i className="bi bi-brush" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{summary.data?.IN_PROGRESS ?? 0}</span>
            <span className="shms-stat-label">In progress</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-success" aria-hidden="true">
            <i className="bi bi-check2-circle" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{summary.data?.COMPLETED ?? 0}</span>
            <span className="shms-stat-label">Completed today</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon" aria-hidden="true">
            <i className="bi bi-clipboard-check" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{rooms.data?.CLEAN ?? 0}</span>
            <span className="shms-stat-label">Awaiting inspection</span>
          </span>
        </article>
      </div>

      <div className="shms-dash-split">
        <div>
          {/* --------------------------------------------- Today's list */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Your rooms today</h2>
                <p>{outstanding.length} outstanding</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/housekeeping/tasks">
                Open task board
              </Link>
            </div>

            {tasks.error ? (
              <ErrorState message={tasks.error.message} onRetry={tasks.reload} />
            ) : tasks.isLoading ? (
              <div className="shms-panel-body" aria-hidden="true">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} style={{ marginBottom: "var(--space-4)" }}>
                    <div className="shms-skeleton shms-skeleton-title" />
                    <div className="shms-skeleton shms-skeleton-text" />
                  </div>
                ))}
              </div>
            ) : outstanding.length === 0 ? (
              <EmptyState
                title="Your list is clear"
                message="Every room assigned to you has been cleaned. Check the task board if you want to help elsewhere."
                icon="bi-check2-circle"
              >
                <Link className="shms-btn shms-btn-primary" to="/housekeeping/tasks">
                  See all tasks
                </Link>
              </EmptyState>
            ) : (
              <ul className="shms-rows">
                {outstanding.map((task) => (
                  <li key={task.id}>
                    <div className="shms-row">
                      <span className="shms-row-icon" aria-hidden="true">
                        <i className="bi bi-door-open" />
                      </span>
                      <div className="shms-row-copy">
                        <p className="shms-row-title">
                          Room {task.roomNumber}
                          <StatusBadge status={task.status} domain="request" />
                          {task.priority === "HIGH" || task.priority === "URGENT" ? (
                            <StatusBadge status={task.priority} domain="priority" />
                          ) : null}
                        </p>
                        <p className="shms-row-meta">
                          {HOUSEKEEPING_TASK_LABELS[task.taskType] ?? task.taskType} ·{" "}
                          {task.roomTypeName} · {formatRelative(task.createdAt)}
                          {task.note && ` — ${task.note}`}
                        </p>
                      </div>
                      <div className="shms-row-aside">
                        <Link className="shms-btn shms-btn-primary shms-btn-sm" to="/housekeeping/tasks">
                          Open
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          {/* --------------------------------------- Turnaround chain */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Property turnaround</h2>
                <p>Where every room sits right now</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/housekeeping/rooms">
                Rooms
              </Link>
            </div>

            {rooms.error ? (
              <ErrorState message={rooms.error.message} onRetry={rooms.reload} />
            ) : rooms.isLoading ? (
              <div className="shms-panel-body" aria-hidden="true">
                <div className="shms-skeleton shms-skeleton-text" />
                <div className="shms-skeleton shms-skeleton-text" />
              </div>
            ) : (
              <div className="shms-panel-body">
                <ul className="shms-rows" style={{ margin: 0 }}>
                  {TURNAROUND.map((status) => (
                    <li key={status}>
                      <div
                        className="shms-row"
                        style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                      >
                        <div className="shms-row-copy">
                          <StatusBadge status={status} domain="room" />
                        </div>
                        <div className="shms-row-aside">
                          <span className="shms-row-amount">{rooms.data?.[status] ?? 0}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                  <li>
                    <div className="shms-row" style={{ padding: "10px 0" }}>
                      <div className="shms-row-copy">
                        <StatusBadge status="MAINTENANCE" domain="room" />
                      </div>
                      <div className="shms-row-aside">
                        <span className="shms-row-amount">{rooms.data?.MAINTENANCE ?? 0}</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </section>

          {/* ------------------------------------------ Quick actions */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Quick actions</h2>
              </div>
            </div>
            <div className="shms-panel-body">
              <div className="shms-actions-grid">
                <Link className="shms-action" to="/housekeeping/tasks">
                  <i className="bi bi-list-check" aria-hidden="true" />
                  Task Board
                  <small>Start & complete</small>
                </Link>
                <Link className="shms-action" to="/housekeeping/rooms">
                  <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
                  Assigned Rooms
                  <small>Inspect & release</small>
                </Link>
                <Link className="shms-action" to="/housekeeping/requests">
                  <i className="bi bi-bell" aria-hidden="true" />
                  Guest Requests
                  <small>Towels, linen, extras</small>
                </Link>
                <Link className="shms-action" to="/housekeeping/maintenance">
                  <i className="bi bi-tools" aria-hidden="true" />
                  Maintenance
                  <small>Report a fault</small>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default HousekeepingDashboard;
