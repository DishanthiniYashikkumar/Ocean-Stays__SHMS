import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NOTIFICATION_META, markAllAsRead, markAsRead } from "../../services/notificationService";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Notification bell and dropdown.
 *
 * The parent owns the list so the unread count stays in step with the
 * notifications page; this component reports changes back through `onChange`.
 *
 * @param {{
 *   notifications: Array,
 *   userId: string,
 *   onChange: (next: Array) => void,
 *   viewAllHref: string
 * }} props
 */
function NotificationDropdown({ notifications, userId, onChange, viewAllHref }) {
  const panelId = useId();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  async function handleOpenItem(item) {
    setIsOpen(false);

    if (!item.read) {
      // Update locally first so the badge drops immediately.
      onChange(notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      await markAsRead(item.id).catch(() => {});
    }
    if (item.link) navigate(item.link);
  }

  async function handleMarkAll() {
    onChange(notifications.map((item) => ({ ...item, read: true })));
    await markAllAsRead(userId).catch(() => {});
  }

  return (
    <div className="shms-notify" ref={containerRef}>
      <button
        type="button"
        className="shms-icon-btn"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications, none unread"
        }
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="shms-icon-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="shms-notify-panel" id={panelId}>
          <div className="shms-notify-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="shms-filter-clear" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="shms-state" style={{ padding: "var(--space-10) var(--space-5)" }}>
              <span className="shms-state-icon" aria-hidden="true">
                <i className="bi bi-inbox" />
              </span>
              <p className="shms-state-message">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="shms-notify-list">
              {notifications.slice(0, 6).map((item) => {
                const meta = NOTIFICATION_META[item.type] ?? { icon: "bi-bell", tone: "neutral" };

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`shms-notify-item${item.read ? "" : " is-unread"}`}
                      onClick={() => handleOpenItem(item)}
                    >
                      <span
                        className={`shms-notify-icon shms-badge-${meta.tone}`}
                        aria-hidden="true"
                      >
                        <i className={`bi ${meta.icon}`} />
                      </span>

                      <span className="shms-notify-copy">
                        <strong>{item.title}</strong>
                        <span>{item.message}</span>
                        <time dateTime={item.createdAt}>{formatRelative(item.createdAt)}</time>
                      </span>

                      {!item.read && <span className="shms-notify-dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Roles without a notifications archive get no "view all". */}
          {viewAllHref && (
            <div className="shms-notify-foot">
              <Link
                className="shms-btn shms-btn-outline shms-btn-sm shms-btn-block"
                to={viewAllHref}
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
