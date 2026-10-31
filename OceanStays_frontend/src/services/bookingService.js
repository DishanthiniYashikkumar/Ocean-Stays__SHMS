/**
 * bookingService.js
 * -----------------------------------------------------------------------------
 * Reservation lifecycle: create, read, modify, cancel, check in, check out.
 *
 * Cancellation and modification windows are enforced here for UX only — the
 * backend must re-check every rule before committing anything.
 */

import { USE_MOCK_API, clone, delay, paginate, request } from "./apiClient";
import { BOOKING_STATUS, PAYMENT_STATUS, bookings, invoices } from "./mock/bookings";
import { ROOM_STATUS, rooms, roomTypes } from "./mock/rooms";

export { BOOKING_STATUS, PAYMENT_STATUS };

/** Hotel policy the UI reflects. Backend owns the authoritative copy. */
export const BOOKING_POLICY = {
  freeCancellationHours: 48,
  modificationCutoffHours: 24,
  taxRate: 0.12,
  serviceChargeRate: 0.1,
};

function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

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
  if (!USE_MOCK_API) {
  const [reservationData, reservationRoomData, roomsData, roomTypesData] = await Promise.all([
    request("/reservations"),
    request("/reservationrooms"),
    request("/rooms"),
    request("/roomtypes"),
  ]);

  const roomsById = new Map(
    roomsData.rooms.map(([id, roomNumber, roomTypeId]) => [
      id,
      { roomNumber, roomTypeId },
    ]),
  );

  const roomTypesById = new Map(
    roomTypesData.room_types.map(([id, name]) => [id, name]),
  );

  const reservationRoomsByReservationId = new Map(
    reservationRoomData.reservation_rooms.map(([, reservationId, roomId]) => [
      reservationId,
      roomId,
    ]),
  );

  return {
    items: reservationData.reservations.map(
     ([id, guestId, createdAt, checkIn, checkOut, roomTypeId, status, specialRequests, total, firstName, lastName, email]) =>  {
        const physicalRoomId = reservationRoomsByReservationId.get(id);
        const room = physicalRoomId ? roomsById.get(physicalRoomId) : null;

        return {
          id,
          reference: `RSV-${id}`,
          guestId,
          guestName: `${firstName} ${lastName}`,
          guestEmail: email,
          createdAt,
          
          checkIn,
          checkOut,
          roomId: physicalRoomId ?? null,
          roomNumber: room?.roomNumber ?? null,
          roomTypeName: room?.roomTypeId
            ? roomTypesById.get(room.roomTypeId) ?? "Unknown"
            : "Not allocated",
          status: status.toUpperCase().replace(" ", "_"),
          specialRequests,
          total: Number(total),
          currency: "LKR",
        };
      },
    ),
  };
}

  await delay();
  const { status, guestId, search, date, page, pageSize } = query;
  const term = search?.trim().toLowerCase();

  const filtered = bookings.filter((booking) => {
    if (status && booking.status !== status) return false;
    if (guestId && booking.guestId !== guestId) return false;
    if (date && !(booking.checkIn <= date && booking.checkOut >= date)) return false;
    if (term) {
      const haystack =
        `${booking.reference} ${booking.guestName} ${booking.guestEmail} ${booking.roomTypeName}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(filtered, { page, pageSize: pageSize ?? 10 });
}

/** All bookings for one guest, split into current / upcoming / past. */
export async function getGuestBookings(guestId) {
  if (!USE_MOCK_API) return request(`/bookings/guest/${guestId}`);

  await delay();
  const today = todayISO();
  const mine = bookings.filter((booking) => booking.guestId === guestId);

  return {
    current: clone(mine.filter((b) => b.status === BOOKING_STATUS.CHECKED_IN)),
    upcoming: clone(
      mine
        .filter((b) => [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(b.status) && b.checkIn >= today)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    ),
    past: clone(
      mine
        .filter((b) => [BOOKING_STATUS.CHECKED_OUT, BOOKING_STATUS.CANCELLED].includes(b.status))
        .sort((a, b) => b.checkOut.localeCompare(a.checkOut)),
    ),
  };
}

export async function getBookingById(bookingId) {
  if (!USE_MOCK_API) return request(`/bookings/${bookingId}`);

  await delay();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");
  return clone(booking);
}

/** Today's arrivals and departures for the front desk. */
export async function getFrontDeskSummary() {
  if (!USE_MOCK_API) return request("/bookings/front-desk");

  await delay(400);
  const today = todayISO();

  return {
    arrivals: clone(
      bookings.filter(
        (b) => b.checkIn === today && [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(b.status),
      ),
    ),
    departures: clone(bookings.filter((b) => b.checkOut === today && b.status === BOOKING_STATUS.CHECKED_IN)),
    inHouse: clone(bookings.filter((b) => b.status === BOOKING_STATUS.CHECKED_IN)),
    unpaid: clone(bookings.filter((b) => b.paymentStatus === PAYMENT_STATUS.PENDING)),
  };
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates a reservation.
 * @param {object} payload roomTypeId, checkIn, checkOut, guests, guest details
 */
export async function createBooking(payload) {
  if (!USE_MOCK_API) return request("/bookings", { method: "POST", body: payload });

  await delay(900);
  const type = roomTypes.find((rt) => rt.id === payload.roomTypeId);
  if (!type) throw new Error("That room type is no longer available.");

  const quote = calculateQuote({
    pricePerNight: type.pricePerNight,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    discount: payload.discount ?? 0,
    currency: type.currency,
  });

  const id = `bk-${Math.floor(10_000 + Math.random() * 89_999)}`;
  const booking = {
    id,
    reference: `OS-${id.slice(3)}`,
    guestId: payload.guestId ?? null,
    guestName: payload.guestName,
    guestEmail: payload.guestEmail,
    guestPhone: payload.guestPhone,
    roomTypeId: type.id,
    roomTypeName: type.name,
    roomId: null,
    roomNumber: null,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    nights: quote.nights,
    guests: payload.guests,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    roomTotal: quote.roomTotal,
    taxes: quote.taxes,
    serviceCharge: quote.serviceCharge,
    discount: quote.discount,
    total: quote.total,
    currency: quote.currency,
    specialRequests: payload.specialRequests ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  bookings.unshift(booking);
  return clone(booking);
}

/**
 * Confirms a reservation that is still PENDING.
 *
 * Card and bank payments confirm the booking as a side effect of settling, so
 * this is for the pay-on-arrival case: the room is held and the reservation is
 * real, with the balance outstanding until check-in.
 */
export async function confirmBooking(bookingId) {
  if (!USE_MOCK_API) return request(`/bookings/${bookingId}/confirm`, { method: "POST" });

  await delay(500);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");

  if (booking.status === BOOKING_STATUS.PENDING) {
    booking.status = BOOKING_STATUS.CONFIRMED;
  }
  return clone(booking);
}

/** Applies date / guest / request changes to an existing booking. */
export async function updateBooking(bookingId, changes) {
  if (!USE_MOCK_API) return request(`/bookings/${bookingId}`, { method: "PATCH", body: changes });

  await delay(700);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");
  if (!canModify(booking)) {
    throw new Error("This booking can no longer be modified. Please contact the front desk.");
  }

  Object.assign(booking, changes);
  booking.nights = nightsBetween(booking.checkIn, booking.checkOut);
  return clone(booking);
}

export async function cancelBooking(bookingId, reason = "") {
  if (!USE_MOCK_API) {
    return request(`/bookings/${bookingId}/cancel`, { method: "POST", body: { reason } });
  }

  await delay(700);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");
  if (!canCancel(booking)) {
    throw new Error("The free cancellation window for this booking has closed.");
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = reason;
  if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }
  return clone(booking);
}

/**
 * Allocates a physical room and marks the guest as checked in.
 *
 * The room moves to OCCUPIED as part of the same operation. Leaving it READY
 * would let the front desk allocate the same room to a second arrival — the
 * room state has to follow the booking, not be a separate thing to remember.
 */
export async function checkInBooking(bookingId, { roomId, roomNumber }) {
  if (!USE_MOCK_API) {
    return request(`/bookings/${bookingId}/check-in`, { method: "POST", body: { roomId } });
  }

  await delay(700);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");

  Object.assign(booking, { status: BOOKING_STATUS.CHECKED_IN, roomId, roomNumber });

  const room = rooms.find((item) => item.id === roomId);
  if (room) room.status = ROOM_STATUS.OCCUPIED;

  return clone(booking);
}

/**
 * Closes the stay and hands the room to housekeeping.
 *
 * Returning it straight to AVAILABLE would let it be sold while the previous
 * guest's towels are still on the floor, so it goes to DIRTY and only the
 * housekeeping chain can move it back to sellable.
 */
export async function checkOutBooking(bookingId) {
  if (!USE_MOCK_API) return request(`/bookings/${bookingId}/check-out`, { method: "POST" });

  await delay(700);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error("We couldn't find that booking.");

  booking.status = BOOKING_STATUS.CHECKED_OUT;

  const room = rooms.find((item) => item.id === booking.roomId);
  if (room) room.status = ROOM_STATUS.DIRTY;

  return clone(booking);
}

/* -------------------------------------------------------------------------- */
/* Invoices                                                                   */
/* -------------------------------------------------------------------------- */

export async function getInvoiceForBooking(bookingId) {
  if (!USE_MOCK_API) return request(`/bookings/${bookingId}/invoice`);

  await delay();
  const invoice = invoices.find((inv) => inv.bookingId === bookingId);
  if (!invoice) throw new Error("No invoice has been issued for this booking yet.");
  return clone(invoice);
}
export async function getReservationRooms() {
  if (!USE_MOCK_API) return request("/reservationrooms");
}