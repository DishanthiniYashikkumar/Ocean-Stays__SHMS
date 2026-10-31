import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import {
  REQUEST_STATUS,
  REQUEST_TYPE,
  REQUEST_TYPE_META,
  getRequestSummary,
  getServiceRequests,
} from "../../services/serviceRequestService";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Service staff overview: what this person is on, what nobody has picked up,
 * and how the work splits across the request types.
 */

const OPEN = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.IN_PROGRESS];

/** Where each request type is worked. */
const TYPE_ROUTES = {
  [REQUEST_TYPE.ROOM_SERVICE]: "/service/room-service",
  [REQUEST_TYPE.DINING]: "/service/dining",
  [REQUEST_TYPE.TRANSPORT]: "/service/transport",
  [REQUEST_TYPE.MAINTENANCE]: "/service/maintenance",
  [REQUEST_TYPE.HOUSEKEEPING]: "/service/requests",
};

function PanelSkeleton({ rows = 3 }) {
  return (
    <div className="shms-panel-body" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ marginBottom: "var(--space-4)" }}>
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
        </div>
      ))}
    </div>
  );
}

function RequestRow({ request, showOwner }) {
  const meta = REQUEST_TYPE_META[request.type] ?? { label: request.type, icon: "bi-bell" };

  return (
    <div className="shms-row">
      <span className="shms-row-icon" aria-hidden="true">
        <i className={`bi ${meta.icon}`} />
      </span>
      <div className="shms-row-copy">
        <p className="shms-row-title">
          {request.title}
          <StatusBadge status={request.status} domain="request" />
          {(request.priority === "HIGH" || request.priority === "URGENT") && (
            <StatusBadge status={request.priority} domain="priority" />
          )}
        </p>
        <p className="shms-row-meta">
          {meta.label} · {request.reference}
          {request.roomNumber && ` · Room ${request.roomNumber}`} ·{" "}
          {formatRelative(request.createdAt)}
          {showOwner && request.assignedToName && ` · ${request.assignedToName}`}
        </p>
      </div>
      <div className="shms-row-aside">
        <Link
          className="shms-btn shms-btn-outline shms-btn-sm"
          to={TYPE_ROUTES[request.type] ?? "/service/requests"}
        >
          Open
        </Link>
      </div>
    </div>
  );
}

function ServiceDashboard() {
  const { user } = useAuth();

  const loadSummary = useCallback(() => getRequestSummary(), []);
  const summary = useAsync(loadSummary);

  const loadAll = useCallback(() => getServiceRequests({ pageSize: 200 }), []);
  const all = useAsync(loadAll);

  const items = useMemo(() => all.data?.items ?? [], [all.data]);

  const mine = items.filter(
    (item) => item.assignedToId === user.id && OPEN.includes(item.status),
  );
  const unassigned = items.filter(
    (item) => !item.assignedToId && OPEN.includes(item.status),
  );
  const urgent = items.filter(
    (item) => item.priority === "URGENT" && OPEN.includes(item.status),
  );

  /** Open count per request type, for the breakdown panel. */
  const byType = useMemo(() => {
    return Object.entries(REQUEST_TYPE_META).map(([type, meta]) => ({
      type,
      ...meta,
      open: items.filter((item) => item.type === type && OPEN.includes(item.status)).length,
      route: TYPE_ROUTES[type] ?? "/service/requests",
    }));
  }, [items]);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="shms-heading" style={{ fontSize: "1.7rem", marginBottom: "var(--space-2)" }}>
          Hello, {firstName}.
        </h2>
        <p className="shms-subheading" style={{ fontSize: "var(--text-base)" }}>
          {mine.length === 0
            ? unassigned.length > 0
              ? `Nothing on your list, but ${unassigned.length} ${unassigned.length === 1 ? "request is" : "requests are"} waiting to be picked up.`
              : "Nothing on your list and nothing waiting. All quiet."
            : `You have ${mine.length} open ${mine.length === 1 ? "request" : "requests"}.`}
        </p>
      </div>

      {/* --------------------------------------------------------- Tiles */}
      <div className="shms-stats">
        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-gold" aria-hidden="true">
            <i className="bi bi-person-workspace" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{mine.length}</span>
            <span className="shms-stat-label">Assigned to you</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-warning" aria-hidden="true">
            <i className="bi bi-inbox" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{unassigned.length}</span>
            <span className="shms-stat-label">Waiting to be taken</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon" aria-hidden="true">
            <i className="bi bi-hourglass-split" />
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
            <span className="shms-stat-label">Completed</span>
          </span>
        </article>
      </div>

      {/* -------------------------------------------------------- Urgent */}
      {urgent.length > 0 && (
        <section className="shms-panel" style={{ borderColor: "var(--danger-edge)" }}>
          <div className="shms-panel-head">
            <div>
              <h2 style={{ color: "var(--danger-ink)" }}>
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Needs attention
                now
              </h2>
              <p>{urgent.length} urgent, still open</p>
            </div>
          </div>
          <ul className="shms-rows">
            {urgent.map((request) => (
              <li key={request.id}>
                <RequestRow request={request} showOwner />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="shms-dash-split">
        <div>
          {/* ------------------------------------------------- My work */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Your requests</h2>
                <p>{mine.length} open</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/service/requests">
                All requests
              </Link>
            </div>

            {all.error ? (
              <ErrorState message={all.error.message} onRetry={all.reload} />
            ) : all.isLoading ? (
              <PanelSkeleton />
            ) : mine.length === 0 ? (
              <EmptyState
                title="Nothing assigned to you"
                message="Pick something up from the queue below when you're free."
                icon="bi-check2-circle"
              />
            ) : (
              <ul className="shms-rows">
                {mine.map((request) => (
                  <li key={request.id}>
                    <RequestRow request={request} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --------------------------------------------- Unassigned */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Waiting to be picked up</h2>
                <p>{unassigned.length} unassigned</p>
              </div>
            </div>

            {all.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : unassigned.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                message="Every open request has someone on it."
                icon="bi-inbox"
              />
            ) : (
              <ul className="shms-rows">
                {unassigned.map((request) => (
                  <li key={request.id}>
                    <RequestRow request={request} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          {/* --------------------------------------------- By type */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>By type</h2>
                <p>Open requests across the board</p>
              </div>
            </div>

            {all.isLoading ? (
              <PanelSkeleton rows={3} />
            ) : (
              <ul className="shms-rows">
                {byType.map(({ type, label, icon, open, route }) => (
                  <li key={type}>
                    <Link to={route} style={{ textDecoration: "none", display: "block" }}>
                      <div className="shms-row">
                        <span className="shms-row-icon" aria-hidden="true">
                          <i className={`bi ${icon}`} />
                        </span>
                        <div className="shms-row-copy">
                          <p className="shms-row-title">{label}</p>
                          <p className="shms-row-meta">
                            {open === 0 ? "Nothing open" : `${open} open`}
                          </p>
                        </div>
                        <div className="shms-row-aside">
                          <span className="shms-row-amount">{open}</span>
                          <i className="bi bi-chevron-right" aria-hidden="true" />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --------------------------------------- Status breakdown */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Status</h2>
                <p>{summary.data?.total ?? 0} requests all time</p>
              </div>
            </div>

            {summary.error ? (
              <ErrorState message={summary.error.message} onRetry={summary.reload} />
            ) : summary.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : (
              <div className="shms-panel-body">
                <ul className="shms-rows" style={{ margin: 0 }}>
                  {["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                    (status) => (
                      <li key={status}>
                        <div
                          className="shms-row"
                          style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                        >
                          <div className="shms-row-copy">
                            <StatusBadge status={status} domain="request" />
                          </div>
                          <div className="shms-row-aside">
                            <span className="shms-row-amount">{summary.data?.[status] ?? 0}</span>
                          </div>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default ServiceDashboard;
