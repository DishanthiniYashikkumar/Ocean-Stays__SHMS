import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { getGuestBookings } from "../../services/bookingService";
import { formatCurrency, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/** Current, upcoming and past stays, grouped into tabs. */

const TABS = [
  { id: "current", label: "Current" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const EMPTY_COPY = {
  current: {
    title: "You're not checked in",
    message: "Once you arrive and check in, your stay will appear here.",
    icon: "bi-door-closed",
  },
  upcoming: {
    title: "No upcoming stays",
    message: "Book a room and it will show up here with everything you need to manage it.",
    icon: "bi-calendar2-x",
  },
  past: {
    title: "No past stays yet",
    message: "Your stay history will build up here after your first visit.",
    icon: "bi-clock-history",
  },
};

function MyBookings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("current");

  const load = useCallback(() => getGuestBookings(user.id), [user.id]);
  const { data, isLoading, error, reload } = useAsync(load);

  const counts = useMemo(
    () => ({
      current: data?.current?.length ?? 0,
      upcoming: data?.upcoming?.length ?? 0,
      past: data?.past?.length ?? 0,
    }),
    [data],
  );

  // Open on whichever group actually has something in it.
  const visible = data?.[tab] ?? [];

  if (error) {
    return <ErrorState title="We couldn't load your bookings" message={error.message} onRetry={reload} />;
  }

  return (
    <>
      <ul className="shms-tabs">
        {TABS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              className="shms-tab"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
              <span className="shms-tab-count">{counts[id]}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="shms-panel">
        {isLoading ? (
          <div className="shms-panel-body">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} style={{ marginBottom: "var(--space-5)" }} aria-hidden="true">
                <div className="shms-skeleton shms-skeleton-title" />
                <div className="shms-skeleton shms-skeleton-text" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState {...EMPTY_COPY[tab]}>
            <Link className="shms-btn shms-btn-primary" to="/rooms">
              Explore rooms
            </Link>
          </EmptyState>
        ) : (
          <ul className="shms-rows">
            {visible.map((booking) => (
              <li key={booking.id}>
                <div className="shms-row">
                  <span className="shms-row-icon" aria-hidden="true">
                    <i className="bi bi-calendar2-check" />
                  </span>

                  <div className="shms-row-copy">
                    <p className="shms-row-title">
                      {booking.roomTypeName}
                      <StatusBadge status={booking.status} domain="booking" />
                      <StatusBadge status={booking.paymentStatus} domain="payment" />
                    </p>
                    <p className="shms-row-meta">
                      {booking.reference} · {formatDateRange(booking.checkIn, booking.checkOut)} ·{" "}
                      {booking.nights} {booking.nights === 1 ? "night" : "nights"}
                      {booking.roomNumber && ` · Room ${booking.roomNumber}`}
                    </p>
                  </div>

                  <div className="shms-row-aside">
                    <span className="shms-row-amount">
                      {formatCurrency(booking.total, booking.currency)}
                    </span>
                    <Link
                      className="shms-btn shms-btn-outline shms-btn-sm"
                      to={`/guest/bookings/${booking.id}`}
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default MyBookings;
