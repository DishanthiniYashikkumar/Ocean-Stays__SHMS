import { useCallback, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  NEXT_STATUSES,
  REQUEST_STATUS,
  REQUEST_TYPE,
  assignRequest,
  getServiceRequests,
  updateRequestStatus,
} from "../../services/serviceRequestService";
import { getStatusMeta } from "../../utils/status";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/housekeeping.css";

/**
 * Guest requests that belong to housekeeping — towels, linen, an extra pillow.
 *
 * A housekeeper can pick an unassigned one up themselves rather than waiting to
 * be given it, which is how it works on the floor.
 */

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "mine", label: "Mine" },
  { id: "done", label: "Done" },
];

const OPEN = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.IN_PROGRESS];

function HousekeepingRequests() {
  const { user } = useAuth();
  const toast = useToast();

  const [filter, setFilter] = useState("open");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    () => getServiceRequests({ type: REQUEST_TYPE.HOUSEKEEPING, pageSize: 200 }),
    [],
  );
  const { data, isLoading, error, reload } = useAsync(load);

  const items = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(
    () => ({
      open: items.filter((item) => OPEN.includes(item.status)).length,
      mine: items.filter((item) => item.assignedToId === user.id).length,
      done: items.filter((item) => item.status === REQUEST_STATUS.COMPLETED).length,
    }),
    [items, user.id],
  );

  const visible = useMemo(() => {
    if (filter === "open") return items.filter((item) => OPEN.includes(item.status));
    if (filter === "mine") return items.filter((item) => item.assignedToId === user.id);
    return items.filter((item) => item.status === REQUEST_STATUS.COMPLETED);
  }, [items, filter, user.id]);

  async function handleClaim(request) {
    setBusyId(request.id);
    try {
      await assignRequest(request.id, { staffId: user.id, staffName: user.name });
      toast.success(`${request.reference} is yours.`);
      reload();
    } catch (claimError) {
      toast.error(claimError.message || "We couldn't take that request.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdvance(request, next) {
    setBusyId(request.id);
    try {
      await updateRequestStatus(request.id, next);
      toast.success(
        `${request.reference} — ${getStatusMeta(next, "request").label.toLowerCase()}.`,
      );
      reload();
    } catch (advanceError) {
      toast.error(advanceError.message || "We couldn't update that request.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load requests" message={error.message} onRetry={reload} />;
  }

  return (
    <>
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

      {isLoading ? (
        <div className="shms-hk-board">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="shms-skeleton"
              style={{ height: 220, borderRadius: "var(--radius-lg)" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="shms-panel">
          <EmptyState
            title={filter === "open" ? "No open requests" : "Nothing here"}
            message={
              filter === "open"
                ? "Every housekeeping request has been dealt with."
                : "No requests match this filter."
            }
            icon="bi-check2-circle"
          />
        </section>
      ) : (
        <div className="shms-hk-board">
          {visible.map((request) => {
            const isBusy = busyId === request.id;
            const isMine = request.assignedToId === user.id;
            const transitions = (NEXT_STATUSES[request.status] ?? []).filter(
              (next) => next !== REQUEST_STATUS.CANCELLED,
            );

            return (
              <article key={request.id} className={`shms-hk-task is-${request.status}`}>
                <div className="shms-hk-head">
                  <div className="shms-hk-room">
                    <span className="shms-hk-number">{request.roomNumber ?? "—"}</span>
                    <span className="shms-hk-type">{request.guestName ?? "Guest"}</span>
                  </div>
                  <div className="shms-hk-badges">
                    <StatusBadge status={request.status} domain="request" />
                    <StatusBadge status={request.priority} domain="priority" />
                  </div>
                </div>

                <div>
                  <p className="shms-row-title" style={{ marginBottom: 4 }}>
                    {request.title}
                  </p>
                  {request.details && <p className="shms-row-meta">{request.details}</p>}
                </div>

                <ul className="shms-hk-meta">
                  <li>
                    <i className="bi bi-hash" aria-hidden="true" />
                    {request.reference}
                  </li>
                  <li>
                    <i className="bi bi-clock" aria-hidden="true" />
                    {formatRelative(request.createdAt)}
                  </li>
                  {request.assignedToName && (
                    <li>
                      <i className="bi bi-person-check" aria-hidden="true" />
                      {isMine ? "You" : request.assignedToName}
                    </li>
                  )}
                </ul>

                <div className="shms-hk-actions">
                  {request.status === REQUEST_STATUS.PENDING ? (
                    <button
                      type="button"
                      className="shms-hk-btn shms-hk-btn-start"
                      onClick={() => handleClaim(request)}
                      disabled={isBusy}
                      aria-busy={isBusy}
                    >
                      {isBusy ? (
                        <>
                          <span className="shms-spinner" aria-hidden="true" />
                          Taking&hellip;
                        </>
                      ) : (
                        <>
                          <i className="bi bi-hand-index" aria-hidden="true" />
                          I&apos;ll take this
                        </>
                      )}
                    </button>
                  ) : (
                    transitions.map((next) => (
                      <button
                        key={next}
                        type="button"
                        className={`shms-hk-btn ${
                          next === REQUEST_STATUS.COMPLETED
                            ? "shms-hk-btn-done"
                            : "shms-hk-btn-start"
                        }`}
                        onClick={() => handleAdvance(request, next)}
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
                            <i
                              className={`bi ${next === REQUEST_STATUS.COMPLETED ? "bi-check-lg" : "bi-play-fill"}`}
                              aria-hidden="true"
                            />
                            Mark {getStatusMeta(next, "request").label.toLowerCase()}
                          </>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export default HousekeepingRequests;
