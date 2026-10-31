/**
 * roomService.js
 * -----------------------------------------------------------------------------
 * Room types (the bookable product) and physical rooms (the inventory).
 *
 * Backend integration: delete the `mock*` functions and the USE_MOCK_API
 * branches. The exported signatures are what components depend on and must not
 * change.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { ROOM_STATUS, rooms, roomTypes } from "./mock/rooms";
import { bookings, BOOKING_STATUS } from "./mock/bookings";

export { ROOM_STATUS };
export { SELLABLE_STATUSES } from "./mock/rooms";
export { AMENITIES, BED_TYPES } from "./mock/rooms";

/** Bookings that actually hold inventory. Cancelled ones free the room up. */
const BLOCKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
];

/** Two date ranges overlap unless one ends before the other begins. */
function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * How many rooms of a type remain for a date range.
 * Checkout day is not an occupied night, so `checkOut` is exclusive.
 */
function availableCountFor(roomTypeId, checkIn, checkOut) {
  const type = roomTypes.find((rt) => rt.id === roomTypeId);
  if (!type) return 0;
  if (!checkIn || !checkOut) return type.availableRooms;

  const held = bookings.filter(
    (booking) =>
      booking.roomTypeId === roomTypeId &&
      BLOCKING_STATUSES.includes(booking.status) &&
      rangesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut),
  ).length;

  return Math.max(0, type.totalRooms - held);
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Lists bookable room types with optional filtering and sorting.
 *
 * @param {object} [query]
 * @param {string} [query.search]     Matches name, type or description
 * @param {string} [query.type]       Room type category, e.g. "Suite"
 * @param {number} [query.guests]     Minimum adult capacity
 * @param {number} [query.minPrice]
 * @param {number} [query.maxPrice]
 * @param {string[]} [query.amenities] Amenity ids that must all be present
 * @param {string} [query.checkIn]    ISO date (YYYY-MM-DD)
 * @param {string} [query.checkOut]   ISO date (YYYY-MM-DD)
 * @param {string} [query.sort]       price-asc | price-desc | rating | name
 * @returns {Promise<Array>}
 */
export async function getRoomTypes(query = {}) {
  if (!USE_MOCK_API) {
  const data = await request("/roomtypes");

  return data.room_types.map(([id, type, description, capacity, price]) => ({
    id,
    name: type,
    type,
    shortDescription: description,
    pricePerNight: Number(price),
    currency: "LKR",
    capacity: { adults: Number(capacity), children: 0 },
    amenities: [],
    images: roomTypes.find((room) => room.type === type)?.images || roomTypes[0].images,
  }));

}

  await delay();

  const { search, type, guests, minPrice, maxPrice, amenities, checkIn, checkOut, sort } = query;
  const term = search?.trim().toLowerCase();

  let results = roomTypes.filter((room) => {
    if (term) {
      const haystack = `${room.name} ${room.type} ${room.shortDescription}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (type && room.type !== type) return false;
    if (guests && room.capacity.adults < Number(guests)) return false;
    if (minPrice != null && room.pricePerNight < Number(minPrice)) return false;
    if (maxPrice != null && room.pricePerNight > Number(maxPrice)) return false;
    if (amenities?.length && !amenities.every((id) => room.amenities.includes(id))) return false;
    return true;
  });

  results = results.map((room) => ({
    ...clone(room),
    availableRooms: availableCountFor(room.id, checkIn, checkOut),
  }));

  const sorters = {
    "price-asc": (a, b) => a.pricePerNight - b.pricePerNight,
    "price-desc": (a, b) => b.pricePerNight - a.pricePerNight,
    rating: (a, b) => b.rating - a.rating,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  if (sorters[sort]) results.sort(sorters[sort]);

  return results;
}

/**
 * How many room types sit in each category, for the filter panel's counts.
 * Synchronous: it describes the catalogue's shape, not live availability.
 */
export function getRoomTypeCounts() {
  return roomTypes.reduce((counts, room) => {
    counts[room.type] = (counts[room.type] ?? 0) + 1;
    return counts;
  }, {});
}

/** Room types flagged for the home page. */
export async function getFeaturedRoomTypes() {
  if (!USE_MOCK_API) {
    const data = await request("/roomtypes");

    return data.room_types.map(([id, type, description, capacity, price], index) => ({
      id,
      slug: type.toLowerCase(),
      name: type,
      type,
      shortDescription: description,
      pricePerNight: Number(price),
      currency: "LKR",
      capacity: { adults: Number(capacity), children: 0 },
      bedType: "—",
      sizeSqm: 0,
      amenities: [],
      images: roomTypes[index]?.images || [],
      availableRooms: 0,
      rating: 0,
      reviewCount: 0,
    }));
  }

  await delay(400);
  return clone(roomTypes.filter((room) => room.featured));
}


/**
 * Fetches one room type by its URL slug.
 * @throws {Error} when no room matches
 */
export async function getRoomTypeBySlug(slug, { checkIn, checkOut } = {}) {
  if (!USE_MOCK_API) return request("/roomtypes");

  await delay();
  const room = roomTypes.find((rt) => rt.slug === slug);
  if (!room) throw new Error("We couldn't find that room. It may no longer be available.");

  return {
    ...clone(room),
    availableRooms: availableCountFor(room.id, checkIn, checkOut),
  };
}

/**
 * Checks availability across all room types for a date range.
 * @returns {Promise<Array<{roomTypeId, name, available, pricePerNight}>>}
 */
export async function checkAvailability({ checkIn, checkOut, guests } = {}) {
  if (!USE_MOCK_API) {
    if (!USE_MOCK_API) return request("/rooms");
  }

  await delay(700);
  return roomTypes
    .filter((room) => !guests || room.capacity.adults >= Number(guests))
    .map((room) => ({
      roomTypeId: room.id,
      slug: room.slug,
      name: room.name,
      pricePerNight: room.pricePerNight,
      available: availableCountFor(room.id, checkIn, checkOut),
    }));
}

/* -------------------------------------------------------------------------- */
/* Physical inventory (staff-facing)                                          */
/* -------------------------------------------------------------------------- */

/** Physical rooms, each joined to its room type for display. */
export async function getRooms({ status, floor } = {}) {
  if (!USE_MOCK_API) {
  const data = await request("/rooms");
  const typeData = await request("/roomtypes");

  const roomTypes = typeData.room_types;

  return data.rooms.map(([id, number, roomTypeId, status]) => {
    const roomType = roomTypes.find((type) => type[0] === roomTypeId);

    return {
      id,
      number,
      roomTypeId,
      status,
      floor: 0,
      roomTypeName: roomType ? roomType[1] : "Room",
      pricePerNight: roomType ? Number(roomType[4]) : 0,
      housekeepingNote: "",
    };
  });
}

  await delay();
  return rooms
    .filter((room) => (!status || room.status === status) && (floor == null || room.floor === floor))
    .map((room) => {
      const type = roomTypes.find((rt) => rt.id === room.roomTypeId);
      return { ...clone(room), roomTypeName: type?.name ?? "—", pricePerNight: type?.pricePerNight ?? 0 };
    });
}

/** Counts by status, for the reception and admin dashboard tiles. */
export async function getRoomStatusSummary() {
  if (!USE_MOCK_API) {
  const data = await request("/rooms");

  const summary = Object.fromEntries(
    Object.values(ROOM_STATUS).map((status) => [status, 0])
  );

  data.rooms.forEach(([, , , status]) => {
    summary[status] = (summary[status] ?? 0) + 1;
  });

  return {
    total: data.rooms.length,
    ...summary,
  };
}

  await delay(350);
  const summary = Object.fromEntries(Object.values(ROOM_STATUS).map((status) => [status, 0]));
  rooms.forEach((room) => {
    summary[room.status] += 1;
  });
  return { total: rooms.length, ...summary };
}

/**
 * Updates a physical room's status (housekeeping and reception workflows).
 * @param {string} roomId
 * @param {string} status  One of ROOM_STATUS
 */
export async function updateRoomStatus(roomId, status) {
if (!USE_MOCK_API) return request(`/rooms/${roomId}`, { method: "PATCH", body: { status } });

  await delay(450);
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error("That room no longer exists.");
  room.status = status;
  return clone(room);
}
export async function getRoomFacilities() {
  if (!USE_MOCK_API) return request("/roomfacilities");
}