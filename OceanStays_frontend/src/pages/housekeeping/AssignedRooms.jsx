import { useCallback, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import ReportIssueModal from "../../components/housekeeping/ReportIssueModal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { inspectRoom, reportMaintenanceIssue } from "../../services/housekeepingService";
import { ROOM_STATUS, getRoomStatusSummary, getRooms } from "../../services/roomService";
import { getStatusMeta } from "../../utils/status";
import "../../styles/dashboard.css";
import "../../styles/housekeeping.css";

/**
 * The room board from housekeeping's side.
 *
 * Its job is inspection: a room sitting at CLEAN is waiting for somebody to
 * confirm it before it can be sold again, and this is where that happens.
 * Failing an inspection sends it back to the cleaning queue rather than
 * quietly releasing it.
 */

/** The chain a room walks after a guest leaves. */
const CHAIN = [ROOM_STATUS.DIRTY, ROOM_STATUS.CLEANING, ROOM_STATUS.CLEAN, ROOM_STATUS.INSPECTED];

const FILTERS = [
  { id: "attention", label: "Needs attention" },
  { id: "inspect", label: "To inspect" },
  { id: "all", label: "All rooms" },
];

function AssignedRooms() {
  const toast = useToast();

  const [filter, setFilter] = useState("attention");
  const [busyId, setBusyId] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [isReporting, setIsReporting] = useState(false);

  const loadRooms = useCallback(() => getRooms(), []);
  const { data, isLoading, error, reload } = useAsync(loadRooms);

  const loadSummary = useCallback(() => getRoomStatusSummary(), []);
  const summary = useAsync(loadSummary);

  const rooms = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      attention: rooms.filter((room) =>
        [ROOM_STATUS.DIRTY, ROOM_STATUS.CLEANING, ROOM_STATUS.MAINTENANCE].includes(room.status),
      ).length,
      inspect: rooms.filter((room) => room.status === ROOM_STATUS.CLEAN).length,
      all: rooms.length,
    }),
    [rooms],
  );

  const visible = useMemo(() => {
    if (filter === "attention") {
      return rooms.filter((room) =>
        [ROOM_STATUS.DIRTY, ROOM_STATUS.CLEANING, ROOM_STATUS.MAINTENANCE].includes(room.status),
      );
    }
    if (filter === "inspect") return rooms.filter((room) => room.status === ROOM_STATUS.CLEAN);
    return rooms;
  }, [rooms, filter]);

  async function handleInspect(room, passed) {
    setBusyId(room.id);
    try {
      await inspectRoom(room.id, { passed });
      toast.success(
        passed
          ? `Room ${room.number} passed inspection and is back in stock.`
          : `Room ${room.number} sent back for re-cleaning.`,
        { title: passed ? "Released" : "Returned to the queue" },
      );
      reload();
      summary.reload();
    } catch (inspectError) {
      toast.error(inspectError.message || "We couldn't record that inspection.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReport(payload) {
    setIsReporting(true);
    try {
      const created = await reportMaintenanceIssue(payload);
      toast.success(`${created.reference} raised for room ${payload.roomNumber}.`, {
        title: "Issue reported",
      });
      setReporting(null);
      reload();
      summary.reload();
    } catch (reportError) {
      toast.error(reportError.message || "We couldn't report that issue.");
    } finally {
      setIsReporting(false);
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load the rooms" message={error.message} onRetry={reload} />;
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
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="shms-skeleton"
              style={{ height: 210, borderRadius: "var(--radius-lg)" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <section className="shms-panel">
          <EmptyState
            title={filter === "inspect" ? "Nothing to inspect" : "Nothing needs attention"}
            message={
              filter === "inspect"
                ? "No rooms are waiting for an inspection right now."
                : "Every room is either clean, inspected or occupied."
            }
            icon="bi-check2-circle"
          >
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => setFilter("all")}
            >
              Show all rooms
            </button>
          </EmptyState>
        </section>
      ) : (
        <div className="shms-hk-board">
          {visible.map((room) => {
            const isBusy = busyId === room.id;
            const chainIndex = CHAIN.indexOf(room.status);

            return (
              <article key={room.id} className={`shms-hk-task is-${room.status}`}>
                <div className="shms-hk-head">
                  <div className="shms-hk-room">
                    <span className="shms-hk-number">{room.number}</span>
                    <span className="shms-hk-type">{room.roomTypeName}</span>
                  </div>
                  <div className="shms-hk-badges">
                    <StatusBadge status={room.status} domain="room" />
                  </div>
                </div>

                <ul className="shms-hk-meta">
                  <li>
                    <i className="bi bi-building" aria-hidden="true" />
                    {room.floor === 0 ? "Garden villas" : `Floor ${room.floor}`}
                  </li>
                </ul>

                {/* Where this room sits in the turnaround. */}
                {chainIndex >= 0 && (
                  <ul className="shms-chain">
                    {CHAIN.map((status, index) => (
                      <li
                        key={status}
                        className={
                          index < chainIndex ? "is-done" : index === chainIndex ? "is-current" : ""
                        }
                      >
                        {getStatusMeta(status, "room").label}
                      </li>
                    ))}
                  </ul>
                )}

                {room.housekeepingNote && (
                  <p className="shms-hk-note">
                    <i className="bi bi-sticky" aria-hidden="true" />
                    {room.housekeepingNote}
                  </p>
                )}

                <div className="shms-hk-actions">
                  {room.status === ROOM_STATUS.CLEAN ? (
                    <>
                      <button
                        type="button"
                        className="shms-hk-btn shms-hk-btn-inspect"
                        onClick={() => handleInspect(room, true)}
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
                            <i className="bi bi-clipboard-check" aria-hidden="true" />
                            Pass inspection
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="shms-hk-btn shms-hk-btn-outline"
                        onClick={() => handleInspect(room, false)}
                        disabled={isBusy}
                      >
                        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                        Send back for re-clean
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="shms-hk-btn shms-hk-btn-outline"
                      onClick={() => setReporting({ roomId: room.id, roomNumber: room.number })}
                      disabled={isBusy || room.status === ROOM_STATUS.MAINTENANCE}
                    >
                      <i className="bi bi-tools" aria-hidden="true" />
                      {room.status === ROOM_STATUS.MAINTENANCE
                        ? "Already out of service"
                        : "Report an issue"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
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

export default AssignedRooms;
