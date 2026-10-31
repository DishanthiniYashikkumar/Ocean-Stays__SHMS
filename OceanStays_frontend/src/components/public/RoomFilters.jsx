import { useId } from "react";
import { AMENITIES } from "../../services/roomService";
import "../../styles/rooms.css";

/**
 * Filter panel for the rooms listing. Purely presentational — it reports
 * changes upward and the page keeps the state in the URL, so a filtered view
 * is shareable and survives a refresh.
 *
 * @param {{
 *   values: { type?: string, guests?: string, minPrice?: string, maxPrice?: string, amenities: string[] },
 *   counts: Record<string, number>,   Room counts per type, from the unfiltered set
 *   isOpen: boolean,                  Mobile disclosure state
 *   onChange: (key: string, value: any) => void,
 *   onClear: () => void
 * }} props
 */

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Villa", "Penthouse"];
const GUEST_OPTIONS = [1, 2, 3, 4];
const FILTERABLE_AMENITIES = ["oceanView", "balcony", "pool", "bathtub", "butler", "desk"];

function RoomFilters({ values, counts, isOpen, onChange, onClear }) {
  const uid = useId();

  function toggleAmenity(id) {
    const next = values.amenities.includes(id)
      ? values.amenities.filter((item) => item !== id)
      : [...values.amenities, id];
    onChange("amenity", next);
  }

  return (
    <aside className={`shms-filters${isOpen ? " is-open" : ""}`} aria-label="Filter rooms">
      <div className="shms-filters-head">
        <h2 className="shms-filters-title">
          <i className="bi bi-sliders" aria-hidden="true" />
          Refine
        </h2>
        <button type="button" className="shms-filter-clear" onClick={onClear}>
          Clear all
        </button>
      </div>

      {/* ------------------------------------------------------ Room type */}
      <fieldset className="shms-filter-group" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="shms-filter-legend">Room type</legend>

        <div className="shms-filter-options">
          <label className="shms-filter-option">
            <input
              type="radio"
              name={`${uid}-type`}
              checked={!values.type}
              onChange={() => onChange("type", "")}
            />
            All types
          </label>

          {ROOM_TYPES.map((type) => (
            <label key={type} className="shms-filter-option">
              <input
                type="radio"
                name={`${uid}-type`}
                checked={values.type === type}
                onChange={() => onChange("type", type)}
              />
              {type}
              <span className="shms-filter-count">{counts[type] ?? 0}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- Guests */}
      <fieldset className="shms-filter-group" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="shms-filter-legend">Guests</legend>

        <div className="shms-filter-options">
          <label className="shms-filter-option">
            <input
              type="radio"
              name={`${uid}-guests`}
              checked={!values.guests}
              onChange={() => onChange("guests", "")}
            />
            Any
          </label>

          {GUEST_OPTIONS.map((count) => (
            <label key={count} className="shms-filter-option">
              <input
                type="radio"
                name={`${uid}-guests`}
                checked={values.guests === String(count)}
                onChange={() => onChange("guests", String(count))}
              />
              {count}+ {count === 1 ? "guest" : "guests"}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---------------------------------------------------- Price range */}
      <div className="shms-filter-group">
        <span className="shms-filter-legend" id={`${uid}-price-label`}>
          Price per night (LKR)
        </span>

        <div className="shms-filter-price" aria-labelledby={`${uid}-price-label`}>
          <input
            type="number"
            className="shms-input shms-input-bare"
            placeholder="Min"
            min="0"
            step="1000"
            value={values.minPrice ?? ""}
            onChange={(event) => onChange("minPrice", event.target.value)}
            aria-label="Minimum price per night"
          />
          <span>to</span>
          <input
            type="number"
            className="shms-input shms-input-bare"
            placeholder="Max"
            min="0"
            step="1000"
            value={values.maxPrice ?? ""}
            onChange={(event) => onChange("maxPrice", event.target.value)}
            aria-label="Maximum price per night"
          />
        </div>
      </div>

      {/* ------------------------------------------------------ Amenities */}
      <fieldset className="shms-filter-group" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="shms-filter-legend">Amenities</legend>

        <div className="shms-filter-options">
          {FILTERABLE_AMENITIES.map((id) => {
            const amenity = AMENITIES[id];
            if (!amenity) return null;

            return (
              <label key={id} className="shms-filter-option">
                <input
                  type="checkbox"
                  checked={values.amenities.includes(id)}
                  onChange={() => toggleAmenity(id)}
                />
                {amenity.label}
              </label>
            );
          })}
        </div>
      </fieldset>
    </aside>
  );
}

export default RoomFilters;
