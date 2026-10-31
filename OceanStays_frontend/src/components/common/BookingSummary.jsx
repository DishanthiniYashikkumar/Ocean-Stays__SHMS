import { formatCurrency, formatDate } from "../../utils/format";
import "../../styles/booking.css";

/**
 * Stay and price panel, shown beside every step of the booking flow.
 *
 * The figures come from `calculateQuote` in bookingService — the same function
 * that prices the room detail page and that the created booking is built from,
 * so the guest sees one number throughout.
 *
 * @param {{
 *   room: object,
 *   stay: { checkIn: string, checkOut: string, guests: number },
 *   quote: { nights, roomTotal, taxes, serviceCharge, discount, total, currency },
 *   heading?: string
 * }} props
 */
function BookingSummary({ room, stay, quote, heading = "Your stay" }) {
  const { currency } = quote;

  return (
    <aside className="shms-summary" aria-label="Booking summary">
      <div className="shms-summary-media">
        <img src={room.images[0]} alt={room.name} />
        <span>{heading}</span>
      </div>

      <div className="shms-summary-body">
        <h2 className="shms-summary-name">{room.name}</h2>

        <ul className="shms-summary-facts">
          <li>
            <i className="bi bi-calendar2-check" aria-hidden="true" />
            <div>
              <strong>{formatDate(stay.checkIn)}</strong>
              <span>Check-in from 14:00</span>
            </div>
          </li>
          <li>
            <i className="bi bi-calendar2-x" aria-hidden="true" />
            <div>
              <strong>{formatDate(stay.checkOut)}</strong>
              <span>Check-out by 11:00</span>
            </div>
          </li>
          <li>
            <i className="bi bi-moon-stars" aria-hidden="true" />
            <div>
              <strong>
                {quote.nights} {quote.nights === 1 ? "night" : "nights"}
              </strong>
              <span>{room.bedType}</span>
            </div>
          </li>
          <li>
            <i className="bi bi-people" aria-hidden="true" />
            <div>
              <strong>
                {stay.guests} {stay.guests === 1 ? "guest" : "guests"}
              </strong>
              <span>Maximum {room.capacity.adults} adults</span>
            </div>
          </li>
        </ul>

        <div className="shms-summary-lines">
          <div className="shms-summary-row">
            <span>
              {formatCurrency(room.pricePerNight, currency)} × {quote.nights}{" "}
              {quote.nights === 1 ? "night" : "nights"}
            </span>
            <span>{formatCurrency(quote.roomTotal, currency)}</span>
          </div>

          <div className="shms-summary-row">
            <span>Service charge (10%)</span>
            <span>{formatCurrency(quote.serviceCharge, currency)}</span>
          </div>

          <div className="shms-summary-row">
            <span>Taxes (12%)</span>
            <span>{formatCurrency(quote.taxes, currency)}</span>
          </div>

          {quote.discount > 0 && (
            <div className="shms-summary-row shms-summary-row-discount">
              <span>Discount</span>
              <span>−{formatCurrency(quote.discount, currency)}</span>
            </div>
          )}

          <div className="shms-summary-row shms-summary-total">
            <span>Total</span>
            <span>{formatCurrency(quote.total, currency)}</span>
          </div>
        </div>

        <p className="shms-summary-note">
          <i className="bi bi-shield-check" aria-hidden="true" />
          Free cancellation up to 48 hours before arrival. No charge until you confirm.
        </p>
      </div>
    </aside>
  );
}

export default BookingSummary;
