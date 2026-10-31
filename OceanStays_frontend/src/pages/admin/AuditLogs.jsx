import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import {
  AUDIT_ACTION,
  AUDIT_MODULES,
  AUDIT_RESULT,
  getAuditLogs,
} from "../../services/auditService";
import { formatDateTime, formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

/**
 * The audit trail.
 *
 * READ-ONLY BY DESIGN. There are no edit or delete controls and there should
 * never be: a log the application can rewrite is not evidence of anything. The
 * service exposes no mutation beyond appending, so there is nothing here to
 * wire a destructive action to even if someone tried.
 */

const ACTION_FILTER = [
  { value: "", label: "All actions" },
  ...Object.values(AUDIT_ACTION).map((action) => ({
    value: action,
    label: action.charAt(0) + action.slice(1).toLowerCase(),
  })),
];

const MODULE_FILTER = [
  { value: "", label: "All modules" },
  ...AUDIT_MODULES.map((module) => ({ value: module, label: module })),
];

const RESULT_FILTER = [
  { value: "", label: "All results" },
  { value: AUDIT_RESULT.SUCCESS, label: "Success" },
  { value: AUDIT_RESULT.FAILURE, label: "Failed" },
];

/** Icon per action, so a long list is scannable without reading every row. */
const ACTION_ICONS = {
  CREATE: "bi-plus-circle",
  UPDATE: "bi-pencil",
  DELETE: "bi-trash",
  LOGIN: "bi-box-arrow-in-right",
  LOGOUT: "bi-box-arrow-right",
  PERMISSION: "bi-shield-lock",
  PAYMENT: "bi-credit-card",
  STATUS: "bi-arrow-repeat",
};

function AuditLogs() {
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [result, setResult] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => getAuditLogs({ pageSize: 500 }), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    if (action) items = items.filter((entry) => entry.action === action);
    if (module) items = items.filter((entry) => entry.module === module);
    if (result) items = items.filter((entry) => entry.result === result);
    return items;
  }, [data, action, module, result]);

  const failures = (data?.items ?? []).filter(
    (entry) => entry.result === AUDIT_RESULT.FAILURE,
  ).length;

  const columns = [
    {
      key: "timestamp",
      header: "When",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">{formatRelative(row.timestamp)}</span>
          <br />
          <span className="shms-cell-muted">{formatDateTime(row.timestamp)}</span>
        </>
      ),
    },
    {
      key: "actorName",
      header: "Who",
      sortable: true,
      render: (row) => (
        <>
          {row.actorName}
          <br />
          <span className="shms-cell-muted">{row.actorRole ?? "Not signed in"}</span>
        </>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (row) => (
        <>
          <i className={`bi ${ACTION_ICONS[row.action] ?? "bi-dot"}`} aria-hidden="true" />{" "}
          {row.action.charAt(0) + row.action.slice(1).toLowerCase()}
        </>
      ),
    },
    { key: "module", header: "Module", sortable: true },
    {
      key: "entity",
      header: "Entity",
      sortable: true,
      render: (row) => <span className="shms-cell-strong">{row.entity}</span>,
    },
    {
      key: "result",
      header: "Result",
      sortable: true,
      render: (row) => <StatusBadge status={row.result} domain="audit" />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="shms-row-actions">
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => setDetail(row)}
          >
            Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="shms-stats">
        <article className="shms-stat">
          <span className="shms-stat-icon" aria-hidden="true">
            <i className="bi bi-clock-history" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{data?.total ?? 0}</span>
            <span className="shms-stat-label">Entries recorded</span>
          </span>
        </article>

        <article className="shms-stat">
          <span
            className={`shms-stat-icon ${failures > 0 ? "shms-stat-icon-warning" : "shms-stat-icon-success"}`}
            aria-hidden="true"
          >
            <i className={`bi ${failures > 0 ? "bi-exclamation-triangle" : "bi-check2-circle"}`} />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{failures}</span>
            <span className="shms-stat-label">Failed actions</span>
          </span>
        </article>
      </div>

      <p className="shms-hosted-note" style={{ marginBottom: "var(--space-5)" }}>
        <i className="bi bi-shield-lock" aria-hidden="true" />
        <span>
          The audit trail is read-only. Entries can&apos;t be edited or removed from here —
          retention is handled by the backend.
        </span>
      </p>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search actor, entity or description"
        searchKeys={["actorName", "entity", "summary", "module"]}
        filters={[
          { id: "action", label: "Action", value: action, options: ACTION_FILTER, onChange: setAction },
          { id: "module", label: "Module", value: module, options: MODULE_FILTER, onChange: setModule },
          { id: "result", label: "Result", value: result, options: RESULT_FILTER, onChange: setResult },
        ]}
        caption="System audit log"
        emptyState={{
          title: "No entries match",
          message: "Try clearing a filter or widening the search.",
          icon: "bi-clock-history",
        }}
      />

      {detail && (
        <Modal
          title={detail.summary}
          subtitle={`${detail.module} · ${formatDateTime(detail.timestamp)}`}
          icon={ACTION_ICONS[detail.action] ?? "bi-clock-history"}
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
          <div style={{ marginBottom: "var(--space-5)" }}>
            <StatusBadge status={detail.result} domain="audit" />
          </div>

          <dl className="shms-defs">
            <div>
              <dt>Actor</dt>
              <dd>{detail.actorName}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{detail.actorRole ?? "Not signed in"}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{detail.action}</dd>
            </div>
            <div>
              <dt>Module</dt>
              <dd>{detail.module}</dd>
            </div>
            <div>
              <dt>Entity</dt>
              <dd>{detail.entity}</dd>
            </div>
            <div>
              <dt>Source address</dt>
              <dd>{detail.ip}</dd>
            </div>
          </dl>
        </Modal>
      )}
    </>
  );
}

export default AuditLogs;
