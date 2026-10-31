import { useCallback, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import BookingStepper from "../../components/booking/BookingStepper";
import GuestDetailsForm from "../../components/booking/GuestDetailsForm";
import PaymentForm from "../../components/booking/PaymentForm";
import BookingSummary from "../../components/common/BookingSummary";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { getRoomTypeBySlug } from "../../services/roomService";
import { calculateQuote, confirmBooking, createBooking } from "../../services/bookingService";
import { confirmPayment, createPaymentIntent, PAYMENT_STATUS } from "../../services/paymentService";
import { addDays, formatCurrency, formatDate, todayISO } from "../../utils/format";
import "../../styles/booking.css";

/**
 * Booking flow: Guest details -> Summary -> Payment -> Confirmation.
 *
 * The route is behind ProtectedRoute, so anyone reaching here is signed in —
 * a guest who clicked "Book Now" while signed out is sent to /login and
 * returned to this exact URL, dates and all, by the `from` state.
 *
 * Stay dates arrive as query parameters from the rooms listing and the room
 * detail page, which is what makes that round trip lossless.
 */

const STEPS = [
  { id: "details", label: "Guest details" },
  { id: "summary", label: "Review" },
  { id: "payment", label: "Payment" },
  { id: "confirmation", label: "Confirmed" },
];

/** Splits a stored display name into first / last for the details form. */
function splitName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function BookingSkeleton() {
  return (
    <div className="shms-container" style={{ paddingBlock: "var(--space-12)" }}>
      <div className="shms-skeleton" style={{ height: 56, marginBottom: "var(--space-8)" }} />
      <div className="shms-booking-layout">
        <div className="shms-skeleton" style={{ height: 460, borderRadius: "var(--radius-xl)" }} />
        <div className="shms-skeleton" style={{ height: 520, borderRadius: "var(--radius-xl)" }} />
      </div>
    </div>
  );
}

function BookingFlow() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const stay = useMemo(
    () => ({
      checkIn: searchParams.get("checkIn") || todayISO(),
      checkOut: searchParams.get("checkOut") || addDays(todayISO(), 3),
      guests: Number(searchParams.get("guests")) || 2,
    }),
    [searchParams],
  );

  const load = useCallback(
    () => getRoomTypeBySlug(slug, { checkIn: stay.checkIn, checkOut: stay.checkOut }),
    [slug, stay.checkIn, stay.checkOut],
  );
  const { data: room, isLoading, error, reload } = useAsync(load);

  const [stepIndex, setStepIndex] = useState(0);
  const [details, setDetails] = useState(() => {
    const { firstName, lastName } = splitName(user?.name);
    return {
      firstName,
      lastName,
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      specialRequests: "",
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [result, setResult] = useState(null);

  const quote = useMemo(() => {
    if (!room) return null;
    return calculateQuote({
      pricePerNight: room.pricePerNight,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      currency: room.currency,
    });
  }, [room, stay.checkIn, stay.checkOut]);

  /**
   * Creates the reservation and settles payment in one pass.
   *
   * Creating the booking only at this point means an abandoned flow leaves no
   * orphaned PENDING reservation holding inventory. A real property may prefer
   * to hold the room from the summary step instead — that is a policy decision
   * for the backend team.
   */
  async function handlePayment({ method }) {
    setIsSubmitting(true);
    setPaymentError("");

    try {
      const booking = await createBooking({
        roomTypeId: room.id,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guests: { adults: stay.guests, children: 0 },
        guestId: user?.id ?? null,
        guestName: `${details.firstName} ${details.lastName}`.trim(),
        guestEmail: details.email,
        guestPhone: details.phone,
        specialRequests: details.specialRequests,
      });

      // Paying at the desk still confirms the reservation — the room is held
      // and the balance is simply outstanding until check-in.
      if (method === "onArrival") {
        const confirmed = await confirmBooking(booking.id);
        setResult({ booking: confirmed, receipt: null, method });
        setStepIndex(3);
        return;
      }

      const intent = await createPaymentIntent({
        bookingId: booking.id,
        amount: quote.total,
        method,
      });

      const receipt = await confirmPayment({
        intentId: intent.intentId,
        bookingId: booking.id,
        // A provider token, never a card number — see PaymentForm's note.
        providerToken: intent.clientSecret,
      });

      // Settling confirms the booking, so use the copy the payment returned
      // rather than the PENDING one we created a moment ago.
      setResult({ booking: receipt.booking ?? booking, receipt, method });
      setStepIndex(3);
    } catch (submitError) {
      setPaymentError(
        submitError.message || "We couldn't complete your booking. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ---- Loading and error ------------------------------------------------ */

  if (isLoading) return <BookingSkeleton />;

  if (error) {
    return (
      <div className="shms-container" style={{ paddingBlock: "var(--space-16)" }}>
        <ErrorState
          title="We couldn't start that booking"
          message={error.message}
          onRetry={reload}
          icon="bi-calendar2-x"
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link className="shms-btn shms-btn-outline" to="/rooms">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to all rooms
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Confirmation ----------------------------------------------------- */

  if (stepIndex === 3 && result) {
    const { booking, receipt, method } = result;
    const paidNow = method !== "onArrival";

    return (
      <section className="shms-section shms-section-tight">
        <div className="shms-container">
          <BookingStepper steps={STEPS} current={3} />

          <div className="shms-confirm">
            <span className="shms-confirm-icon" aria-hidden="true">
              <i className="bi bi-check2" />
            </span>

            <h1>Your stay is confirmed</h1>
            <p>
              Thank you, {details.firstName}. We&apos;ve emailed your confirmation to{" "}
              <strong>{details.email}</strong>, and our front desk has been notified of your
              arrival.
            </p>

            <div className="shms-confirm-reference">
              <small>Booking reference</small>
              <strong>{booking.reference}</strong>
            </div>

            <div className="shms-step-panel shms-confirm-panel">
              <h2>Booking details</h2>

              <ul className="shms-review">
                <li>
                  <small>Room</small>
                  <strong>{booking.roomTypeName}</strong>
                </li>
                <li>
                  <small>Guests</small>
                  <strong>
                    {stay.guests} {stay.guests === 1 ? "guest" : "guests"}
                  </strong>
                </li>
                <li>
                  <small>Check-in</small>
                  <strong>{formatDate(booking.checkIn)}</strong>
                </li>
                <li>
                  <small>Check-out</small>
                  <strong>{formatDate(booking.checkOut)}</strong>
                </li>
                <li>
                  <small>Booking status</small>
                  <strong>
                    <StatusBadge status={booking.status} domain="booking" />
                  </strong>
                </li>
                <li>
                  <small>Payment</small>
                  <strong>
                    <StatusBadge
                      status={paidNow ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING}
                      domain="payment"
                    />
                  </strong>
                </li>
                <li className="shms-review-wide">
                  <small>{paidNow ? "Paid" : "Due at check-in"}</small>
                  <strong>
                    {formatCurrency(booking.total, booking.currency)}
                    {receipt && ` · Receipt ${receipt.receiptReference}`}
                  </strong>
                </li>
              </ul>

              <ul className="shms-next-steps">
                <li>
                  <i className="bi bi-envelope-check" aria-hidden="true" />
                  <span>
                    <strong>Check your inbox</strong>
                    Your confirmation and a link to manage the booking are on their way.
                  </span>
                </li>
                <li>
                  <i className="bi bi-chat-dots" aria-hidden="true" />
                  <span>
                    <strong>Tell us your arrival time</strong>
                    Add it from your dashboard and we&apos;ll have the room ready.
                  </span>
                </li>
                <li>
                  <i className="bi bi-shield-check" aria-hidden="true" />
                  <span>
                    <strong>Plans can change</strong>
                    Cancel free of charge up to 48 hours before {formatDate(booking.checkIn)}.
                  </span>
                </li>
              </ul>
            </div>

            <div className="shms-confirm-actions">
              <Link className="shms-btn shms-btn-primary shms-btn-lg" to="/guest/dashboard">
                <i className="bi bi-speedometer2" aria-hidden="true" />
                Go to my dashboard
              </Link>
              <Link className="shms-btn shms-btn-outline shms-btn-lg" to="/rooms">
                Browse more rooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ---- Steps 1–3 -------------------------------------------------------- */

  return (
    <>
      <header className="shms-page-head" style={{ paddingBlock: "var(--space-10)" }}>
        <div className="shms-container">
          <ul className="shms-breadcrumb" style={{ marginBottom: 0 }}>
            <li>
              <Link to="/rooms">Rooms</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/rooms/${slug}`}>{room.name}</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Book</li>
          </ul>
        </div>
      </header>

      <section className="shms-section shms-section-tight">
        <div className="shms-container">
          <BookingStepper steps={STEPS} current={stepIndex} />

          <div className="shms-booking-layout">
            <div>
              {stepIndex === 0 && (
                <GuestDetailsForm
                  initialValues={details}
                  onSubmit={(values) => {
                    setDetails(values);
                    setStepIndex(1);
                  }}
                  onBack={() => window.history.back()}
                />
              )}

              {stepIndex === 1 && (
                <div className="shms-step-panel">
                  <h2>Review your booking</h2>
                  <p className="shms-step-intro">
                    Check everything over before you pay. You can still go back and change it.
                  </p>

                  <ul className="shms-review">
                    <li>
                      <small>Guest</small>
                      <strong>
                        {details.firstName} {details.lastName}
                      </strong>
                    </li>
                    <li>
                      <small>Email</small>
                      <strong>{details.email}</strong>
                    </li>
                    <li>
                      <small>Phone</small>
                      <strong>{details.phone}</strong>
                    </li>
                    <li>
                      <small>Guests</small>
                      <strong>
                        {stay.guests} {stay.guests === 1 ? "guest" : "guests"}
                      </strong>
                    </li>
                    <li>
                      <small>Check-in</small>
                      <strong>{formatDate(stay.checkIn)}</strong>
                    </li>
                    <li>
                      <small>Check-out</small>
                      <strong>{formatDate(stay.checkOut)}</strong>
                    </li>
                    {details.specialRequests && (
                      <li className="shms-review-wide">
                        <small>Special requests</small>
                        <strong>{details.specialRequests}</strong>
                      </li>
                    )}
                  </ul>

                  <p className="shms-hosted-note">
                    <i className="bi bi-info-circle" aria-hidden="true" />
                    <span>
                      Check-in is from 14:00 and check-out by 11:00. Free cancellation up to 48
                      hours before arrival; after that the first night is charged.
                    </span>
                  </p>

                  <div className="shms-step-actions">
                    <button
                      type="button"
                      className="shms-btn shms-btn-outline shms-btn-back"
                      onClick={() => setStepIndex(0)}
                    >
                      <i className="bi bi-arrow-left" aria-hidden="true" />
                      Back
                    </button>
                    <button
                      type="button"
                      className="shms-submit"
                      onClick={() => setStepIndex(2)}
                    >
                      Continue to payment
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <PaymentForm
                  total={quote.total}
                  currency={quote.currency}
                  isSubmitting={isSubmitting}
                  error={paymentError}
                  onSubmit={handlePayment}
                  onBack={() => setStepIndex(1)}
                />
              )}
            </div>

            <BookingSummary room={room} stay={stay} quote={quote} />
          </div>
        </div>
      </section>
    </>
  );
}

export default BookingFlow;
