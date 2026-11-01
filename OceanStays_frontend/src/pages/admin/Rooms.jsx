import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import FormField from "../../components/common/FormField";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { ROOM_STATUS, getRoomStatusSummary, getRooms, updateRoomStatus } from "../../services/roomService";
import { getStatusMeta } from "../../utils/status";
import { formatCurrency } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Room inventory.
 *
 * Uses the nine-state ROOM_STATUS chain the rest of the app already runs on —
 * see services/constants.js. Introducing an admin-only status vocabulary would put this
 * screen out of step with reception's board and housekeeping's turnaround.
 */

const STATUS_ORDER = [
  ROOM_STATUS.AVAILABLE,
  ROOM_STATUS.INSPECTED,
  ROOM_STATUS.RESERVED,
  ROOM_STATUS.DIRTY,
  ROOM_STATUS.MAINTENANCE,
];

// Labels shown on this page only; the stored value stays MAINTENANCE.
const STATUS_LABELS = {
  [ROOM_STATUS.MAINTENANCE]: "Maintaining",
};

const STATUS_OPTIONS = STATUS_ORDER.map((status) => ({
  value: status,
  label: STATUS_LABELS[status] ?? getStatusMeta(status, "room").label,
}));

const STATUS_FILTER = [{ value: "", label: "All statuses" }, ...STATUS_OPTIONS];

function Rooms() {
  const toast = useToast();

  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => getRooms(), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const loadSummary = useCallback(() => getRoomStatusSummary(), []);
  const summary = useAsync(loadSummary);

  const rows = useMemo(() => {
    const items = data ?? [];
    return status ? items.filter((room) => room.status === status) : items;
  }, [data, status]);

  async function handleSave() {
    if (nextStatus === editing.status) {
      setEditing(null);
      return;
    }

    setIsSaving(true);
    try {
      await updateRoomStatus(editing.id, nextStatus);
      toast.success(
        `Room ${editing.number} set to ${(STATUS_LABELS[nextStatus] ?? getStatusMeta(nextStatus, "room").label).toLowerCase()}.`,
      );
      setEditing(null);
      reload();
      summary.reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't update that room.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "number",
      header: "Room",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.number}</span>,
    },
    { key: "roomTypeName", header: "Type", sortable: true },
    {
      key: "floor",
      header: "Floor",
      sortable: true,
      align: "center",
      render: (row) => (row.floor === 0 ? "Villa" : row.floor),
    },
    {
      key: "pricePerNight",
      header: "Rate",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="shms-cell-numeric">{formatCurrency(row.pricePerNight)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="room" />,
    },
    {
      key: "housekeepingNote",
      header: "Note",
      render: (row) => row.housekeepingNote || <span className="shms-cell-muted">—</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="shms-row-actions">
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => {
              setEditing(row);
              setNextStatus(row.status);
            }}
          >
            Change status
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Summary tiles double as a legend for the turnaround chain. */}
      {!summary.isLoading && summary.data && (
        <div className="shms-stats">
          {[
            { key: "AVAILABLE", icon: "bi-door-open", tone: "shms-stat-icon-success" },
            { key: "OCCUPIED", icon: "bi-person-check", tone: "shms-stat-icon-gold" },
            { key: "DIRTY", icon: "bi-basket", tone: "shms-stat-icon-warning" },
            { key: "MAINTENANCE", icon: "bi-tools", tone: "" },
          ].map(({ key, icon, tone }) => (
            <article className="shms-stat" key={key}>
              <span className={`shms-stat-icon ${tone}`.trim()} aria-hidden="true">
                <i className={`bi ${icon}`} />
              </span>
              <span className="shms-stat-copy">
                <span className="shms-stat-value">{summary.data[key] ?? 0}</span>
                <span className="shms-stat-label">
                  {getStatusMeta(key, "room").label}
                </span>
              </span>
            </article>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search room number or type"
        searchKeys={["number", "roomTypeName", "housekeepingNote"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="Room inventory"
        emptyState={{
          title: "No rooms found",
          message: "Try clearing the status filter.",
          icon: "bi-door-closed",
        }}
      />

      {editing && (
        <Modal
          title={`Room ${editing.number}`}
          subtitle={`${editing.roomTypeName}${editing.floor > 0 ? ` · Floor ${editing.floor}` : " · Garden villa"}`}
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
          <FormField
            id="room-status"
            name="status"
            label="Room status"
            type="select"
            options={STATUS_OPTIONS}
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
            required
            disabled={isSaving}
            hint="Changing this here overrides the housekeeping chain — use it to correct a mistake, not as part of the normal turnaround."
          />
        </Modal>
      )}
    </>
  );
}

export default Rooms;
