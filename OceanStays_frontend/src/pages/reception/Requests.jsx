import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  NEXT_STATUSES,
  REQUEST_STATUS,
  REQUEST_TYPE_META,
  assignRequest,
  getServiceRequests,
  updateRequestStatus,
} from "../../services/serviceRequestService";
import { getStaff } from "../../services/userService";
import { ROLES } from "../../services/roles";
import { getStatusMeta } from "../../utils/status";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * The request queue. Reception triages what comes in: assigns it to a member of
 * service staff, or moves it along the workflow.
 *
 * Which statuses a request can move to comes from NEXT_STATUSES in the service,
 * so the buttons and the service can never disagree about a valid transition.
 */

const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: REQUEST_STATUS.PENDING, label: "Pending" },
  { value: REQUEST_STATUS.ASSIGNED, label: "Assigned" },
  { value: REQUEST_STATUS.IN_PROGRESS, label: "In progress" },
  { value: REQUEST_STATUS.COMPLETED, label: "Completed" },
  { value: REQUEST_STATUS.CANCELLED, label: "Cancelled" },
];

function Requests() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => getServiceRequests({ pageSize: 200 }), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const loadStaff = useCallback(() => getStaff(ROLES.SERVICE_STAFF), []);
  const staff = useAsync(loadStaff);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return status ? items.filter((item) => item.status === status) : items;
  }, [data, status]);

  function openDetail(request) {
    setDetail(request);
    setStaffId(request.assignedToId ?? "");
  }

  async function handleAssign() {
    const member = staff.data?.find((person) => person.id === staffId);
    if (!member) return;

    setIsSaving(true);
    try {
      await assignRequest(detail.id, { staffId: member.id, staffName: member.name });
      toast.success(`${detail.reference} assigned to ${member.name}.`);
      setDetail(null);
      reload();
    } catch (assignError) {
      toast.error(assignError.message || "We couldn't assign that request.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdvance(request, next) {
    setIsSaving(true);
    try {
      await updateRequestStatus(request.id, next);
      toast.success(
        `${request.reference} moved to ${getStatusMeta(next, "request").label.toLowerCase()}.`,
      );
      setDetail(null);
      reload();
    } catch (advanceError) {
      toast.error(advanceError.message || "We couldn't update that request.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "reference",
      header: "Request",
      sortable: true,
      render: (row) => {
        const meta = REQUEST_TYPE_META[row.type] ?? { label: row.type, icon: "bi-bell" };
        return (
          <>
            <span className="shms-cell-strong">{row.title}</span>
            <br />
            <span className="shms-cell-muted">
              {row.reference} · {meta.label}
            </span>
          </>
        );
      },
    },
    {
      key: "guestName",
      header: "Guest",
      sortable: true,
      render: (row) => (
        <>
          {row.guestName ?? "—"}
          <br />
          <span className="shms-cell-muted">
            {row.roomNumber ? `Room ${row.roomNumber}` : "No room"}
          </span>
        </>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => <StatusBadge status={row.priority} domain="priority" />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="request" />,
    },
    {
      key: "assignedToName",
      header: "Assigned to",
      sortable: true,
      render: (row) => row.assignedToName ?? <span className="shms-cell-muted">Unassigned</span>,
    },
    {
      key: "createdAt",
      header: "Raised",
      sortable: true,
      render: (row) => formatRelative(row.createdAt),
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
            onClick={() => openDetail(row)}
          >
            Manage
          </button>
        </div>
      ),
    },
  ];

  const transitions = detail ? (NEXT_STATUSES[detail.status] ?? []) : [];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search request, guest or room"
        searchKeys={["reference", "title", "guestName", "roomNumber"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="Guest service requests"
        emptyState={{
          title: "No requests",
          message: "Requests raised by guests or staff will appear here.",
          icon: "bi-bell",
        }}
      />

      {detail && (
        <Modal
          title={detail.title}
          subtitle={`${detail.reference} · ${REQUEST_TYPE_META[detail.type]?.label ?? detail.type}`}
          icon={REQUEST_TYPE_META[detail.type]?.icon ?? "bi-bell"}
          size="lg"
          dismissible={!isSaving}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setDetail(null)}
                disabled={isSaving}
              >
                Close
              </button>
              {detail.status === REQUEST_STATUS.PENDING ? (
                <button
                  type="button"
                  className="shms-btn shms-btn-primary"
                  onClick={handleAssign}
                  disabled={!staffId || isSaving}
                  aria-busy={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="shms-spinner" aria-hidden="true" />
                      Assigning&hellip;
                    </>
                  ) : (
                    "Assign"
                  )}
                </button>
              ) : (
                transitions
                  .filter((next) => next !== REQUEST_STATUS.CANCELLED)
                  .map((next) => (
                    <button
                      key={next}
                      type="button"
                      className="shms-btn shms-btn-primary"
                      onClick={() => handleAdvance(detail, next)}
                      disabled={isSaving}
                    >
                      Mark {getStatusMeta(next, "request").label.toLowerCase()}
                    </button>
                  ))
              )}
            </>
          }
        >
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
            <StatusBadge status={detail.status} domain="request" />
            <StatusBadge status={detail.priority} domain="priority" />
          </div>

          <dl className="shms-defs" style={{ marginBottom: "var(--space-5)" }}>
            <div>
              <dt>Guest</dt>
              <dd>{detail.guestName ?? "—"}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{detail.roomNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Raised</dt>
              <dd>{formatRelative(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>{detail.assignedToName ?? "Unassigned"}</dd>
            </div>
          </dl>

          {detail.details && (
            <div style={{ marginBottom: "var(--space-5)" }}>
              <p className="shms-label">Details</p>
              <p className="shms-row-meta" style={{ fontSize: "var(--text-sm)" }}>
                {detail.details}
              </p>
            </div>
          )}

          {detail.status === REQUEST_STATUS.PENDING && (
            <div className="shms-field">
              <label className="shms-label" htmlFor="assign-staff">
                Assign to service staff
              </label>
              <div className="shms-input-shell">
                <select
                  id="assign-staff"
                  className="shms-input shms-input-bare"
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value)}
                  disabled={isSaving || staff.isLoading}
                >
                  <option value="">Choose a member of staff…</option>
                  {(staff.data ?? []).map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              {staff.data?.length === 0 && !staff.isLoading && (
                <p className="shms-field-hint">
                  No active service staff are available to take this.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default Requests;
