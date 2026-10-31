import { useCallback, useMemo, useState } from "react";
import ErrorState from "../../components/common/ErrorState";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { ROOM_STATUS, getRoomStatusSummary, getRooms, updateRoomStatus } from "../../services/roomService";
import { getStatusMeta } from "../../utils/status";
import "../../styles/dashboard.css";

/**
 * The room board: every room grouped by floor, with its status changeable in
 * place.
 *
 * Reception needs to see the whole property at a glance more than it needs a
 * table, so this is a grid with a colour rail per status rather than rows.
 */

/** Ordered along the turnaround chain, so the board reads left to right. */
const STATUS_ORDER = [
  ROOM_STATUS.AVAILABLE,
  ROOM_STATUS.READY,
  ROOM_STATUS.INSPECTED,
  ROOM_STATUS.RESERVED,
  ROOM_STATUS.OCCUPIED,
  ROOM_STATUS.DIRTY,
  ROOM_STATUS.CLEANING,
  ROOM_STATUS.CLEAN,
  ROOM_STATUS.MAINTENANCE,
];

function RoomAllocation() {
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadRooms = useCallback(() => getRooms(), []);
  const rooms = useAsync(loadRooms);

  const loadSummary = useCallback(() => getRoomStatusSummary(), []);
  const summary = useAsync(loadSummary);

  const visible = useMemo(() => {
    const items = rooms.data ?? [];
    return filter ? items.filter((room) => room.status === filter) : items;
  }, [rooms.data, filter]);

  /** Grouped by floor, villas (floor 0) last. */
  const floors = useMemo(() => {
    const groups = new Map();
    visible.forEach((room) => {
      if (!groups.has(room.floor)) groups.set(room.floor, []);
      groups.get(room.floor).push(room);
    });

    return [...groups.entries()]
      .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b))
      .map(([floor, items]) => ({
        floor,
        label: floor === 0 ? "Garden villas" : `Floor ${floor}`,
        items: [...items].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
      }));
  }, [visible]);

  function openEditor(room) {
    setEditing(room);
    setNextStatus(room.status);
  }

  async function handleSave() {
    if (nextStatus === editing.status) {
      setEditing(null);
      return;
    }

    setIsSaving(true);
    try {
      await updateRoomStatus(editing.id, nextStatus);
      toast.success(
        `Room ${editing.number} is now ${getStatusMeta(nextStatus, "room").label.toLowerCase()}.`,
      );
      setEditing(null);
      rooms.reload();
      summary.reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't update that room.");
    } finally {
      setIsSaving(false);
    }
  }

  if (rooms.error) {
    return <ErrorState title="We couldn't load the rooms" message={rooms.error.message} onRetry={rooms.reload} />;
  }

  return (
    <>
      {/* ---------------------------------------------------- Status filter */}
      <ul className="shms-tabs">
        <li>
          <button
            type="button"
            className="shms-tab"
            aria-pressed={filter === ""}
            onClick={() => setFilter("")}
          >
            All rooms
            <span className="shms-tab-count">{summary.data?.total ?? 0}</span>
          </button>
        </li>
        {STATUS_ORDER.map((status) => (
          <li key={status}>
            <button
              type="button"
              className="shms-tab"
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
            >
              {getStatusMeta(status, "room").label}
              <span className="shms-tab-count">{summary.data?.[status] ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>

      {rooms.isLoading ? (
        <div className="shms-room-grid">
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              className="shms-skeleton"
              style={{ height: 118, borderRadius: "var(--radius-md)" }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : floors.length === 0 ? (
        <section className="shms-panel">
          <div className="shms-state" style={{ padding: "var(--space-12) var(--space-6)" }}>
            <span className="shms-state-icon" aria-hidden="true">
              <i className="bi bi-door-closed" />
            </span>
            <h2 className="shms-state-title">No rooms with that status</h2>
            <p className="shms-state-message">
              Nothing is currently {getStatusMeta(filter, "room").label.toLowerCase()}.
            </p>
            <div className="shms-state-actions">
              <button type="button" className="shms-btn shms-btn-primary" onClick={() => setFilter("")}>
                Show all rooms
              </button>
            </div>
          </div>
        </section>
      ) : (
        floors.map(({ floor, label, items }) => (
          <div className="shms-floor" key={floor}>
            <div className="shms-floor-head">
              <h3>{label}</h3>
              <span>
                {items.length} {items.length === 1 ? "room" : "rooms"}
              </span>
            </div>

            <div className="shms-room-grid">
              {items.map((room) => (
                <button
                  type="button"
                  key={room.id}
                  className={`shms-room-tile is-${room.status}`}
                  onClick={() => openEditor(room)}
                  aria-label={`Room ${room.number}, ${getStatusMeta(room.status, "room").label}. Change status.`}
                >
                  <span className="shms-room-number">{room.number}</span>
                  <span className="shms-room-type">{room.roomTypeName}</span>
                  <StatusBadge status={room.status} domain="room" />
                  {room.housekeepingNote && (
                    <span className="shms-room-note">{room.housekeepingNote}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {/* -------------------------------------------------- Change status */}
      {editing && (
        <Modal
          title={`Room ${editing.number}`}
          subtitle={`${editing.roomTypeName}${editing.floor > 0 ? ` · Floor ${editing.floor}` : ""}`}
          icon="bi-door-open"
          dismissible={!isSaving}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="shms-btn shms-btn-primary"
                onClick={handleSave}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="shms-spinner" aria-hidden="true" />
                    Saving&hellip;
                  </>
                ) : (
                  "Update status"
                )}
              </button>
            </>
          }
        >
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="shms-label" style={{ marginBottom: "var(--space-3)" }}>
              Room status
            </legend>

            <div className="shms-methods">
              {STATUS_ORDER.map((status) => (
                <label
                  key={status}
                  className={`shms-method${nextStatus === status ? " is-selected" : ""}`}
                  htmlFor={`status-${status}`}
                >
                  <input
                    id={`status-${status}`}
                    type="radio"
                    name="status"
                    value={status}
                    checked={nextStatus === status}
                    onChange={() => setNextStatus(status)}
                    disabled={isSaving}
                  />
                  <span className="shms-method-copy">
                    <strong>{getStatusMeta(status, "room").label}</strong>
                    <span>
                      {status === ROOM_STATUS.AVAILABLE && "Free to sell"}
                      {status === ROOM_STATUS.READY && "Prepared for an arrival"}
                      {status === ROOM_STATUS.INSPECTED && "Passed inspection — sellable"}
                      {status === ROOM_STATUS.RESERVED && "Held for an arriving guest"}
                      {status === ROOM_STATUS.OCCUPIED && "A guest is in house"}
                      {status === ROOM_STATUS.DIRTY && "Departed — awaiting cleaning"}
                      {status === ROOM_STATUS.CLEANING && "With housekeeping now"}
                      {status === ROOM_STATUS.CLEAN && "Cleaned — awaiting inspection"}
                      {status === ROOM_STATUS.MAINTENANCE && "Out of service"}
                    </span>
                  </span>
                  <StatusBadge status={status} domain="room" />
                </label>
              ))}
            </div>
          </fieldset>

          {editing.housekeepingNote && (
            <p className="shms-booking-note" style={{ marginTop: "var(--space-4)" }}>
              <i className="bi bi-sticky" aria-hidden="true" style={{ color: "var(--warning)" }} />
              {editing.housekeepingNote}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

export default RoomAllocation;
