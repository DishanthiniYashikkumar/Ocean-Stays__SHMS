import { useCallback, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import ReportIssueModal from "../../components/housekeeping/ReportIssueModal";
import TaskCard from "../../components/housekeeping/TaskCard";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  TASK_STATUS,
  getHousekeepingTasks,
  reportMaintenanceIssue,
  updateTaskStatus,
} from "../../services/housekeepingService";
import "../../styles/dashboard.css";
import "../../styles/housekeeping.css";

/**
 * The task board — the screen a housekeeper actually works from.
 *
 * Defaults to this person's own tasks, with a toggle to see the whole floor,
 * because covering for someone is normal and hiding their rooms would just
 * mean asking a supervisor.
 */

const FILTERS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

function CleaningTasks() {
  const { user } = useAuth();
  const toast = useToast();

  const [scope, setScope] = useState("mine");
  const [filter, setFilter] = useState("todo");
  const [busyId, setBusyId] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [isReporting, setIsReporting] = useState(false);

  const load = useCallback(
    () => getHousekeepingTasks(scope === "mine" ? { assignedToId: user.id } : {}),
    [scope, user.id],
  );
  const { data, isLoading, error, reload } = useAsync(load);

  const tasks = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === TASK_STATUS.PENDING).length,
      in_progress: tasks.filter((task) => task.status === TASK_STATUS.IN_PROGRESS).length,
      done: tasks.filter((task) => task.status === TASK_STATUS.COMPLETED).length,
      all: tasks.length,
    }),
    [tasks],
  );

  const visible = useMemo(() => {
    if (filter === "todo") return tasks.filter((t) => t.status === TASK_STATUS.PENDING);
    if (filter === "in_progress") return tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS);
    if (filter === "done") return tasks.filter((t) => t.status === TASK_STATUS.COMPLETED);
    return tasks;
  }, [tasks, filter]);

  async function move(task, status, message) {
    setBusyId(task.id);
    try {
      await updateTaskStatus(task.id, status);
      toast.success(message);
      reload();
    } catch (moveError) {
      toast.error(moveError.message || "We couldn't update that task.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReport(payload) {
    setIsReporting(true);
    try {
      const created = await reportMaintenanceIssue(payload);
      toast.success(
        `${created.reference} raised. Room ${payload.roomNumber} is out of service until it's cleared.`,
        { title: "Issue reported" },
      );
      setReporting(null);
      reload();
    } catch (reportError) {
      toast.error(reportError.message || "We couldn't report that issue.");
    } finally {
      setIsReporting(false);
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load your tasks" message={error.message} onRetry={reload} />;
  }

  return (
    <>
      {/* ------------------------------------------------------ Scope */}
      <ul className="shms-tabs">
        <li>
          <button
            type="button"
            className="shms-tab"
            aria-pressed={scope === "mine"}
            onClick={() => setScope("mine")}
          >
            <i className="bi bi-person" aria-hidden="true" />
            My rooms
          </button>
        </li>
        <li>
          <button
            type="button"
            className="shms-tab"
            aria-pressed={scope === "all"}
            onClick={() => setScope("all")}
          >
            <i className="bi bi-people" aria-hidden="true" />
            Whole property
          </button>
        </li>
      </ul>

      {/* ----------------------------------------------------- Filter */}
      <ul className="shms-hk-filters">
        {FILTERS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              className="shms-tab"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="shms-tab-count">{counts[id]}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* ------------------------------------------------------ Board */}
      {isLoading ? (
        <div className="shms-hk-board">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="shms-skeleton"
              style={{ height: 260, borderRadius: "var(--radius-lg)" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="shms-panel">
          <EmptyState
            title={filter === "todo" ? "Nothing waiting" : "Nothing here"}
            message={
              filter === "todo"
                ? scope === "mine"
                  ? "Every room assigned to you has been started or finished."
                  : "No rooms are waiting to be cleaned anywhere on the property."
                : "No tasks match this filter."
            }
            icon="bi-check2-circle"
          >
            {scope === "mine" && (
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setScope("all")}
              >
                Check the whole property
              </button>
            )}
          </EmptyState>
        </section>
      ) : (
        <div className="shms-hk-board">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busyId={busyId}
              onStart={(item) =>
                move(item, TASK_STATUS.IN_PROGRESS, `Room ${item.roomNumber} — cleaning started.`)
              }
              onComplete={(item) =>
                move(
                  item,
                  TASK_STATUS.COMPLETED,
                  `Room ${item.roomNumber} cleaned and sent for inspection.`,
                )
              }
              onReport={(item) =>
                setReporting({ roomId: item.roomId, roomNumber: item.roomNumber })
              }
            />
          ))}
        </div>
      )}

      {reporting && (
        <ReportIssueModal
          room={reporting}
          isSaving={isReporting}
          onSubmit={handleReport}
          onClose={() => setReporting(null)}
        />
      )}
    </>
  );
}

export default CleaningTasks;
