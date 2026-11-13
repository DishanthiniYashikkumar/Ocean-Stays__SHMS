/**
 * roomService.js
 * -----------------------------------------------------------------------------
 * Room types (the bookable product) and physical rooms (the inventory).
 *
 * "Room type" in the UI is a database room_category (e.g. "Deluxe Ocean"),
 * and `type` is its family from room_type (Standard, Deluxe, Suite, Villa,
 * Penthouse). The exported signatures are what components depend on.
 */

import { request } from "./apiClient";
import { AMENITIES, BED_TYPES, ROOM_STATUS, SELLABLE_STATUSES } from "./constants";

export { AMENITIES, BED_TYPES, ROOM_STATUS, SELLABLE_STATUSES };

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

/** The database stores no room photography, so images are keyed by room family. */
const ROOM_TYPE_IMAGES = {
  Standard: [
    img("photo-1611892440504-42a792e24d32"),
    img("photo-1560448204-e02f11c3d0e2"),
    img("photo-1522708323590-d24dbb6b0267"),
    img("photo-1505693416388-ac5ce068fe85"),
  ],
  Deluxe: [
    img("photo-1590490360182-c33d57733427"),
    img("photo-1618773928121-c32242e63f39"),
    img("photo-1631049307264-da0ec9d70304"),
  ],
  Suite: [
    img("photo-1582719478250-c89cae4dc85b"),
    img("photo-1566665797739-1674de7a421a"),
    img("photo-1595576508898-0ad5c879a061"),
  ],
  Villa: [
    img("photo-1604709177225-055f99402ea3"),
    img("photo-1571003123894-1f0594d2b5d9"),
    img("photo-1582719508461-905c673771fd"),
  ],
  Penthouse: [
    img("photo-1566665797739-1674de7a421a"),
    img("photo-1507525428034-b723cf961d3e"),
    img("photo-1582719478250-c89cae4dc85b"),
  ],
};

/** amenity.amenity_id -> AMENITIES key */
const AMENITY_KEYS = {
  1: "oceanView",
  2: "balcony",
  3: "pool",
  4: "bathtub",
  5: "butler",
  6: "desk",
  7: "wifi",
  8: "ac",
  9: "tv",
  10: "minibar",
  11: "coffee",
  12: "safe",
};

/** Statuses already arrive as ROOM_STATUS values; this tolerates older spellings. */
function normaliseRoomStatus(status) {
  const value = String(status ?? "").toUpperCase().replace(/\s+/g, "_");
  return value === "MAINTAINING" ? ROOM_STATUS.MAINTENANCE : value;
}

export function slugify(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Rotates a family's photos so neighbouring cards don't share a cover image. */
function imagesFor(family, id) {
  const set = ROOM_TYPE_IMAGES[family] ?? ROOM_TYPE_IMAGES.Deluxe;
  const start = id % set.length;
  return [...set.slice(start), ...set.slice(0, start)];
}

async function fetchAvailability({ checkIn, checkOut, guests } = {}) {
  if (!checkIn || !checkOut) return null;
  try {
    const data = await request("/rooms/availability", { params: { checkIn, checkOut, guests } });
    return new Map(data.items.map((item) => [item.roomTypeId, item.available]));
  } catch {
    return null; // fall back to today's room status
  }
}

async function fetchRoomTypes(dates) {
  const [typeData, roomData, availability] = await Promise.all([
    request("/roomtypes"),
    request("/rooms"),
    fetchAvailability(dates),
  ]);

  return typeData.room_types.map(
    ([id, name, description, capacity, price, bedType, roomSize, averageRating, reviewCount, amenities, family]) => {
      const rooms = roomData.rooms.filter(([, , roomTypeId]) => roomTypeId === id);
      const sellableNow = rooms.filter(([, , , status]) =>
        SELLABLE_STATUSES.includes(normaliseRoomStatus(status)),
      ).length;
      const type = family ?? name;

      return {
        id,
        slug: slugify(name),
        name,
        type,
        shortDescription: description ?? "",
        description: description ?? "",
        pricePerNight: Number(price),
        currency: "LKR",
        capacity: { adults: Number(capacity), children: 0 },
        bedType: bedType ?? "—",
        sizeSqm: Number(roomSize) || 0,
        amenities: (amenities ?? []).map((amenity) => AMENITY_KEYS[amenity.id]).filter(Boolean),
        images: imagesFor(type, id),
        totalRooms: rooms.length,
        availableRooms: availability?.get(id) ?? sellableNow,
        rating: Number(averageRating) || 0,
        reviewCount: Number(reviewCount) || 0,
      };
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Room types for the public Rooms page. With checkIn/checkOut, the
 * availability counts are for those dates.
 */
export async function getRoomTypes(query = {}) {
  const { search, type, guests, minPrice, maxPrice, amenities, sort, checkIn, checkOut } = query;
  const term = search?.trim().toLowerCase();

  const results = (await fetchRoomTypes({ checkIn, checkOut, guests })).filter((room) => {
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

/** Number of room types in each family, for the filter sidebar. */
export async function getRoomTypeCounts() {
  const roomTypes = await fetchRoomTypes();

  return roomTypes.reduce((counts, room) => {
    counts[room.type] = (counts[room.type] ?? 0) + 1;
    return counts;
  }, {});
}

/** One room type per family, best rated first, for the home page. */
export async function getFeaturedRoomTypes() {
  const all = await fetchRoomTypes();
  const best = new Map();
  all.forEach((room) => {
    const current = best.get(room.type);
    if (!current || room.rating > current.rating) best.set(room.type, room);
  });
  const featured = [...best.values()];
  return featured.length >= 3 ? featured : all;
}

export async function getRoomTypeBySlug(slug, dates) {
  const wanted = slugify(decodeURIComponent(String(slug ?? "")));
  const room = (await fetchRoomTypes(dates)).find((item) => item.slug === wanted);
  if (!room) throw new Error("We couldn't find that room. It may no longer be available.");
  return room;
}

export async function checkAvailability({ checkIn, checkOut, guests } = {}) {
  const roomTypes = await fetchRoomTypes({ checkIn, checkOut, guests });

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

export async function getRooms({ status } = {}) {
  const [data, typeData] = await Promise.all([request("/rooms"), request("/roomtypes")]);
  const types = new Map(typeData.room_types.map((type) => [type[0], type]));

  return data.rooms
    .map(([id, number, roomTypeId, roomStatus, floor, notes]) => {
      const roomType = types.get(roomTypeId);

      return {
        id,
        number: String(number),
        roomTypeId,
        status: normaliseRoomStatus(roomStatus),
        floor: Number.isFinite(Number(floor)) ? Number(floor) : 0,
        roomTypeName: roomType ? roomType[1] : "Room",
        roomFamily: roomType ? roomType[10] : null,
        pricePerNight: roomType ? Number(roomType[4]) : 0,
        housekeepingNote: notes ?? "",
      };
    })
    .filter((room) => !status || room.status === status);
}

export async function getRoomStatusSummary() {
  const data = await request("/rooms");
  const summary = Object.fromEntries(Object.values(ROOM_STATUS).map((status) => [status, 0]));

  data.rooms.forEach(([, , , status]) => {
    const key = normaliseRoomStatus(status);
    summary[key] = (summary[key] ?? 0) + 1;
  });

  return { total: data.rooms.length, ...summary };
}

export async function updateRoomStatus(roomId, status) {
  return request(`/rooms/${roomId}`, { method: "PATCH", body: { status } });
}

export async function getRoomFacilities() {
  return request("/roomfacilities");
}
