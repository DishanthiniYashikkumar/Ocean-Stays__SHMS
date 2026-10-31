import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import DataTable from "../common/DataTable";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  NEXT_STATUSES,
  REQUEST_STATUS,
  REQUEST_TYPE_META,
  assignRequest,
  cancelServiceRequest,
  getServiceRequests,
  updateRequestStatus,
} from "../../services/serviceRequestService";
import { getStatusMeta } from "../../utils/status";
import { formatDateTime, formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * The service staff work queue.
 *
 * Every type-specific page — room service, dining, transport, maintenance —
 * is this component with a different `type`, because the work is identical and
 * only the filter differs. Writing five near-identical pages would mean fixing
 * every bug five times.
 *
 * Valid transitions come from NEXT_STATUSES in the service, so the buttons and
 * the service can never disagree about what a request may do next.
 *
 * @param {{
 *   type?: string,          A REQUEST_TYPE, or omitted for every type
 *   title: string,          Used in empty-state copy
 *   emptyIcon?: string
 * }} props
 */

const OPEN_STATUSES = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.ASSIGNED,
  REQUEST_STATUS.IN_PROGRESS,
];

const SCOPES = [
  { id: "mine", label: "Mine", icon: "bi-person" },
  { id: "unassigned", label: "Unassigned", icon: "bi-inbox" },
  { id: "all", label: "Everything", icon: "bi-list-ul" },
];

const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: REQUEST_STATUS.PENDING, label: "Pending" },
  { value: REQUEST_STATUS.ASSIGNED, label: "Assigned" },
  { value: REQUEST_STATUS.IN_PROGRESS, label: "In progress" },
  { value: REQUEST_STATUS.COMPLETED, label: "Completed" },
  { value: REQUEST_STATUS.CANCELLED, label: "Cancelled" },
];

/** How each forward transition is presented. */
const TRANSITION_UI = {
  [REQUEST_STATUS.IN_PROGRESS]: { label: "Start", icon: "bi-play-fill" },
  [REQUEST_STATUS.COMPLETED]: { label: "Complete", icon: "bi-check-lg" },
  [REQUEST_STATUS.ASSIGNED]: { label: "Assign", icon: "bi-person-check" },
};

/**
 * The one action that matters most for a request in this state.
 *
 * Forward transitions are read from NEXT_STATUSES rather than restated here,
 * so a change to the workflow in the service reaches these buttons for free.
 * Cancelling is excluded — it is deliberately a secondary action behind a
 * confirmation, not a one-tap button in a table row.
 */
function primaryAction(request, userId) {
  // Anyone may take an unclaimed request; that is how the queue drains.
  if (request.status === REQUEST_STATUS.PENDING) {
    return { label: "Take it", icon: "bi-hand-index", next: null, claim: true };
  }

  // Beyond that, only the person holding it moves it along.
  if (request.assignedToId !== userId) return null;

  const next = (NEXT_STATUSES[request.status] ?? []).find(
    (candidate) => candidate !== REQUEST_STATUS.CANCELLED,
  );
  if (!next) return null;

  return { ...(TRANSITION_UI[next] ?? { label: "Advance", icon: "bi-arrow-right" }), next };
}

function RequestQueue({ type, title, emptyIcon = "bi-bell" }) {
  const { user } = useAuth();
  const toast = useToast();

  const [scope, setScope] = useState("mine");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(
    () => getServiceRequests({ type, pageSize: 200 }),
    [type],
  );
  const { data, isLoading, error, reload } = useAsync(load);

  const items = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(
    () => ({
      mine: items.filter((item) => item.assignedToId === user.id).length,
      unassigned: items.filter(
        (item) => !item.assignedToId && OPEN_STATUSES.includes(item.status),
      ).length,
      all: items.length,
    }),
    [items, user.id],
  );

  const rows = useMemo(() => {
    let visible = items;

    if (scope === "mine") visible = visible.filter((item) => item.assignedToId === user.id);
    if (scope === "unassigned") {
      visible = visible.filter(
        (item) => !item.assignedToId && OPEN_STATUSES.includes(item.status),
      );
    }
    if (status) visible = visible.filter((item) => item.status === status);

    return visible;
  }, [items, scope, status, user.id]);

  /* ---- Actions ---------------------------------------------------------- */

  async function run(request, work, message) {
    setBusyId(request.id);
    try {
      await work();
      toast.success(message);
      setDetail(null);
      reload();
    } catch (actionError) {
      toast.error(actionError.message || "We couldn't update that request.");
    } finally {
      setBusyId(null);
    }
  }

  function handleClaim(request) {
    return run(
      request,
      () => assignRequest(request.id, { staffId: user.id, staffName: user.name }),
      `${request.reference} is yours.`,
    );
  }

  function handleAdvance(request, next) {
    return run(
      request,
      () => updateRequestStatus(request.id, next),
      `${request.reference} — ${getStatusMeta(next, "request").label.toLowerCase()}.`,
    );
  }

  async function handleCancel() {
    const request = cancelling;
    setCancelling(null);
    return run(
      request,
      () => cancelServiceRequest(request.id),
      `${request.reference} cancelled.`,
    );
  }

  /* ---- Columns ---------------------------------------------------------- */

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
              <i className={`bi ${meta.icon}`} aria-hidden="true" /> {meta.label} · {row.reference}
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
      header: "Assigned",
      sortable: true,
      render: (row) =>
        row.assignedToId === user.id ? (
          <span className="shms-cell-strong">You</span>
        ) : (
          row.assignedToName ?? <span className="shms-cell-muted">Unassigned</span>
        ),
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
      render: (row) => {
        const action = primaryAction(row, user.id);
        const isBusy = busyId === row.id;

        return (
          <div className="shms-row-actions">
            {action && (
              <button
                type="button"
                className="shms-btn shms-btn-primary shms-btn-sm"
                onClick={() =>
                  action.claim ? handleClaim(row) : handleAdvance(row, action.next)
                }
                disabled={isBusy}
                aria-busy={isBusy}
              >
                {isBusy ? (
                  <span className="shms-spinner" aria-hidden="true" />
                ) : (
                  <i className={`bi ${action.icon}`} aria-hidden="true" />
                )}
                {action.label}
              </button>
            )}
            <button
              type="button"
              className="shms-btn shms-btn-outline shms-btn-sm"
              onClick={() => setDetail(row)}
            >
              View
            </button>
          </div>
        );
      },
    },
  ];

  const detailAction = detail ? primaryAction(detail, user.id) : null;
  const canCancel = detail && OPEN_STATUSES.includes(detail.status);

  return (
    <>
      {/* --------------------------------------------------------- Scope */}
      <ul className="shms-tabs">
        {SCOPES.map(({ id, label, icon }) => (
          <li key={id}>
            <button
              type="button"
              className="shms-tab"
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
            >
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
              <span className="shms-tab-count">{counts[id]}</span>
            </button>
          </li>
        ))}
      </ul>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search request, guest or room"
        searchKeys={["reference", "title", "guestName", "roomNumber", "details"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption={`${title} queue`}
        emptyState={{
          title:
            scope === "mine"
              ? "Nothing assigned to you"
              : scope === "unassigned"
                ? "Nothing waiting"
                : `No ${title.toLowerCase()}`,
          message:
            scope === "mine"
              ? "Pick something up from the unassigned queue when you're free."
              : scope === "unassigned"
                ? "Every open request has someone on it."
                : "Requests will appear here as guests raise them.",
          icon: emptyIcon,
          children:
            scope !== "all" ? (
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setScope(scope === "mine" ? "unassigned" : "all")}
              >
                {scope === "mine" ? "See what's unassigned" : "See everything"}
              </button>
            ) : null,
        }}
      />

      {/* -------------------------------------------------------- Detail */}
      {detail && (
        <Modal
          title={detail.title}
          subtitle={`${detail.reference} · ${REQUEST_TYPE_META[detail.type]?.label ?? detail.type}`}
          icon={REQUEST_TYPE_META[detail.type]?.icon ?? "bi-bell"}
          size="lg"
          dismissible={busyId === null}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setDetail(null)}
                disabled={busyId !== null}
              >
                Close
              </button>

              {canCancel && (
                <button
                  type="button"
                  className="shms-btn shms-btn-danger"
                  onClick={() => setCancelling(detail)}
                  disabled={busyId !== null}
                >
                  Cancel request
                </button>
              )}

              {detailAction && (
                <button
                  type="button"
                  className="shms-btn shms-btn-primary"
                  onClick={() =>
                    detailAction.claim
                      ? handleClaim(detail)
                      : handleAdvance(detail, detailAction.next)
                  }
                  disabled={busyId !== null}
                  aria-busy={busyId !== null}
                >
                  {busyId !== null ? (
                    <>
                      <span className="shms-spinner" aria-hidden="true" />
                      Saving&hellip;
                    </>
                  ) : (
                    <>
                      <i className={`bi ${detailAction.icon}`} aria-hidden="true" />
                      {detailAction.label}
                    </>
                  )}
                </button>
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
              <dd>{formatDateTime(detail.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatRelative(detail.updatedAt)}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>
                {detail.assignedToId === user.id
                  ? "You"
                  : (detail.assignedToName ?? "Unassigned")}
              </dd>
            </div>
            <div>
              <dt>Booking</dt>
              <dd>{detail.bookingId ?? "—"}</dd>
            </div>
          </dl>

          {detail.details && (
            <div>
              <p className="shms-label">Details</p>
              <p className="shms-row-meta" style={{ fontSize: "var(--text-sm)" }}>
                {detail.details}
              </p>
            </div>
          )}

          {/* Somebody else owns this one. */}
          {detail.assignedToId && detail.assignedToId !== user.id && (
            <p className="shms-hosted-note" style={{ marginTop: "var(--space-5)" }}>
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>
                {detail.assignedToName} is handling this. Ask them before taking it over.
              </span>
            </p>
          )}
        </Modal>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this request?"
          message={`"${cancelling.title}" (${cancelling.reference}) will be withdrawn. Let the guest know if they're expecting it.`}
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep it"
          onConfirm={handleCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </>
  );
}

export default RequestQueue;
