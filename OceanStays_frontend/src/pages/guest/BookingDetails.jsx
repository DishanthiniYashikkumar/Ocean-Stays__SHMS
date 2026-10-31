import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  BOOKING_POLICY,
  canCancel,
  canModify,
  cancelBooking,
  getBookingById,
} from "../../services/bookingService";
import { formatCurrency, formatDate, formatDateRange } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * One booking, with the actions hotel policy still allows.
 *
 * `canCancel` / `canModify` come from bookingService so the buttons and the
 * service agree on the same rules — the backend re-checks them regardless.
 */
function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const load = useCallback(() => getBookingById(bookingId), [bookingId]);
  const { data: booking, isLoading, error, reload } = useAsync(load);

  async function handleCancel() {
    try {
      await cancelBooking(bookingId, "Cancelled by guest");
      toast.success("Your booking has been cancelled and any payment refunded.", {
        title: "Booking cancelled",
      });
      setIsConfirmingCancel(false);
      navigate("/guest/bookings");
    } catch (cancelError) {
      toast.error(cancelError.message || "We couldn't cancel that booking.");
      setIsConfirmingCancel(false);
    }
  }

  if (isLoading) {
    return (
      <div className="shms-panel">
        <div className="shms-panel-body" aria-hidden="true">
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
          <div className="shms-skeleton shms-skeleton-text" style={{ width: "70%" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <ErrorState title="We couldn't find that booking" message={error.message} onRetry={reload} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link className="shms-btn shms-btn-outline" to="/guest/bookings">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to my bookings
          </Link>
        </div>
      </>
    );
  }

  const cancellable = canCancel(booking);
  const modifiable = canModify(booking);

  return (
    <>
      <Link
        className="shms-btn shms-btn-quiet shms-btn-sm"
        to="/guest/bookings"
        style={{ marginBottom: "var(--space-4)" }}
      >
        <i className="bi bi-arrow-left" aria-hidden="true" />
        All bookings
      </Link>

      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>{booking.roomTypeName}</h2>
            <p>Reference {booking.reference}</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <StatusBadge status={booking.status} domain="booking" />
            <StatusBadge status={booking.paymentStatus} domain="payment" />
          </div>
        </div>

        <div className="shms-panel-body">
          <dl className="shms-defs">
            <div>
              <dt>Stay dates</dt>
              <dd>{formatDateRange(booking.checkIn, booking.checkOut)}</dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>{booking.nights}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{booking.roomNumber ?? "Allocated at check-in"}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>
                {booking.guests.adults} adults
                {booking.guests.children > 0 && `, ${booking.guests.children} children`}
              </dd>
            </div>
            <div>
              <dt>Booked on</dt>
              <dd>{formatDate(booking.createdAt)}</dd>
            </div>
            <div>
              <dt>Lead guest</dt>
              <dd>{booking.guestName}</dd>
            </div>
          </dl>

          {booking.specialRequests && (
            <div style={{ marginTop: "var(--space-5)" }}>
              <p className="shms-label">Special requests</p>
              <p className="shms-row-meta" style={{ fontSize: "var(--text-sm)" }}>
                {booking.specialRequests}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ Charges */}
      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>Charges</h2>
            <p>What this stay costs</p>
          </div>
          <Link className="shms-btn shms-btn-outline shms-btn-sm" to="/guest/payments">
            View invoice
          </Link>
        </div>

        <div className="shms-panel-body">
          <div className="shms-summary-lines">
            <div className="shms-summary-row">
              <span>Room charge · {booking.nights} nights</span>
              <span>{formatCurrency(booking.roomTotal, booking.currency)}</span>
            </div>
            <div className="shms-summary-row">
              <span>Service charge</span>
              <span>{formatCurrency(booking.serviceCharge, booking.currency)}</span>
            </div>
            <div className="shms-summary-row">
              <span>Taxes</span>
              <span>{formatCurrency(booking.taxes, booking.currency)}</span>
            </div>
            {booking.discount > 0 && (
              <div className="shms-summary-row shms-summary-row-discount">
                <span>Discount</span>
                <span>−{formatCurrency(booking.discount, booking.currency)}</span>
              </div>
            )}
            <div className="shms-summary-row shms-summary-total">
              <span>Total</span>
              <span>{formatCurrency(booking.total, booking.currency)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Manage */}
      <section className="shms-panel">
        <div className="shms-panel-head">
          <div>
            <h2>Manage this booking</h2>
            <p>
              Free cancellation up to {BOOKING_POLICY.freeCancellationHours} hours before arrival
            </p>
          </div>
        </div>

        <div className="shms-panel-body">
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Link
              className="shms-btn shms-btn-outline"
              to="/guest/requests"
              aria-disabled={!modifiable}
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
              Request a change
            </Link>

            <button
              type="button"
              className="shms-btn shms-btn-danger"
              onClick={() => setIsConfirmingCancel(true)}
              disabled={!cancellable}
            >
              <i className="bi bi-x-circle" aria-hidden="true" />
              Cancel booking
            </button>
          </div>

          {!cancellable && (
            <p className="shms-booking-note" style={{ marginTop: "var(--space-4)" }}>
              <i className="bi bi-info-circle-fill" aria-hidden="true" style={{ color: "var(--muted)" }} />
              This booking can no longer be cancelled online. Please contact the front desk and
              we&apos;ll help.
            </p>
          )}
        </div>
      </section>

      {isConfirmingCancel && (
        <ConfirmDialog
          title="Cancel this booking?"
          message={`Your stay at the ${booking.roomTypeName} from ${formatDateRange(
            booking.checkIn,
            booking.checkOut,
          )} will be released, and any payment refunded to the original method. This can't be undone.`}
          confirmLabel="Yes, cancel booking"
          cancelLabel="Keep my booking"
          onConfirm={handleCancel}
          onCancel={() => setIsConfirmingCancel(false)}
        />
      )}
    </>
  );
}

export default BookingDetails;
