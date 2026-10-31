import Reservations from "../reception/Reservations";

/**
 * Reservation oversight.
 *
 * The reception module already renders every reservation with search, filters,
 * a detail view and cancellation, all backed by bookingService. An admin needs
 * exactly that, so this re-exports it rather than maintaining a second copy of
 * the same table and the same cancellation rules.
 *
 * If admin-only actions are needed later (bulk export, force-modify past the
 * policy cutoff), this is where they'd be layered on.
 */
export default Reservations;
