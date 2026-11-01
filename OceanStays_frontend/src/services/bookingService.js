/**
 * bookingService.js
 * -----------------------------------------------------------------------------
 * Reservation lifecycle: create, read, modify, cancel, check in, check out.
 *
 * Cancellation and modification windows are enforced here for UX only — the
 * backend must re-check every rule before committing anything.
 */

import { paginate, request } from "./apiClient";
import { BOOKING_STATUS, PAYMENT_STATUS } from "./constants";

export { BOOKING_STATUS, PAYMENT_STATUS };

/** Hotel policy the UI reflects. Backend owns the authoritative copy. */
export const BOOKING_POLICY = {
  freeCancellationHours: 48,
  modificationCutoffHours: 24,
  taxRate: 0.12,
  serviceChargeRate: 0.1,
};

/** Flask serialises dates as RFC 822 strings; the UI compares ISO dates. */
function toISODate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

/** The database's reservation statuses, in the vocabulary the UI renders. */
const BOOKING_STATUS_FROM_DB = {
  Pending: BOOKING_STATUS.PENDING,
  Confirmed: BOOKING_STATUS.CONFIRMED,
  Cancelled: BOOKING_STATUS.CANCELLED,
  Completed: BOOKING_STATUS.CHECKED_OUT,
};

function hoursUntil(dateISO) {
  return (new Date(`${dateISO}T14:00:00`).getTime() - Date.now()) / 3_600_000;
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
  const [reservationData, reservationRoomData, roomsData, roomTypesData] = await Promise.all([
    request("/reservations"),
    request("/reservationrooms"),
    request("/rooms"),
    request("/roomtypes"),
  ]);

  const roomsById = new Map(
    roomsData.rooms.map(([id, roomNumber, roomTypeId]) => [id, { roomNumber, roomTypeId }]),
  );
  const roomTypesById = new Map(roomTypesData.room_types.map(([id, name]) => [id, name]));
  const roomIdByReservation = new Map(
    reservationRoomData.reservation_rooms.map(([, reservationId, roomId]) => [reservationId, roomId]),
  );

  const { status, guestId, search, date, page, pageSize } = query;
  const term = search?.trim().toLowerCase();

  const items = reservationData.reservations
    .map(
      ([id, reservationGuestId, createdAt, checkIn, checkOut, guests, reservationStatus, specialRequests, total, firstName, lastName, email]) => {
        const roomId = roomIdByReservation.get(id) ?? null;
        const room = roomId ? roomsById.get(roomId) : null;
        const isoCheckIn = toISODate(checkIn);
        const isoCheckOut = toISODate(checkOut);

        return {
          id,
          reference: `RSV-${id}`,
          guestId: reservationGuestId,
          guestName: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
          guestEmail: email,
          createdAt: toISODate(createdAt),
          checkIn: isoCheckIn,
          checkOut: isoCheckOut,
          nights: nightsBetween(isoCheckIn, isoCheckOut),
          guests,
          roomId,
          roomNumber: room?.roomNumber ?? null,
          roomTypeName: room ? (roomTypesById.get(room.roomTypeId) ?? "Unknown") : "Not allocated",
          status: BOOKING_STATUS_FROM_DB[reservationStatus] ?? reservationStatus,
          specialRequests,
          total: Number(total),
          currency: "LKR",
        };
      },
    )
    .filter((booking) => {
      if (status && booking.status !== status) return false;
      if (guestId && booking.guestId !== guestId) return false;
      if (date && !(booking.checkIn <= date && booking.checkOut >= date)) return false;
      if (term) {
        const haystack =
          `${booking.reference} ${booking.guestName} ${booking.guestEmail} ${booking.roomTypeName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return paginate(items, { page, pageSize: pageSize ?? 10 });
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