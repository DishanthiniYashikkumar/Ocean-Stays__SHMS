import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { getFrontDeskSummary } from "../../services/bookingService";
import { getRoomStatusSummary } from "../../services/roomService";
import { getRequestSummary } from "../../services/serviceRequestService";
import { formatCurrency, formatDate, formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Front desk overview: who is arriving, who is leaving, what the rooms are
 * doing and what still needs paying.
 *
 * Each panel loads independently so a slow request queue never delays the
 * arrivals list, which is the thing reception actually needs on screen.
 */

const QUICK_ACTIONS = [
  { to: "/reception/reservations", icon: "bi-plus-square", label: "New Reservation", hint: "Take a booking" },
  { to: "/reception/check-in", icon: "bi-box-arrow-in-right", label: "Check-in", hint: "Today's arrivals" },
  { to: "/reception/check-out", icon: "bi-box-arrow-right", label: "Check-out", hint: "Today's departures" },
  { to: "/reception/rooms", icon: "bi-grid-3x3-gap", label: "Room Status", hint: "Allocate & update" },
  { to: "/reception/payments", icon: "bi-credit-card", label: "Payments", hint: "Settle balances" },
  { to: "/reception/requests", icon: "bi-bell", label: "Requests", hint: "Assign to staff" },
];

function PanelSkeleton({ rows = 3 }) {
  return (
    <div className="shms-panel-body" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ marginBottom: "var(--space-4)" }}>
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
        </div>
      ))}
    </div>
  );
}

function ReceptionDashboard() {
  const loadDesk = useCallback(() => getFrontDeskSummary(), []);
  const desk = useAsync(loadDesk);

  const loadRooms = useCallback(() => getRoomStatusSummary(), []);
  const rooms = useAsync(loadRooms);

  const loadRequests = useCallback(() => getRequestSummary(), []);
  const requests = useAsync(loadRequests);

  const arrivals = desk.data?.arrivals ?? [];
  const departures = desk.data?.departures ?? [];
  const unpaid = desk.data?.unpaid ?? [];

  const owed = unpaid.reduce((sum, booking) => sum + booking.total, 0);

  const tiles = [
    { icon: "bi-box-arrow-in-right", tone: "", value: arrivals.length, label: "Arrivals today" },
    { icon: "bi-box-arrow-right", tone: "", value: departures.length, label: "Departures today" },
    {
      icon: "bi-door-open",
      tone: "shms-stat-icon-success",
      value:
        (rooms.data?.AVAILABLE ?? 0) + (rooms.data?.READY ?? 0) + (rooms.data?.INSPECTED ?? 0),
      label: "Rooms available",
    },
    { icon: "bi-person-check", tone: "shms-stat-icon-gold", value: rooms.data?.OCCUPIED ?? 0, label: "Rooms occupied" },
    { icon: "bi-stars", tone: "shms-stat-icon-warning", value: rooms.data?.CLEANING ?? 0, label: "Being cleaned" },
    {
      icon: "bi-bell",
      tone: "shms-stat-icon-warning",
      value: (requests.data?.PENDING ?? 0) + (requests.data?.ASSIGNED ?? 0),
      label: "Open requests",
    },
  ];

  return (
    <>
      <div className="shms-stats">
        {tiles.map(({ icon, tone, value, label }) => (
          <article className="shms-stat" key={label}>
            <span className={`shms-stat-icon ${tone}`.trim()} aria-hidden="true">
              <i className={`bi ${icon}`} />
            </span>
            <span className="shms-stat-copy">
              <span className="shms-stat-value shms-kpi-value">{value}</span>
              <span className="shms-stat-label">{label}</span>
            </span>
          </article>
        ))}
      </div>

      <div className="shms-dash-split">
        <div>
          {/* ------------------------------------------------- Arrivals */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Arriving today</h2>
                <p>{arrivals.length} expected</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/reception/check-in">
                Go to check-in
              </Link>
            </div>

            {desk.error ? (
              <ErrorState message={desk.error.message} onRetry={desk.reload} />
            ) : desk.isLoading ? (
              <PanelSkeleton />
            ) : arrivals.length === 0 ? (
              <EmptyState
                title="No arrivals today"
                message="Nobody is due to check in. Tomorrow's arrivals appear here from midnight."
                icon="bi-calendar2-check"
              />
            ) : (
              <ul className="shms-rows">
                {arrivals.map((booking) => (
                  <li key={booking.id}>
                    <div className="shms-row">
                      <span className="shms-row-icon" aria-hidden="true">
                        <i className="bi bi-box-arrow-in-right" />
                      </span>
                      <div className="shms-row-copy">
                        <p className="shms-row-title">
                          {booking.guestName}
                          <StatusBadge status={booking.status} domain="booking" />
                          <StatusBadge status={booking.paymentStatus} domain="payment" />
                        </p>
                        <p className="shms-row-meta">
                          {booking.reference} · {booking.roomTypeName} · {booking.nights} nights ·{" "}
                          {booking.guests.adults} adults
                          {booking.roomNumber ? ` · Room ${booking.roomNumber}` : " · Room not allocated"}
                        </p>
                      </div>
                      <div className="shms-row-aside">
                        <Link className="shms-btn shms-btn-primary shms-btn-sm" to="/reception/check-in">
                          Check in
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----------------------------------------------- Departures */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Departing today</h2>
                <p>{departures.length} due to leave</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/reception/check-out">
                Go to check-out
              </Link>
            </div>

            {desk.error ? (
              <ErrorState message={desk.error.message} onRetry={desk.reload} />
            ) : desk.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : departures.length === 0 ? (
              <EmptyState
                title="No departures today"
                message="Every in-house guest is staying on."
                icon="bi-calendar2-check"
              />
            ) : (
              <ul className="shms-rows">
                {departures.map((booking) => (
                  <li key={booking.id}>
                    <div className="shms-row">
                      <span className="shms-row-icon" aria-hidden="true">
                        <i className="bi bi-box-arrow-right" />
                      </span>
                      <div className="shms-row-copy">
                        <p className="shms-row-title">
                          {booking.guestName}
                          <StatusBadge status={booking.paymentStatus} domain="payment" />
                        </p>
                        <p className="shms-row-meta">
                          {booking.reference} · Room {booking.roomNumber ?? "—"} · out by 11:00
                        </p>
                      </div>
                      <div className="shms-row-aside">
                        <span className="shms-row-amount shms-currency-value">
                          {formatCurrency(booking.total, booking.currency)}
                        </span>
                        <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/reception/check-out">
                          Check out
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* -------------------------------------------- Quick actions */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Quick actions</h2>
                <p>The things the desk does most</p>
              </div>
            </div>
            <div className="shms-panel-body">
              <div className="shms-actions-grid">
                {QUICK_ACTIONS.map(({ to, icon, label, hint }) => (
                  <Link className="shms-action" to={to} key={label}>
                    <i className={`bi ${icon}`} aria-hidden="true" />
                    {label}
                    <small>{hint}</small>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div>
          {/* ---------------------------------------- Payment alerts */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Payment alerts</h2>
                <p>{unpaid.length} unsettled</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/reception/payments">
                All
              </Link>
            </div>

            {desk.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : unpaid.length === 0 ? (
              <EmptyState
                title="Everything settled"
                message="No outstanding balances across in-house guests."
                icon="bi-check2-circle"
              />
            ) : (
              <>
                <div className="shms-panel-body" style={{ paddingBottom: 0 }}>
                  <p className="shms-stat-value shms-currency-value shms-payment-total">
                    {formatCurrency(owed)}
                  </p>
                  <p className="shms-row-meta">Outstanding across {unpaid.length} bookings</p>
                </div>
                <ul className="shms-rows">
                  {unpaid.slice(0, 4).map((booking) => (
                    <li key={booking.id}>
                      <div className="shms-row">
                        <div className="shms-row-copy">
                          <p className="shms-row-title">{booking.guestName}</p>
                          <p className="shms-row-meta">
                            {booking.reference} · departs {formatDate(booking.checkOut)}
                          </p>
                        </div>
                        <div className="shms-row-aside">
                          <span className="shms-row-amount shms-currency-value">
                            {formatCurrency(booking.total, booking.currency)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* -------------------------------------------- Room status */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Rooms right now</h2>
                <p>{rooms.data?.total ?? 0} across the property</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/reception/rooms">
                Manage
              </Link>
            </div>

            {rooms.error ? (
              <ErrorState message={rooms.error.message} onRetry={rooms.reload} />
            ) : rooms.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : (
              <div className="shms-panel-body">
                <ul className="shms-rows" style={{ margin: 0 }}>
                  {["AVAILABLE", "INSPECTED", "RESERVED", "DIRTY", "MAINTENANCE"].map(
                    (status) => (
                      <li key={status}>
                        <div
                          className="shms-row"
                          style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                        >
                          <div className="shms-row-copy">
                            {/* Stored value stays MAINTENANCE; only this label changes. */}
                            {status === "MAINTENANCE" ? (
                              <span className="shms-badge shms-badge-danger">Maintaining</span>
                            ) : (
                              <StatusBadge status={status} domain="room" />
                            )}
                          </div>
                          <div className="shms-row-aside">
                            <span className="shms-row-amount">{rooms.data?.[status] ?? 0}</span>
                          </div>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </section>

          {/* ---------------------------------------------- In house */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>In house</h2>
                <p>{desk.data?.inHouse?.length ?? 0} staying tonight</p>
              </div>
            </div>

            {desk.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : (desk.data?.inHouse?.length ?? 0) === 0 ? (
              <EmptyState title="Nobody in house" message="The property is empty." icon="bi-moon" />
            ) : (
              <ul className="shms-rows">
                {desk.data.inHouse.map((booking) => (
                  <li key={booking.id}>
                    <div className="shms-row">
                      <div className="shms-row-copy">
                        <p className="shms-row-title">{booking.guestName}</p>
                        <p className="shms-row-meta">
                          Room {booking.roomNumber ?? "—"} · out {formatRelative(booking.checkOut)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default ReceptionDashboard;
