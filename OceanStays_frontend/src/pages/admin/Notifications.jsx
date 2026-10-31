import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  NOTIFICATION_META,
  NOTIFICATION_TYPE,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from "../../services/notificationService";
import { getUsers } from "../../services/userService";
import { formatDateTime, formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Notification oversight.
 *
 * Reuses notificationService rather than adding an admin-only notification
 * store. Unlike the guest inbox this lists every recipient, so the audience is
 * a column rather than an assumption.
 */

const TYPE_FILTER = [
  { value: "", label: "All types" },
  ...Object.values(NOTIFICATION_TYPE).map((type) => ({
    value: type,
    label: type.charAt(0) + type.slice(1).toLowerCase(),
  })),
];

const READ_FILTER = [
  { value: "", label: "Read and unread" },
  { value: "unread", label: "Unread only" },
  { value: "read", label: "Read only" },
];

function Notifications() {
  const toast = useToast();

  const [type, setType] = useState("");
  const [read, setRead] = useState("");
  const [busyId, setBusyId] = useState(null);

  // No userId filter: an admin sees every recipient's notifications.
  const load = useCallback(() => getNotifications({}), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const loadUsers = useCallback(() => getUsers({ pageSize: 500 }), []);
  const users = useAsync(loadUsers);

  /** Recipient names, so the table shows a person rather than an id. */
  const nameById = useMemo(() => {
    const map = new Map();
    (users.data?.items ?? []).forEach((user) => map.set(user.id, user.name));
    return map;
  }, [users.data]);

  const rows = useMemo(() => {
    let items = data ?? [];
    if (type) items = items.filter((item) => item.type === type);
    if (read === "unread") items = items.filter((item) => !item.read);
    if (read === "read") items = items.filter((item) => item.read);
    return items;
  }, [data, type, read]);

  const unread = (data ?? []).filter((item) => !item.read).length;

  async function handleMarkRead(notification) {
    setBusyId(notification.id);
    try {
      await markAsRead(notification.id);
      reload();
    } catch (markError) {
      toast.error(markError.message || "We couldn't update that notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAll() {
    // Distinct recipients, since markAllAsRead works per user.
    const recipients = [...new Set((data ?? []).filter((n) => !n.read).map((n) => n.userId))];

    try {
      await Promise.all(recipients.map((userId) => markAllAsRead(userId)));
      toast.success("All notifications marked as read.");
      reload();
    } catch (markError) {
      toast.error(markError.message || "We couldn't update those notifications.");
    }
  }

  const columns = [
    {
      key: "title",
      header: "Notification",
      sortable: true,
      render: (row) => {
        const meta = NOTIFICATION_META[row.type] ?? { icon: "bi-bell", tone: "neutral" };
        return (
          <>
            <span className="shms-cell-strong">
              <i className={`bi ${meta.icon}`} aria-hidden="true" /> {row.title}
            </span>
            <br />
            <span className="shms-cell-muted">{row.message}</span>
          </>
        );
      },
    },
    {
      key: "userId",
      header: "Recipient",
      sortable: true,
      render: (row) => nameById.get(row.userId) ?? row.userId,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => row.type.charAt(0) + row.type.slice(1).toLowerCase(),
    },
    {
      key: "read",
      header: "State",
      sortable: true,
      render: (row) =>
        row.read ? (
          <span className="shms-badge shms-badge-neutral">Read</span>
        ) : (
          <span className="shms-badge shms-badge-info">Unread</span>
        ),
    },
    {
      key: "createdAt",
      header: "Sent",
      sortable: true,
      render: (row) => (
        <>
          {formatRelative(row.createdAt)}
          <br />
          <span className="shms-cell-muted">{formatDateTime(row.createdAt)}</span>
        </>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) =>
        row.read ? null : (
          <div className="shms-row-actions">
            <button
              type="button"
              className="shms-btn shms-btn-outline shms-btn-sm"
              onClick={() => handleMarkRead(row)}
              disabled={busyId === row.id}
              aria-busy={busyId === row.id}
            >
              {busyId === row.id ? (
                <span className="shms-spinner shms-spinner-dark" aria-hidden="true" />
              ) : (
                "Mark read"
              )}
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
            <i className="bi bi-inbox" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{data?.length ?? 0}</span>
            <span className="shms-stat-label">Notifications sent</span>
          </span>
        </article>

        <article className="shms-stat">
          <span
            className={`shms-stat-icon ${unread > 0 ? "shms-stat-icon-warning" : "shms-stat-icon-success"}`}
            aria-hidden="true"
          >
            <i className={`bi ${unread > 0 ? "bi-envelope" : "bi-envelope-open"}`} />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{unread}</span>
            <span className="shms-stat-label">Still unread</span>
          </span>
        </article>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search title or message"
        searchKeys={["title", "message"]}
        filters={[
          { id: "type", label: "Type", value: type, options: TYPE_FILTER, onChange: setType },
          { id: "read", label: "State", value: read, options: READ_FILTER, onChange: setRead },
        ]}
        toolbarEnd={
          unread > 0 ? (
            <button
              type="button"
              className="shms-btn shms-btn-outline shms-btn-sm"
              onClick={handleMarkAll}
            >
              <i className="bi bi-check2-all" aria-hidden="true" />
              Mark all read
            </button>
          ) : null
        }
        caption="All notifications"
        emptyState={{
          title: "No notifications found",
          message: "Try clearing a filter.",
          icon: "bi-inbox",
        }}
      />
    </>
  );
}

export default Notifications;
