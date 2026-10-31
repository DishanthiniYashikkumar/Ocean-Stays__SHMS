import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { checkInBooking, getFrontDeskSummary } from "../../services/bookingService";
import { SELLABLE_STATUSES, getRooms } from "../../services/roomService";
import { formatCurrency, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Today's arrivals, and the allocation step that turns one into an in-house
 * guest.
 *
 * A room can only be offered if it is free *and* of the type booked — offering
 * a Lagoon Double to someone who paid for a Garden Villa is the kind of mistake
 * a front desk system should make impossible rather than merely discourage.
 */

// A room is only offered once housekeeping has released it — see
// SELLABLE_STATUSES in mock/rooms.js for the turnaround chain.
const ALLOCATABLE = SELLABLE_STATUSES;

function CheckIn() {
  const toast = useToast();
  const [allocating, setAllocating] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadDesk = useCallback(() => getFrontDeskSummary(), []);
  const desk = useAsync(loadDesk);

  const loadRooms = useCallback(() => getRooms(), []);
  const rooms = useAsync(loadRooms);

  const arrivals = useMemo(() => desk.data?.arrivals ?? [], [desk.data]);

  /** Free rooms matching the booked room type. */
  const candidates = useMemo(() => {
    if (!allocating || !rooms.data) return [];
    return rooms.data.filter(
      (room) => room.roomTypeId === allocating.roomTypeId && ALLOCATABLE.includes(room.status),
    );
  }, [allocating, rooms.data]);

  function openAllocation(booking) {
    setAllocating(booking);
    setSelectedRoomId("");
  }

  async function handleCheckIn() {
    if (!selectedRoomId) return;
    const room = candidates.find((item) => item.id === selectedRoomId);

    setIsSaving(true);
    try {
      await checkInBooking(allocating.id, { roomId: room.id, roomNumber: room.number });
      // The room is now occupied — keep the inventory honest.
      toast.success(`${allocating.guestName} checked into room ${room.number}.`, {
        title: "Checked in",
      });
      setAllocating(null);
      desk.reload();
      rooms.reload();
    } catch (checkInError) {
      toast.error(checkInError.message || "We couldn't complete that check-in.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "guestName",
      header: "Guest",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">{row.guestName}</span>
          <br />
          <span className="shms-cell-muted">{row.guestPhone}</span>
        </>
      ),
    },
    { key: "reference", header: "Reference", sortable: true },
    { key: "roomTypeName", header: "Room type", sortable: true },
    {
      key: "checkIn",
      header: "Stay",
      sortable: true,
      render: (row) => formatDateRange(row.checkIn, row.checkOut),
    },
    {
      key: "guests",
      header: "Guests",
      align: "center",
      render: (row) => row.guests.adults + row.guests.children,
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      render: (row) => <StatusBadge status={row.paymentStatus} domain="payment" />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="shms-row-actions">
          <button
            type="button"
            className="shms-btn shms-btn-primary shms-btn-sm"
            onClick={() => openAllocation(row)}
          >
            <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
            Check in
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={arrivals}
        rowKey={(row) => row.id}
        isLoading={desk.isLoading}
        error={desk.error}
        onRetry={desk.reload}
        searchPlaceholder="Search guest or reference"
        searchKeys={["guestName", "reference", "roomTypeName", "guestEmail"]}
        caption="Guests arriving today"
        emptyState={{
          title: "No arrivals today",
          message: "Nobody is due to check in. Tomorrow's arrivals appear here from midnight.",
          icon: "bi-calendar2-check",
        }}
      />

      {/* ------------------------------------------------ Allocate & check in */}
      {allocating && (
        <Modal
          title="Allocate a room"
          subtitle={`${allocating.guestName} · ${allocating.roomTypeName} · ${allocating.nights} nights`}
          icon="bi-box-arrow-in-right"
          dismissible={!isSaving}
          onClose={() => setAllocating(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setAllocating(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="shms-btn shms-btn-primary"
                onClick={handleCheckIn}
                disabled={!selectedRoomId || isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="shms-spinner" aria-hidden="true" />
                    Checking in&hellip;
                  </>
                ) : (
                  "Confirm check-in"
                )}
              </button>
            </>
          }
        >
          {allocating.paymentStatus === "PENDING" && (
            <div className="shms-alert" role="alert" style={{ marginBottom: "var(--space-5)" }}>
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span>
                {formatCurrency(allocating.total, allocating.currency)} is still outstanding on
                this booking. Take payment at the desk or settle it at check-out.
              </span>
            </div>
          )}

          {rooms.isLoading ? (
            <div className="shms-skeleton" style={{ height: 120 }} aria-hidden="true" />
          ) : candidates.length === 0 ? (
            <div className="shms-state" style={{ padding: "var(--space-8) 0" }}>
              <span className="shms-state-icon shms-state-icon-danger" aria-hidden="true">
                <i className="bi bi-door-closed" />
              </span>
              <h3 className="shms-state-title">No {allocating.roomTypeName} free</h3>
              <p className="shms-state-message">
                Every room of this type is occupied, being cleaned or under maintenance. Free one
                up on the Room Allocation page, or move the guest to another category.
              </p>
            </div>
          ) : (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="shms-label" style={{ marginBottom: "var(--space-3)" }}>
                Available {allocating.roomTypeName} rooms
              </legend>

              <div className="shms-methods">
                {candidates.map((room) => (
                  <label
                    key={room.id}
                    className={`shms-method${selectedRoomId === room.id ? " is-selected" : ""}`}
                    htmlFor={`room-${room.id}`}
                  >
                    <input
                      id={`room-${room.id}`}
                      type="radio"
                      name="room"
                      value={room.id}
                      checked={selectedRoomId === room.id}
                      onChange={() => setSelectedRoomId(room.id)}
                      disabled={isSaving}
                    />
                    <i className="bi bi-door-open" aria-hidden="true" />
                    <span className="shms-method-copy">
                      <strong>
                        Room {room.number}
                        {room.floor > 0 ? ` · Floor ${room.floor}` : ""}
                      </strong>
                      <span>{room.housekeepingNote || "Ready for arrival"}</span>
                    </span>
                    <StatusBadge status={room.status} domain="room" />
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Modal>
      )}
    </>
  );
}

export default CheckIn;
