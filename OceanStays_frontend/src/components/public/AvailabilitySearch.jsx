import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, todayISO } from "../../utils/format";
import "../../styles/search.css";

/**
 * Quick availability search. It does not fetch anything itself — it validates
 * the range and hands the criteria to the rooms listing as query parameters,
 * so the search is shareable, bookmarkable and survives a login redirect.
 *
 * @param {{ inline?: boolean, initialValues?: object }} props
 *   inline — rendered on a page without a hero to overlap.
 */

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6];

function AvailabilitySearch({ inline = false, initialValues }) {
  const navigate = useNavigate();
  const uid = useId();

  const [values, setValues] = useState({
    checkIn: initialValues?.checkIn ?? todayISO(),
    checkOut: initialValues?.checkOut ?? addDays(todayISO(), 3),
    guests: initialValues?.guests ?? 2,
  });
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => {
      const next = { ...previous, [name]: value };

      // Keep checkout after checkin: pushing the arrival past the departure
      // drags the departure along rather than rejecting the input.
      if (name === "checkIn" && next.checkOut <= value) {
        next.checkOut = addDays(value, 1);
      }
      return next;
    });
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!values.checkIn || !values.checkOut) {
      setError("Please choose both an arrival and a departure date.");
      return;
    }
    if (values.checkOut <= values.checkIn) {
      setError("Your departure date must be after your arrival date.");
      return;
    }

    const params = new URLSearchParams({
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      guests: String(values.guests),
    });
    navigate(`/rooms?${params}`);
  }

  return (
    <div className={`shms-search-wrap${inline ? " shms-search-inline" : ""}`}>
      <div className="shms-container">
        <form
          className="shms-search"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Check room availability"
        >
          {/* --------------------------------------------------- Check-in */}
          <div className="shms-search-field">
            <label className="shms-search-label" htmlFor={`${uid}-checkin`}>
              <i className="bi bi-calendar2-check" aria-hidden="true" />
              Check-in
            </label>
            <input
              id={`${uid}-checkin`}
              name="checkIn"
              type="date"
              className="shms-input shms-input-bare"
              value={values.checkIn}
              min={todayISO()}
              onChange={handleChange}
            />
          </div>

          {/* -------------------------------------------------- Check-out */}
          <div className="shms-search-field">
            <label className="shms-search-label" htmlFor={`${uid}-checkout`}>
              <i className="bi bi-calendar2-x" aria-hidden="true" />
              Check-out
            </label>
            <input
              id={`${uid}-checkout`}
              name="checkOut"
              type="date"
              className="shms-input shms-input-bare"
              value={values.checkOut}
              min={addDays(values.checkIn, 1)}
              onChange={handleChange}
            />
          </div>

          {/* ----------------------------------------------------- Guests */}
          <div className="shms-search-field">
            <label className="shms-search-label" htmlFor={`${uid}-guests`}>
              <i className="bi bi-people" aria-hidden="true" />
              Guests
            </label>
            <select
              id={`${uid}-guests`}
              name="guests"
              className="shms-input shms-input-bare"
              value={values.guests}
              onChange={handleChange}
            >
              {GUEST_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="shms-btn shms-btn-primary shms-search-submit">
            <i className="bi bi-search" aria-hidden="true" />
            Search Rooms
          </button>

          {error ? (
            <p className="shms-alert shms-search-error" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : (
            <p className="shms-search-note">
              <i className="bi bi-shield-check" aria-hidden="true" />
              Best rate guaranteed · Free cancellation up to 48 hours before arrival
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default AvailabilitySearch;
