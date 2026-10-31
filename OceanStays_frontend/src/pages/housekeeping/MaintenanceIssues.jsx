import { useCallback, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import ReportIssueModal from "../../components/housekeeping/ReportIssueModal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { reportMaintenanceIssue } from "../../services/housekeepingService";
import { REQUEST_STATUS, REQUEST_TYPE, getServiceRequests } from "../../services/serviceRequestService";
import { ROOM_STATUS, getRooms } from "../../services/roomService";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/housekeeping.css";

/**
 * Faults found on the floor: what has been reported, and the button to report
 * something new.
 *
 * The list is read-only for housekeeping — fixing is the service team's job in
 * Phase 9. Housekeeping's part is noticing and recording.
 */

const OPEN = [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.IN_PROGRESS];

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "done", label: "Resolved" },
  { id: "all", label: "All" },
];

function MaintenanceIssues() {
  const toast = useToast();

  const [filter, setFilter] = useState("open");
  const [reporting, setReporting] = useState(null);
  const [isReporting, setIsReporting] = useState(false);
  const [pickingRoom, setPickingRoom] = useState(false);

  const load = useCallback(
    () => getServiceRequests({ type: REQUEST_TYPE.MAINTENANCE, pageSize: 200 }),
    [],
  );
  const { data, isLoading, error, reload } = useAsync(load);

  const loadRooms = useCallback(() => getRooms(), []);
  const rooms = useAsync(loadRooms);

  const items = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(
    () => ({
      open: items.filter((item) => OPEN.includes(item.status)).length,
      done: items.filter((item) => item.status === REQUEST_STATUS.COMPLETED).length,
      all: items.length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    if (filter === "open") return items.filter((item) => OPEN.includes(item.status));
    if (filter === "done") return items.filter((item) => item.status === REQUEST_STATUS.COMPLETED);
    return items;
  }, [items, filter]);

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
      rooms.reload();
    } catch (reportError) {
      toast.error(reportError.message || "We couldn't report that issue.");
    } finally {
      setIsReporting(false);
    }
  }

  // Rooms not already out of service are the ones worth reporting against.
  const reportable = (rooms.data ?? []).filter((room) => room.status !== ROOM_STATUS.MAINTENANCE);

  if (error) {
    return (
      <ErrorState title="We couldn't load maintenance issues" message={error.message} onRetry={reload} />
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          marginBottom: "var(--space-5)",
        }}
      >
        <ul className="shms-hk-filters" style={{ marginBottom: 0 }}>
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

        <button
          type="button"
          className="shms-btn shms-btn-primary"
          onClick={() => setPickingRoom(true)}
          disabled={rooms.isLoading}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          Report an issue
        </button>
      </div>

      {isLoading ? (
        <div className="shms-hk-board">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="shms-skeleton"
              style={{ height: 200, borderRadius: "var(--radius-lg)" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="shms-panel">
          <EmptyState
            title={filter === "open" ? "Nothing broken" : "Nothing here"}
            message={
              filter === "open"
                ? "No outstanding maintenance issues anywhere on the property."
                : "No issues match this filter."
            }
            icon="bi-tools"
          >
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => setPickingRoom(true)}
            >
              Report something
            </button>
          </EmptyState>
        </section>
      ) : (
        <div className="shms-hk-board">
          {visible.map((issue) => (
            <article key={issue.id} className={`shms-hk-task is-${issue.status}`}>
              <div className="shms-hk-head">
                <div className="shms-hk-room">
                  <span className="shms-hk-number">{issue.roomNumber ?? "—"}</span>
                </div>
                <div className="shms-hk-badges">
                  <StatusBadge status={issue.status} domain="request" />
                  <StatusBadge status={issue.priority} domain="priority" />
                </div>
              </div>

              <div>
                <p className="shms-row-title" style={{ marginBottom: 4 }}>
                  {issue.title}
                </p>
                {issue.details && <p className="shms-row-meta">{issue.details}</p>}
              </div>

              <ul className="shms-hk-meta">
                <li>
                  <i className="bi bi-hash" aria-hidden="true" />
                  {issue.reference}
                </li>
                <li>
                  <i className="bi bi-clock" aria-hidden="true" />
                  {formatRelative(issue.createdAt)}
                </li>
                <li>
                  <i className="bi bi-person-gear" aria-hidden="true" />
                  {issue.assignedToName ?? "Unassigned"}
                </li>
              </ul>
            </article>
          ))}
        </div>
      )}

      {/* --------------------------------------------------- Pick a room */}
      {pickingRoom && (
        <section className="shms-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setPickingRoom(false)}>
          <div className="shms-modal" role="dialog" aria-modal="true" aria-label="Choose a room">
            <div className="shms-modal-head">
              <div>
                <h2 className="shms-modal-title">Which room?</h2>
                <p className="shms-modal-subtitle">
                  Rooms already out of service aren&apos;t listed.
                </p>
              </div>
              <button
                type="button"
                className="shms-modal-close"
                onClick={() => setPickingRoom(false)}
                aria-label="Close dialog"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="shms-modal-body">
              {reportable.length === 0 ? (
                <p>Every room is already out of service.</p>
              ) : (
                <div className="shms-room-grid">
                  {reportable.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`shms-room-tile is-${room.status}`}
                      onClick={() => {
                        setPickingRoom(false);
                        setReporting({ roomId: room.id, roomNumber: room.number });
                      }}
                    >
                      <span className="shms-room-number">{room.number}</span>
                      <span className="shms-room-type">{room.roomTypeName}</span>
                      <StatusBadge status={room.status} domain="room" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="shms-modal-foot">
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setPickingRoom(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
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

export default MaintenanceIssues;
