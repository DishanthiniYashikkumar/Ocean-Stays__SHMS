import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  ROLE_LABELS,
  STAFF_ROLES,
  getStaff,
  updateUserStatus,
} from "../../services/userService";
import { getServiceRequests } from "../../services/serviceRequestService";
import { formatDate } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * The staff directory.
 *
 * Reuses `getUsers` filtered to STAFF_ROLES rather than adding a staff service —
 * staff are users with a staff role, and modelling them separately would mean
 * two places to keep a person's details in step.
 */

const ROLE_FILTER = [
  { value: "", label: "All roles" },
  ...STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
];

const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

/** A member of staff's current workload, loaded only when their card opens. */
function StaffWorkload({ staffId }) {
  const load = useCallback(
    () => getServiceRequests({ assignedToId: staffId, pageSize: 100 }),
    [staffId],
  );
  const { data, isLoading, error } = useAsync(load);

  if (isLoading) {
    return <div className="shms-skeleton shms-skeleton-text" aria-hidden="true" />;
  }
  if (error) return <p className="shms-row-meta">Couldn&apos;t load their workload.</p>;

  const items = data?.items ?? [];
  if (items.length === 0) {
    return <p className="shms-row-meta">No requests assigned to this person.</p>;
  }

  return (
    <ul className="shms-rows" style={{ margin: 0 }}>
      {items.map((request) => (
        <li key={request.id}>
          <div className="shms-row" style={{ paddingInline: 0 }}>
            <div className="shms-row-copy">
              <p className="shms-row-title">
                {request.title}
                <StatusBadge status={request.status} domain="request" />
              </p>
              <p className="shms-row-meta">
                {request.reference}
                {request.roomNumber && ` · Room ${request.roomNumber}`}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lets an address wrap before "@" and after each dot instead of mid-word,
 * e.g. "anjali.fernando" / "@housekeeping." / "com".
 */
function breakableEmail(email) {
  return email
    .split(/(?=@)|(?<=\.)/)
    .flatMap((part, index) => (index ? [<wbr key={index} />, part] : [part]));
}

function Staff() {
  const toast = useToast();

  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(() => getStaff(), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    let items = data ?? [];
    if (role) items = items.filter((item) => item.role === role);
    if (status) items = items.filter((item) => item.status === status);
    return items;
  }, [data, role, status]);

  async function handleToggleStatus() {
    const person = confirming;
    const next = person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirming(null);

    try {
      await updateUserStatus(person.id, next);
      toast.success(
        next === "ACTIVE"
          ? `${person.name} is back on the roster.`
          : `${person.name} is no longer available for assignment.`,
      );
      reload();
    } catch (statusError) {
      toast.error(statusError.message || "We couldn't change that record.");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      width: "14%",
      className: "shms-col-nowrap",
      render: (row) => <span className="shms-cell-strong">{row.name}</span>,
    },
    { key: "department", header: "Department", sortable: true, width: "12%" },
    {
      key: "role",
      header: "Role",
      sortable: true,
      width: "13%",
      render: (row) => ROLE_LABELS[row.role] ?? row.role,
    },
    { key: "phone", header: "Contact", width: "12%", className: "shms-col-nowrap" },
    {
      key: "email",
      header: "Email",
      sortable: true,
      width: "19%",
      className: "shms-col-email",
      render: (row) =>
        row.email ? breakableEmail(row.email) : <span className="shms-cell-muted">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "10%",
      align: "center",
      render: (row) => <StatusBadge status={row.status} domain="user" />,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      width: "9%",
      className: "shms-col-nowrap",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      width: "11%",
      render: (row) => (
        <div className="shms-row-actions shms-staff-actions">
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => setDetail(row)}
          >
            View
          </button>
          <button
            type="button"
            className={`shms-btn shms-btn-sm ${row.status === "ACTIVE" ? "shms-btn-danger" : "shms-btn-primary"}`}
            onClick={() => setConfirming(row)}
          >
            {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        className="shms-staff-table"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search name, email or department"
        searchKeys={["name", "email", "department", "phone"]}
        filters={[
          { id: "role", label: "Role", value: role, options: ROLE_FILTER, onChange: setRole },
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="Staff directory"
        emptyState={{
          title: "No staff found",
          message: "Try clearing a filter. Staff accounts are created on the Users page.",
          icon: "bi-person-badge",
        }}
      />

      {detail && (
        <Modal
          title={detail.name}
          subtitle={`${ROLE_LABELS[detail.role]} · ${detail.department ?? "No department"}`}
          icon="bi-person-badge"
          size="lg"
          onClose={() => setDetail(null)}
          footer={
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          }
        >
          <dl className="shms-defs" style={{ marginBottom: "var(--space-6)" }}>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={detail.status} domain="user" />
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detail.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{detail.phone}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{formatDate(detail.lastLoginAt)}</dd>
            </div>
          </dl>

          <p className="shms-label">Current workload</p>
          <StaffWorkload staffId={detail.id} />
        </Modal>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.status === "ACTIVE" ? "Take off the roster?" : "Return to the roster?"}
          message={
            confirming.status === "ACTIVE"
              ? `${confirming.name} will stop appearing in assignment lists and won't be able to sign in. Anything already assigned to them stays assigned — reassign it first if somebody else needs to pick it up.`
              : `${confirming.name} will be able to sign in and take assignments again.`
          }
          confirmLabel={confirming.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
          cancelLabel="Keep as is"
          tone={confirming.status === "ACTIVE" ? "danger" : "default"}
          icon={confirming.status === "ACTIVE" ? "bi-person-slash" : "bi-person-check"}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
}

export default Staff;
