/**
 * roomService.js
 * -----------------------------------------------------------------------------
 * Room types (the bookable product) and physical rooms (the inventory).
 *
 * The exported signatures are what components depend on and must not change.
 */

import { request } from "./apiClient";
import { AMENITIES, BED_TYPES, ROOM_STATUS, SELLABLE_STATUSES } from "./constants";

export { AMENITIES, BED_TYPES, ROOM_STATUS, SELLABLE_STATUSES };

/** The database stores no room photography, so images are keyed by type name. */
const ROOM_TYPE_IMAGES = {
  Single: [
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
  ],
  Double: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
  ],
  Deluxe: [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
  ],
  Suite: [
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1400&q=80",
  ],
};

/** The database stores "Available"; the UI compares against ROOM_STATUS values. */
function normaliseRoomStatus(status) {
  return String(status ?? "").toUpperCase().replace(/\s+/g, "_");
}

/** Joins the /roomtypes and /rooms responses into what the room pages render. */
async function fetchRoomTypes() {
  const [typeData, roomData] = await Promise.all([request("/roomtypes"), request("/rooms")]);

  return typeData.room_types.map(([id, type, description, capacity, price]) => {
    const rooms = roomData.rooms.filter(([, , roomTypeId]) => roomTypeId === id);

    return {
      id,
      slug: type.toLowerCase(),
      name: type,
      type,
      shortDescription: description ?? "",
      description: description ?? "",
      pricePerNight: Number(price),
      currency: "LKR",
      capacity: { adults: Number(capacity), children: 0 },
      bedType: "—",
      sizeSqm: 0,
      amenities: [],
      images: ROOM_TYPE_IMAGES[type] ?? ROOM_TYPE_IMAGES.Deluxe,
      totalRooms: rooms.length,
      // Current room state only: the API has no date-based availability check yet.
      availableRooms: rooms.filter(([, , , status]) =>
        SELLABLE_STATUSES.includes(normaliseRoomStatus(status)),
      ).length,
      rating: 0,
      reviewCount: 0,
    };
  });
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
 * @param {string} [query.sort]       price-asc | price-desc | rating | name
 * @returns {Promise<Array>}
 */
export async function getRoomTypes(query = {}) {
  const { search, type, guests, minPrice, maxPrice, amenities, sort } = query;
  const term = search?.trim().toLowerCase();

  const results = (await fetchRoomTypes()).filter((room) => {
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

  const sorters = {
    "price-asc": (a, b) => a.pricePerNight - b.pricePerNight,
    "price-desc": (a, b) => b.pricePerNight - a.pricePerNight,
    rating: (a, b) => b.rating - a.rating,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  if (sorters[sort]) results.sort(sorters[sort]);

  return results;
}

/** How many room types sit in each category, for the filter panel's counts. */
export async function getRoomTypeCounts() {
  const roomTypes = await fetchRoomTypes();

  return roomTypes.reduce((counts, room) => {
    counts[room.type] = (counts[room.type] ?? 0) + 1;
    return counts;
  }, {});
}

/** Room types for the home page. The database has no "featured" flag. */
export async function getFeaturedRoomTypes() {
  return fetchRoomTypes();
}

/**
 * Fetches one room type by its URL slug.
 * @throws {Error} when no room matches
 */
export async function getRoomTypeBySlug(slug) {
  const room = (await fetchRoomTypes()).find((item) => item.slug === slug);
  if (!room) throw new Error("We couldn't find that room. It may no longer be available.");
  return room;
}

/**
 * Checks availability across all room types.
 * @returns {Promise<Array<{roomTypeId, name, available, pricePerNight}>>}
 */
export async function checkAvailability({ guests } = {}) {
  const roomTypes = await fetchRoomTypes();

  return roomTypes
    .filter((room) => !guests || room.capacity.adults >= Number(guests))
    .map((room) => ({
      roomTypeId: room.id,
      slug: room.slug,
      name: room.name,
      pricePerNight: room.pricePerNight,
      available: room.availableRooms,
    }));
}

/* -------------------------------------------------------------------------- */
/* Physical inventory (staff-facing)                                          */
/* -------------------------------------------------------------------------- */

/** Physical rooms, each joined to its room type for display. */
export async function getRooms({ status } = {}) {
  const [data, typeData] = await Promise.all([request("/rooms"), request("/roomtypes")]);

  return data.rooms
    .map(([id, number, roomTypeId, roomStatus]) => {
      const roomType = typeData.room_types.find((type) => type[0] === roomTypeId);

      return {
        id,
        number,
        roomTypeId,
        status: normaliseRoomStatus(roomStatus),
        floor: 0,
        roomTypeName: roomType ? roomType[1] : "Room",
        pricePerNight: roomType ? Number(roomType[4]) : 0,
        housekeepingNote: "",
      };
    })
    .filter((room) => !status || room.status === status);
}

/** Counts by status, for the reception and admin dashboard tiles. */
export async function getRoomStatusSummary() {
  const data = await request("/rooms");
  const summary = Object.fromEntries(Object.values(ROOM_STATUS).map((status) => [status, 0]));

  data.rooms.forEach(([, , , status]) => {
    const key = normaliseRoomStatus(status);
    summary[key] = (summary[key] ?? 0) + 1;
  });

  return { total: data.rooms.length, ...summary };
}

/**
 * Updates a physical room's status (housekeeping and reception workflows).
 * @param {string} roomId
 * @param {string} status  One of ROOM_STATUS
 */
export async function updateRoomStatus(roomId, status) {
  return request(`/rooms/${roomId}`, { method: "PATCH", body: { status } });
}

export async function getRoomFacilities() {
  return request("/roomfacilities");
}
