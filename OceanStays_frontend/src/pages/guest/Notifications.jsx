import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { NOTIFICATION_META, markAllAsRead, markAsRead } from "../../services/notificationService";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * The notification centre.
 *
 * Reads the list from DashboardLayout through the outlet context rather than
 * fetching its own copy, so marking something read here drops the topbar badge
 * at the same moment.
 */

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

function Notifications() {
  const { user } = useAuth();
  const { notifications, setNotifications } = useOutletContext();
  const [tab, setTab] = useState("all");

  const unreadCount = notifications.filter((item) => !item.read).length;

  const visible = useMemo(
    () => (tab === "unread" ? notifications.filter((item) => !item.read) : notifications),
    [notifications, tab],
  );

  async function handleMarkRead(item) {
    if (item.read) return;
    setNotifications(notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    await markAsRead(item.id).catch(() => {});
  }

  async function handleMarkAll() {
    setNotifications(notifications.map((item) => ({ ...item, read: true })));
    await markAllAsRead(user.id).catch(() => {});
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
        <ul className="shms-tabs" style={{ marginBottom: 0 }}>
          {TABS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                className="shms-tab"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
                <span className="shms-tab-count">
                  {id === "unread" ? unreadCount : notifications.length}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {unreadCount > 0 && (
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={handleMarkAll}
          >
            <i className="bi bi-check2-all" aria-hidden="true" />
            Mark all read
          </button>
        )}
      </div>

      <section className="shms-panel">
        {visible.length === 0 ? (
          <EmptyState
            title={tab === "unread" ? "You're all caught up" : "No notifications yet"}
            message={
              tab === "unread"
                ? "Nothing unread. We'll let you know when something changes."
                : "Updates about your bookings, requests and payments will appear here."
            }
            icon="bi-inbox"
          />
        ) : (
          <ul className="shms-rows">
            {visible.map((item) => {
              const meta = NOTIFICATION_META[item.type] ?? { icon: "bi-bell", tone: "neutral" };

              return (
                <li key={item.id}>
                  <div className="shms-row" style={item.read ? undefined : { background: "rgba(23, 69, 122, 0.04)" }}>
                    <span className={`shms-row-icon shms-badge-${meta.tone}`} aria-hidden="true">
                      <i className={`bi ${meta.icon}`} />
                    </span>

                    <div className="shms-row-copy">
                      <p className="shms-row-title">
                        {item.title}
                        {!item.read && <span className="shms-badge shms-badge-info">New</span>}
                      </p>
                      <p className="shms-row-meta">{item.message}</p>
                      <p className="shms-row-meta" style={{ marginTop: 3 }}>
                        <time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>
                      </p>
                    </div>

                    <div className="shms-row-aside">
                      {!item.read && (
                        <button
                          type="button"
                          className="shms-btn shms-btn-quiet shms-btn-sm"
                          onClick={() => handleMarkRead(item)}
                        >
                          Mark read
                        </button>
                      )}
                      {item.link && (
                        <Link
                          className="shms-btn shms-btn-outline shms-btn-sm"
                          to={item.link}
                          onClick={() => handleMarkRead(item)}
                        >
                          Open
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

export default Notifications;
