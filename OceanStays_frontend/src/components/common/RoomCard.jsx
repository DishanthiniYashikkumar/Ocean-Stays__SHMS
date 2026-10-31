import { Link } from "react-router-dom";
import { AMENITIES } from "../../services/roomService";
import { formatCurrency } from "../../utils/format";
import "../../styles/cards.css";

/**
 * Premium room listing card. Used on the home page's featured strip and on the
 * rooms listing, so it takes its layout from the grid it sits in.
 *
 * @param {{
 *   room: object,              A room type from roomService
 *   searchParams?: string      Forwarded to the detail page so dates survive
 * }} props
 */

const MAX_VISIBLE_AMENITIES = 3;

function RoomCard({ room, searchParams = "" }) {
  const {
    slug,
    name,
    type,
    shortDescription,
    pricePerNight,
    currency,
    capacity,
    bedType,
    sizeSqm,
    amenities,
    images,
    availableRooms,
    rating,
    reviewCount,
  } = room;

  const detailUrl = `/rooms/${slug}${searchParams}`;
  const isSoldOut = availableRooms === 0;

  const visibleAmenities = amenities.slice(0, MAX_VISIBLE_AMENITIES);
  const hiddenCount = amenities.length - visibleAmenities.length;

  return (
    <article className="shms-room-card">
      <div className="shms-room-media">
        <img
          src={images?.[0] || "/images/room-placeholder.jpg"}
          alt={`${name} — ${type} room at Ocean Stays`}
          loading="lazy"
          decoding="async"
        />

        <div className="shms-room-badges">
          <span className={`shms-badge shms-badge-${isSoldOut ? "danger" : "success"}`}>
            {isSoldOut ? "Fully booked" : `${availableRooms} available`}
          </span>

          <span className="shms-room-price-tag">
            <strong>{formatCurrency(pricePerNight, currency)}</strong>
            <span>PER NIGHT</span>
          </span>
        </div>
      </div>

      <div className="shms-room-body">
        <span className="shms-room-type">{type}</span>

        <h3 className="shms-room-name">
          <Link to={detailUrl}>{name}</Link>
        </h3>

        <p className="shms-room-summary">{shortDescription}</p>

        <ul className="shms-room-specs">
          <li>
            <i className="bi bi-people" aria-hidden="true" />
            {capacity.adults} guest{capacity.adults > 1 ? "s" : ""}
          </li>
          <li>
            <i className="bi bi-moon-stars" aria-hidden="true" />
            {bedType}
          </li>
          <li>
            <i className="bi bi-arrows-angle-expand" aria-hidden="true" />
            {sizeSqm} m²
          </li>
        </ul>

        <ul className="shms-room-amenities">
          {visibleAmenities.map((id) => {
            const amenity = AMENITIES[id];
            if (!amenity) return null;
            return (
              <li key={id} className="shms-amenity-chip">
                <i className={`bi ${amenity.icon}`} aria-hidden="true" />
                {amenity.label}
              </li>
            );
          })}
          {hiddenCount > 0 && (
            <li className="shms-amenity-chip shms-amenity-more">+{hiddenCount} more</li>
          )}
        </ul>

        <span className="shms-room-rating">
          <i className="bi bi-star-fill" aria-hidden="true" />
          {(rating ?? 0).toFixed(1)}
          <span>({reviewCount} reviews)</span>
        </span>

        <div className="shms-room-actions">
          <Link className="shms-btn shms-btn-outline shms-btn-sm" to={detailUrl}>
            View Details
          </Link>
          <Link
            className="shms-btn shms-btn-primary shms-btn-sm"
            to={`/booking/${slug}${searchParams}`}
            aria-disabled={isSoldOut}
            onClick={(event) => {
              if (isSoldOut) event.preventDefault();
            }}
          >
            Book Now
          </Link>
        </div>
      </div>
    </article>
  );
}

export default RoomCard;
