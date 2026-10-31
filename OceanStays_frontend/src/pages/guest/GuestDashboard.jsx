import { useCallback } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { getGuestBookings } from "../../services/bookingService";
import { getServiceRequests, REQUEST_STATUS } from "../../services/serviceRequestService";
import { getPayments } from "../../services/paymentService";
import { formatCurrency, formatDate, formatDateRange, formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Guest dashboard: current stay, what's next, open requests and anything owed.
 *
 * Each panel loads independently, so a slow request queue never delays the
 * booking summary the guest actually came for.
 */

const QUICK_ACTIONS = [
  { to: "/guest/bookings", icon: "bi-calendar2-check", label: "My Bookings", hint: "View & manage" },
  { to: "/guest/requests?new=ROOM_SERVICE", icon: "bi-cup-hot", label: "Room Service", hint: "Order to your room" },
  { to: "/guest/requests?new=HOUSEKEEPING", icon: "bi-stars", label: "Housekeeping", hint: "Request a service" },
  { to: "/guest/requests?new=DINING", icon: "bi-egg-fried", label: "Dining", hint: "Reserve a table" },
  { to: "/guest/requests?new=TRANSPORT", icon: "bi-car-front", label: "Transport", hint: "Airport & tours" },
  { to: "/guest/requests?new=MAINTENANCE", icon: "bi-tools", label: "Maintenance", hint: "Report an issue" },
  { to: "/guest/payments", icon: "bi-receipt", label: "View Bill", hint: "Invoices & balance" },
  { to: "/guest/feedback", icon: "bi-chat-quote", label: "Feedback", hint: "Tell us how we did" },
];

function PanelSkeleton({ rows = 2 }) {
  return (
    <div className="shms-panel-body">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ marginBottom: "var(--space-4)" }} aria-hidden="true">
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
        </div>
      ))}
    </div>
  );
}

function GuestDashboard() {
  const { user } = useAuth();

  const loadBookings = useCallback(() => getGuestBookings(user.id), [user.id]);
  const bookings = useAsync(loadBookings);

  const loadRequests = useCallback(
    () => getServiceRequests({ guestId: user.id, pageSize: 50 }),
    [user.id],
  );
  const requests = useAsync(loadRequests);

  const loadPayments = useCallback(() => getPayments({ guestId: user.id }), [user.id]);
  const payments = useAsync(loadPayments);

  const current = bookings.data?.current?.[0] ?? null;
  const nextStay = bookings.data?.upcoming?.[0] ?? null;
  const pastCount = bookings.data?.past?.length ?? 0;

  const openRequests =
    requests.data?.items?.filter((item) =>
      [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.IN_PROGRESS].includes(
        item.status,
      ),
    ) ?? [];

  const balanceDue =
    payments.data?.reduce((sum, invoice) => sum + (invoice.balanceDue ?? 0), 0) ?? 0;

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <>
      {/* ------------------------------------------------------- Welcome */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="shms-heading" style={{ fontSize: "1.9rem", marginBottom: "var(--space-2)" }}>
          Welcome back, {firstName}.
        </h2>
        <p className="shms-subheading" style={{ fontSize: "var(--text-base)" }}>
          {current
            ? `You're currently staying in room ${current.roomNumber ?? "—"}. We hope it's everything you hoped for.`
            : nextStay
              ? `Your next stay begins ${formatDate(nextStay.checkIn)}. We're looking forward to it.`
              : "You have no upcoming stays. The ocean is waiting whenever you are."}
        </p>
      </div>

      {/* --------------------------------------------------------- Stats */}
      <div className="shms-stats">
        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-success" aria-hidden="true">
            <i className="bi bi-door-open" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value">{current ? "In house" : "Not staying"}</span>
            <span className="shms-stat-label">
              {current ? `Room ${current.roomNumber ?? "to be allocated"}` : "No active stay"}
            </span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon" aria-hidden="true">
            <i className="bi bi-calendar2-event" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value shms-kpi-value">{bookings.data?.upcoming?.length ?? 0}</span>
            <span className="shms-stat-label">Upcoming bookings</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-warning" aria-hidden="true">
            <i className="bi bi-bell" />
          </span>
          <span className="shms-stat-copy">
            <span className="shms-stat-value shms-kpi-value">{openRequests.length}</span>
            <span className="shms-stat-label">Open requests</span>
          </span>
        </article>

        <article className="shms-stat">
          <span className="shms-stat-icon shms-stat-icon-gold" aria-hidden="true">
            <i className="bi bi-wallet2" />
          </span>
          <span className="shms-stat-copy">
            <span
              className={`shms-stat-value${balanceDue > 0 ? " shms-currency-value shms-payment-total" : ""}`}
            >
              {balanceDue > 0 ? formatCurrency(balanceDue, "LKR", { compact: true }) : "Settled"}
            </span>
            <span className="shms-stat-label">
              {balanceDue > 0 ? "Outstanding balance" : "Nothing owed"}
            </span>
          </span>
        </article>
      </div>

      <div className="shms-dash-split">
        {/* --------------------------------------------------- Left column */}
        <div>
          {/* Current / next stay */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>{current ? "Your current stay" : "Your next stay"}</h2>
                <p>{current ? "Checked in and in house" : "Confirmed and waiting"}</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/guest/bookings">
                All bookings
              </Link>
            </div>

            {bookings.error ? (
              <ErrorState message={bookings.error.message} onRetry={bookings.reload} />
            ) : bookings.isLoading ? (
              <PanelSkeleton />
            ) : current || nextStay ? (
              (() => {
                const stay = current ?? nextStay;
                return (
                  <div className="shms-panel-body">
                    <div
                      className="shms-row-title"
                      style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-4)" }}
                    >
                      {stay.roomTypeName}
                      <StatusBadge status={stay.status} domain="booking" />
                      <StatusBadge status={stay.paymentStatus} domain="payment" />
                    </div>

                    <dl className="shms-defs">
                      <div>
                        <dt>Reference</dt>
                        <dd>{stay.reference}</dd>
                      </div>
                      <div>
                        <dt>Dates</dt>
                        <dd>{formatDateRange(stay.checkIn, stay.checkOut)}</dd>
                      </div>
                      <div>
                        <dt>Room</dt>
                        <dd>{stay.roomNumber ?? "Allocated at check-in"}</dd>
                      </div>
                      <div>
                        <dt>Guests</dt>
                        <dd>
                          {stay.guests.adults} adults
                          {stay.guests.children > 0 && `, ${stay.guests.children} children`}
                        </dd>
                      </div>
                      <div>
                        <dt>Nights</dt>
                        <dd>{stay.nights}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd className="shms-currency-value">{formatCurrency(stay.total, stay.currency)}</dd>
                      </div>
                    </dl>

                    <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)", flexWrap: "wrap" }}>
                      <Link className="shms-btn shms-btn-primary shms-btn-sm" to={`/guest/bookings/${stay.id}`}>
                        View booking
                        <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                      <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/guest/requests">
                        <i className="bi bi-bell" aria-hidden="true" />
                        Request something
                      </Link>
                    </div>
                  </div>
                );
              })()
            ) : (
              <EmptyState
                title="No upcoming bookings"
                message="When you book a stay it will appear here, with everything you need to manage it."
                icon="bi-calendar2-x"
              >
                <Link className="shms-btn shms-btn-primary" to="/rooms">
                  Explore rooms
                </Link>
              </EmptyState>
            )}
          </section>

          {/* Quick actions */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Quick actions</h2>
                <p>Everything the front desk can do, without the walk downstairs</p>
              </div>
            </div>

            <div className="shms-panel-body">
              <div className="shms-actions-grid">
                {QUICK_ACTIONS.map(({ to, icon, label, hint }) => (
                  <Link key={label} className="shms-action" to={to}>
                    <i className={`bi ${icon}`} aria-hidden="true" />
                    {label}
                    <small>{hint}</small>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* -------------------------------------------------- Right column */}
        <div>
          {/* Open requests */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Open requests</h2>
                <p>{openRequests.length} in progress</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/guest/requests">
                All
              </Link>
            </div>

            {requests.error ? (
              <ErrorState message={requests.error.message} onRetry={requests.reload} />
            ) : requests.isLoading ? (
              <PanelSkeleton rows={3} />
            ) : openRequests.length === 0 ? (
              <EmptyState
                title="Nothing outstanding"
                message="Every request you've made has been dealt with."
                icon="bi-check2-circle"
              />
            ) : (
              <ul className="shms-rows">
                {openRequests.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <div className="shms-row">
                      <span className="shms-row-icon" aria-hidden="true">
                        <i className="bi bi-bell" />
                      </span>
                      <div className="shms-row-copy">
                        <p className="shms-row-title">{item.title}</p>
                        <p className="shms-row-meta">
                          {item.reference} · {formatRelative(item.createdAt)}
                        </p>
                      </div>
                      <div className="shms-row-aside">
                        <StatusBadge status={item.status} domain="request" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Balance */}
          <section className="shms-panel">
            <div className="shms-panel-head">
              <div>
                <h2>Billing</h2>
                <p>{pastCount} completed stays</p>
              </div>
              <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/guest/payments">
                Bills
              </Link>
            </div>

            {payments.error ? (
              <ErrorState message={payments.error.message} onRetry={payments.reload} />
            ) : payments.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : balanceDue > 0 ? (
              <div className="shms-panel-body">
                <p
                  className="shms-stat-value shms-currency-value shms-payment-total"
                  style={{ marginBottom: "var(--space-2)" }}
                >
                  {formatCurrency(balanceDue)}
                </p>
                <p className="shms-row-meta" style={{ marginBottom: "var(--space-4)" }}>
                  Outstanding across {payments.data.filter((i) => i.balanceDue > 0).length}{" "}
                  invoice(s). Settle any time before arrival.
                </p>
                <Link className="shms-btn shms-btn-primary shms-btn-sm shms-btn-block" to="/guest/payments">
                  Settle balance
                </Link>
              </div>
            ) : (
              <EmptyState
                title="All settled"
                message="You have no outstanding balance with us."
                icon="bi-check2-circle"
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default GuestDashboard;
