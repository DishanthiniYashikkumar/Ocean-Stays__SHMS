import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import RoomGallery from "../../components/public/RoomGallery";
import ErrorState from "../../components/common/ErrorState";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { AMENITIES, getRoomTypeBySlug } from "../../services/roomService";
import { BOOKING_POLICY, calculateQuote } from "../../services/bookingService";
import { HOTEL } from "../../services/contentService";
import { addDays, formatCurrency, todayISO } from "../../utils/format";
import "../../styles/room-details.css";

/**
 * Room detail page. The booking card prices the stay live using the same
 * `calculateQuote` the booking flow and payment screen will use, so the number
 * a guest sees here is the number they are charged.
 */

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6];

function RoomDetailsSkeleton() {
  return (
    <div className="shms-container" style={{ paddingBlock: "var(--space-12)" }}>
      <div className="shms-skeleton" style={{ height: 380, borderRadius: "var(--radius-lg)" }} />
      <div style={{ maxWidth: 600, marginTop: "var(--space-8)" }}>
        <div className="shms-skeleton shms-skeleton-title" />
        <div className="shms-skeleton shms-skeleton-text" />
        <div className="shms-skeleton shms-skeleton-text" style={{ width: "80%" }} />
      </div>
    </div>
  );
}

function RoomDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [stay, setStay] = useState({
    checkIn: searchParams.get("checkIn") || todayISO(),
    checkOut: searchParams.get("checkOut") || addDays(todayISO(), 3),
    guests: Number(searchParams.get("guests")) || 2,
  });

  const load = useCallback(
    () => getRoomTypeBySlug(slug, { checkIn: stay.checkIn, checkOut: stay.checkOut }),
    [slug, stay.checkIn, stay.checkOut],
  );
  const { data: room, isLoading, error, reload } = useAsync(load);

  const quote = useMemo(() => {
    if (!room) return null;
    return calculateQuote({
      pricePerNight: room.pricePerNight,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      currency: room.currency,
    });
  }, [room, stay.checkIn, stay.checkOut]);

  function handleStayChange(event) {
    const { name, value } = event.target;

    setStay((previous) => {
      const next = { ...previous, [name]: name === "guests" ? Number(value) : value };
      // Keep the departure after the arrival.
      if (name === "checkIn" && next.checkOut <= value) {
        next.checkOut = addDays(value, 1);
      }
      return next;
    });
  }

  function handleBook() {
    const params = new URLSearchParams({
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: String(stay.guests),
    });
    navigate(`/booking/${slug}?${params}`);
  }

  /* ---- States ----------------------------------------------------------- */

  if (isLoading) return <RoomDetailsSkeleton />;

  if (error) {
    return (
      <div className="shms-container" style={{ paddingBlock: "var(--space-16)" }}>
        <ErrorState
          title="We couldn't find that room"
          message={error.message}
          onRetry={reload}
          icon="bi-door-closed"
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

  const isSoldOut = room.availableRooms === 0;

  return (
    <>
      <header className="shms-page-head" style={{ paddingBlock: "var(--space-10)" }}>
        <div className="shms-container">
          <ul className="shms-breadcrumb" style={{ marginBottom: 0 }}>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/rooms">Rooms</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{room.name}</li>
          </ul>
        </div>
      </header>

      <section className="shms-section shms-section-tight">
        <div className="shms-container">
          <RoomGallery images={room.images} roomName={room.name} />

          <div className="shms-detail-layout">
            {/* ------------------------------------------------ Main copy */}
            <div>
              <div className="shms-detail-head">
                <div className="shms-detail-eyebrow">
                  <span className="shms-room-type">{room.type}</span>
                  <StatusBadge
                    status={isSoldOut ? "MAINTENANCE" : "AVAILABLE"}
                    domain="room"
                  />
                  <span className="shms-room-rating">
                    <i className="bi bi-star-fill" aria-hidden="true" />
                    {room.rating.toFixed(1)}
                    <span>({room.reviewCount} reviews)</span>
                  </span>
                </div>

                <h1 className="shms-detail-title">{room.name}</h1>
                <p className="shms-detail-lede">{room.shortDescription}</p>
              </div>

              <div className="shms-detail-block">
                <h2>About this room</h2>
                <p>{room.description}</p>
              </div>

              <div className="shms-detail-block">
                <h2>The essentials</h2>
                <ul className="shms-spec-grid">
                  <li className="shms-spec-tile">
                    <i className="bi bi-people" aria-hidden="true" />
                    <div>
                      <strong>
                        {room.capacity.adults} adults
                        {room.capacity.children > 0 && `, ${room.capacity.children} children`}
                      </strong>
                      <span>Maximum occupancy</span>
                    </div>
                  </li>
                  <li className="shms-spec-tile">
                    <i className="bi bi-moon-stars" aria-hidden="true" />
                    <div>
                      <strong>{room.bedType}</strong>
                      <span>Bed configuration</span>
                    </div>
                  </li>
                  <li className="shms-spec-tile">
                    <i className="bi bi-arrows-angle-expand" aria-hidden="true" />
                    <div>
                      <strong>{room.sizeSqm} m²</strong>
                      <span>Room size</span>
                    </div>
                  </li>
                  <li className="shms-spec-tile">
                    <i className="bi bi-door-open" aria-hidden="true" />
                    <div>
                      <strong>{room.availableRooms} of {room.totalRooms}</strong>
                      <span>Available now</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="shms-detail-block">
                <h2>Amenities</h2>
                <ul className="shms-amenity-grid">
                  {room.amenities.map((id) => {
                    const amenity = AMENITIES[id];
                    if (!amenity) return null;
                    return (
                      <li key={id} className="shms-amenity-item">
                        <i className={`bi ${amenity.icon}`} aria-hidden="true" />
                        {amenity.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="shms-detail-block">
                <h2>Policies</h2>
                <ul className="shms-policy-list">
                  <li>
                    <i className="bi bi-clock" aria-hidden="true" />
                    <span>
                      <strong>Check-in from {HOTEL.checkInTime}</strong>, check-out by{" "}
                      {HOTEL.checkOutTime}. Early arrival and late departure can be arranged
                      subject to availability.
                    </span>
                  </li>
                  <li>
                    <i className="bi bi-shield-check" aria-hidden="true" />
                    <span>
                      <strong>
                        Free cancellation up to {BOOKING_POLICY.freeCancellationHours} hours
                      </strong>{" "}
                      before arrival. Cancellations after that are charged the first night.
                    </span>
                  </li>
                  <li>
                    <i className="bi bi-pencil-square" aria-hidden="true" />
                    <span>
                      <strong>Changes accepted</strong> up to{" "}
                      {BOOKING_POLICY.modificationCutoffHours} hours before arrival, subject to
                      availability in your chosen category.
                    </span>
                  </li>
                  <li>
                    <i className="bi bi-people" aria-hidden="true" />
                    <span>
                      <strong>Children are welcome.</strong> Cots are provided free of charge;
                      extra beds carry a nightly supplement.
                    </span>
                  </li>
                  <li>
                    <i className="bi bi-slash-circle" aria-hidden="true" />
                    <span>
                      <strong>No smoking</strong> in any room or villa. Designated terraces are
                      available throughout the property.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* --------------------------------------------- Booking card */}
            <aside className="shms-booking-card" aria-label="Reserve this room">
              <div className="shms-booking-price">
                <strong>{formatCurrency(room.pricePerNight, room.currency)}</strong>
                <span>per night</span>
              </div>

              <div className="shms-booking-dates">
                <div className="shms-booking-field" style={{ margin: 0 }}>
                  <label className="shms-booking-label" htmlFor="detail-checkin">
                    Check-in
                  </label>
                  <input
                    id="detail-checkin"
                    name="checkIn"
                    type="date"
                    className="shms-input shms-input-bare"
                    value={stay.checkIn}
                    min={todayISO()}
                    onChange={handleStayChange}
                  />
                </div>

                <div className="shms-booking-field" style={{ margin: 0 }}>
                  <label className="shms-booking-label" htmlFor="detail-checkout">
                    Check-out
                  </label>
                  <input
                    id="detail-checkout"
                    name="checkOut"
                    type="date"
                    className="shms-input shms-input-bare"
                    value={stay.checkOut}
                    min={addDays(stay.checkIn, 1)}
                    onChange={handleStayChange}
                  />
                </div>
              </div>

              <div className="shms-booking-field">
                <label className="shms-booking-label" htmlFor="detail-guests">
                  Guests
                </label>
                <select
                  id="detail-guests"
                  name="guests"
                  className="shms-input shms-input-bare"
                  value={stay.guests}
                  onChange={handleStayChange}
                >
                  {GUEST_OPTIONS.map((count) => (
                    <option key={count} value={count} disabled={count > room.capacity.adults}>
                      {count} {count === 1 ? "guest" : "guests"}
                      {count > room.capacity.adults ? " — exceeds capacity" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {quote && quote.nights > 0 && (
                <div className="shms-quote">
                  <div className="shms-quote-row">
                    <span>
                      {formatCurrency(room.pricePerNight, room.currency)} × {quote.nights}{" "}
                      {quote.nights === 1 ? "night" : "nights"}
                    </span>
                    <span>{formatCurrency(quote.roomTotal, room.currency)}</span>
                  </div>
                  <div className="shms-quote-row">
                    <span>Service charge</span>
                    <span>{formatCurrency(quote.serviceCharge, room.currency)}</span>
                  </div>
                  <div className="shms-quote-row">
                    <span>Taxes</span>
                    <span>{formatCurrency(quote.taxes, room.currency)}</span>
                  </div>
                  <div className="shms-quote-row shms-quote-total">
                    <span>Total</span>
                    <span>{formatCurrency(quote.total, room.currency)}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="shms-btn shms-btn-primary shms-btn-block shms-btn-lg"
                onClick={handleBook}
                disabled={isSoldOut}
              >
                {isSoldOut ? "Fully booked" : "Book Now"}
                {!isSoldOut && <i className="bi bi-arrow-right" aria-hidden="true" />}
              </button>

              <p className="shms-booking-note">
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                {isSoldOut
                  ? "No rooms of this type are free for those dates. Try adjusting your stay."
                  : "You won't be charged yet — payment is taken at the final step."}
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

export default RoomDetails;
