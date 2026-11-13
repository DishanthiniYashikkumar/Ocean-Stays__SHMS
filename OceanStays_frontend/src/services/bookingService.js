/**
 * bookingService.js
 * -----------------------------------------------------------------------------
 * Reservation lifecycle: create, read, modify, cancel, check in, check out.
 *
 * Cancellation and modification windows are enforced here for UX only — the
 * backend must re-check every rule before committing anything.
 */

import { request } from "./apiClient";
import { BOOKING_STATUS, PAYMENT_STATUS } from "./constants";
import { POLICY } from "./hotelInfo";

export { BOOKING_STATUS, PAYMENT_STATUS };

/** Hotel policy the UI reflects. Backend owns the authoritative copy. */
export const BOOKING_POLICY = POLICY;



function hoursUntil(dateISO) {
  return (new Date(`${dateISO}T${POLICY.checkInTime || "14:00"}:00`).getTime() - Date.now()) / 3_600_000;
}

/** Nights between two ISO dates; checkout day is not charged. */
export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Builds a price breakdown for the booking summary and payment screens.
 * @returns {{nights, roomTotal, taxes, serviceCharge, discount, total, currency}}
 */
export function calculateQuote({ pricePerNight, checkIn, checkOut, discount = 0, currency = "LKR" }) {
  const nights = nightsBetween(checkIn, checkOut);
  const roomTotal = pricePerNight * nights;
  const taxes = Math.round(roomTotal * BOOKING_POLICY.taxRate);
  const serviceCharge = Math.round(roomTotal * BOOKING_POLICY.serviceChargeRate);

  return {
    nights,
    roomTotal,
    taxes,
    serviceCharge,
    discount,
    total: roomTotal + taxes + serviceCharge - discount,
    currency,
  };
}

/** Whether the guest may still cancel free of charge. */
export function canCancel(booking) {
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CHECKED_OUT].includes(booking.status)) return false;
  return hoursUntil(booking.checkIn) > BOOKING_POLICY.freeCancellationHours;
}

/** Whether dates or guest counts may still be changed. */
export function canModify(booking) {
  if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status)) return false;
  return hoursUntil(booking.checkIn) > BOOKING_POLICY.modificationCutoffHours;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Lists bookings, optionally filtered. Returns a paginated envelope.
 * @param {object} [query] status, guestId, search, date, page, pageSize
 */
export async function getBookings(query = {}) {
  const { status, guestId, search, date, page, pageSize } = query;
  // Filtering, search and paging happen on the server; the envelope matches paginate().
  return request("/bookings", {
    params: { status, guestId, search: search?.trim(), date, page, pageSize: pageSize ?? 10 },
  });
}

/** All bookings for one guest, split into current / upcoming / past. */
export async function getGuestBookings(guestId) {
  return request(`/bookings/guest/${guestId}`);
}

export async function getBookingById(bookingId) {
  return request(`/bookings/${bookingId}`);
}

/** Today's arrivals and departures for the front desk. */
export async function getFrontDeskSummary() {
  return request("/bookings/front-desk");
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates a reservation.
 * @param {object} payload roomTypeId, checkIn, checkOut, guests, guest details
 */
export async function createBooking(payload) {
  return request("/bookings", { method: "POST", body: payload });
}

/**
 * Confirms a reservation that is still PENDING.
 *
 * Card and bank payments confirm the booking as a side effect of settling, so
 * this is for the pay-on-arrival case: the room is held and the reservation is
 * real, with the balance outstanding until check-in.
 */
export async function confirmBooking(bookingId) {
  return request(`/bookings/${bookingId}/confirm`, { method: "POST" });
}

/** Applies date / guest / request changes to an existing booking. */
export async function updateBooking(bookingId, changes) {
  return request(`/bookings/${bookingId}`, { method: "PATCH", body: changes });
}

export async function cancelBooking(bookingId, reason = "") {
  return request(`/bookings/${bookingId}/cancel`, { method: "POST", body: { reason } });
}

/**
 * Allocates a physical room and marks the guest as checked in.
 *
 * The room moves to OCCUPIED as part of the same operation. Leaving it READY
 * would let the front desk allocate the same room to a second arrival — the
 * room state has to follow the booking, not be a separate thing to remember.
 */
export async function checkInBooking(bookingId, { roomId }) {
  return request(`/bookings/${bookingId}/check-in`, { method: "POST", body: { roomId } });
}

/**
 * Closes the stay and hands the room to housekeeping.
 *
 * Returning it straight to AVAILABLE would let it be sold while the previous
 * guest's towels are still on the floor, so it goes to DIRTY and only the
 * housekeeping chain can move it back to sellable.
 */
export async function checkOutBooking(bookingId) {
  return request(`/bookings/${bookingId}/check-out`, { method: "POST" });
}

/* -------------------------------------------------------------------------- */
/* Invoices                                                                   */
/* -------------------------------------------------------------------------- */

export async function getInvoiceForBooking(bookingId) {
  return request(`/bookings/${bookingId}/invoice`);
}
export async function getReservationRooms() {
  return request("/reservationrooms");
}