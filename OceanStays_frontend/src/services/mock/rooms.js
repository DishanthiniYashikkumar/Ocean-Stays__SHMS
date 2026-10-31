/**
 * Mock room + room-type fixtures.
 *
 * Field names mirror the entities the backend team will model (Room,
 * RoomType), so swapping the mock for a real endpoint is a straight
 * substitution rather than a reshape.
 */

/**
 * Room states.
 *
 * The housekeeping turnaround is a chain, not a flag:
 *
 *   OCCUPIED -> (check-out) -> DIRTY -> CLEANING -> CLEAN -> INSPECTED -> sellable
 *
 * A room is only sellable once it has been inspected, which is why CLEAN and
 * INSPECTED are separate: "the cleaner says it's done" and "a supervisor has
 * confirmed it" are different claims, and only the second one should put a
 * room back in front of a guest.
 */
export const ROOM_STATUS = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  DIRTY: "DIRTY",
  CLEANING: "CLEANING",
  CLEAN: "CLEAN",
  INSPECTED: "INSPECTED",
  READY: "READY",
  MAINTENANCE: "MAINTENANCE",
};

/** States in which a room may be sold or allocated to an arriving guest. */
export const SELLABLE_STATUSES = [
  ROOM_STATUS.AVAILABLE,
  ROOM_STATUS.READY,
  ROOM_STATUS.INSPECTED,
  ROOM_STATUS.RESERVED,
];

export const BED_TYPES = {
  KING: "King",
  QUEEN: "Queen",
  TWIN: "Twin",
  SOFA: "Sofa bed",
};

/** Amenity catalogue — icon is a Bootstrap Icons class. */
export const AMENITIES = {
  wifi: { id: "wifi", label: "High-speed Wi-Fi", icon: "bi-wifi" },
  ac: { id: "ac", label: "Air conditioning", icon: "bi-snow" },
  tv: { id: "tv", label: "Smart TV", icon: "bi-tv" },
  minibar: { id: "minibar", label: "Minibar", icon: "bi-cup-straw" },
  safe: { id: "safe", label: "In-room safe", icon: "bi-safe" },
  balcony: { id: "balcony", label: "Private balcony", icon: "bi-door-open" },
  oceanView: { id: "oceanView", label: "Ocean view", icon: "bi-water" },
  bathtub: { id: "bathtub", label: "Soaking tub", icon: "bi-droplet" },
  coffee: { id: "coffee", label: "Coffee machine", icon: "bi-cup-hot" },
  desk: { id: "desk", label: "Work desk", icon: "bi-laptop" },
  pool: { id: "pool", label: "Private plunge pool", icon: "bi-water" },
  butler: { id: "butler", label: "Butler service", icon: "bi-bell" },
};

/**
 * Room types are the bookable product; individual rooms are the physical
 * inventory allocated at check-in.
 */
export const roomTypes = [
  {
    id: "rt-ocean-deluxe",
    slug: "ocean-deluxe",
    name: "Ocean Deluxe",
    type: "Deluxe",
    shortDescription: "Floor-to-ceiling glass opening onto the Indian Ocean.",
    description:
      "A serene retreat where the horizon is the only thing between you and the water. The Ocean Deluxe pairs a hand-finished teak interior with a private balcony positioned for sunrise, and a bathroom finished in honed local stone.",
    pricePerNight: 18500,
    currency: "LKR",
    capacity: { adults: 2, children: 1 },
    bedType: BED_TYPES.KING,
    sizeSqm: 42,
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "balcony", "oceanView", "coffee"],
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 14,
    availableRooms: 6,
    rating: 4.8,
    reviewCount: 214,
    featured: true,
  },
  {
    id: "rt-coastal-suite",
    slug: "coastal-suite",
    name: "Coastal Suite",
    type: "Suite",
    shortDescription: "A separate living room and a terrace built for long evenings.",
    description:
      "Our most requested suite. A full living room opens onto a wraparound terrace with daybeds, while the bedroom sits back from the water for quiet. Ideal for couples staying a week or more.",
    pricePerNight: 32000,
    currency: "LKR",
    capacity: { adults: 3, children: 2 },
    bedType: BED_TYPES.KING,
    sizeSqm: 68,
    amenities: [
      "wifi", "ac", "tv", "minibar", "safe", "balcony",
      "oceanView", "bathtub", "coffee", "desk",
    ],
    images: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 8,
    availableRooms: 3,
    rating: 4.9,
    reviewCount: 168,
    featured: true,
  },
  {
    id: "rt-garden-villa",
    slug: "garden-villa",
    name: "Garden Villa",
    type: "Villa",
    shortDescription: "A private plunge pool screened by frangipani and palm.",
    description:
      "Standalone villas set back in the gardens, each with a walled courtyard and plunge pool. The quietest accommodation on the property and the only category with direct butler service.",
    pricePerNight: 46000,
    currency: "LKR",
    capacity: { adults: 4, children: 2 },
    bedType: BED_TYPES.KING,
    sizeSqm: 95,
    amenities: [
      "wifi", "ac", "tv", "minibar", "safe", "balcony",
      "bathtub", "coffee", "desk", "pool", "butler",
    ],
    images: [
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 6,
    availableRooms: 2,
    rating: 5.0,
    reviewCount: 97,
    featured: true,
  },
  {
    id: "rt-harbour-twin",
    slug: "harbour-twin",
    name: "Harbour Twin",
    type: "Standard",
    shortDescription: "Two full beds and a harbour outlook — built for sharing.",
    description:
      "A generous twin room overlooking the fishing harbour, where the boats come in at first light. Popular with friends travelling together and with families using the connecting door to an adjacent Deluxe.",
    pricePerNight: 12500,
    currency: "LKR",
    capacity: { adults: 2, children: 2 },
    bedType: BED_TYPES.TWIN,
    sizeSqm: 34,
    amenities: ["wifi", "ac", "tv", "safe", "desk", "coffee"],
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 18,
    availableRooms: 11,
    rating: 4.5,
    reviewCount: 302,
    featured: false,
  },
  {
    id: "rt-sunset-penthouse",
    slug: "sunset-penthouse",
    name: "Sunset Penthouse",
    type: "Penthouse",
    shortDescription: "The top floor, the whole horizon, and a private rooftop.",
    description:
      "A single residence occupying the top floor of the west wing. Two-level living with a rooftop terrace, outdoor rain shower and an uninterrupted west-facing view. Includes airport transfer and daily breakfast served in-suite.",
    pricePerNight: 78000,
    currency: "LKR",
    capacity: { adults: 4, children: 2 },
    bedType: BED_TYPES.KING,
    sizeSqm: 140,
    amenities: [
      "wifi", "ac", "tv", "minibar", "safe", "balcony",
      "oceanView", "bathtub", "coffee", "desk", "pool", "butler",
    ],
    images: [
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 2,
    availableRooms: 0,
    rating: 5.0,
    reviewCount: 41,
    featured: true,
  },
  {
    id: "rt-lagoon-double",
    slug: "lagoon-double",
    name: "Lagoon Double",
    type: "Standard",
    shortDescription: "Quiet, garden-facing, and our best value on the property.",
    description:
      "Set on the lagoon side of the resort, these rooms trade the ocean view for calm and shade. A favourite with guests staying longer and with our returning business travellers.",
    pricePerNight: 9800,
    currency: "LKR",
    capacity: { adults: 2, children: 1 },
    bedType: BED_TYPES.QUEEN,
    sizeSqm: 28,
    amenities: ["wifi", "ac", "tv", "safe", "desk"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    ],
    totalRooms: 22,
    availableRooms: 14,
    rating: 4.4,
    reviewCount: 388,
    featured: false,
  },
];

/** Physical room inventory — what reception allocates and housekeeping services. */
export const rooms = [
  { id: "rm-201", number: "201", floor: 2, roomTypeId: "rt-ocean-deluxe", status: ROOM_STATUS.OCCUPIED, housekeepingNote: "" },
  { id: "rm-202", number: "202", floor: 2, roomTypeId: "rt-ocean-deluxe", status: ROOM_STATUS.CLEAN, housekeepingNote: "" },
  { id: "rm-203", number: "203", floor: 2, roomTypeId: "rt-ocean-deluxe", status: ROOM_STATUS.CLEANING, housekeepingNote: "Late checkout, deep clean requested" },
  { id: "rm-204", number: "204", floor: 2, roomTypeId: "rt-harbour-twin", status: ROOM_STATUS.AVAILABLE, housekeepingNote: "" },
  { id: "rm-205", number: "205", floor: 2, roomTypeId: "rt-harbour-twin", status: ROOM_STATUS.MAINTENANCE, housekeepingNote: "Air conditioning unit replacement" },
  { id: "rm-301", number: "301", floor: 3, roomTypeId: "rt-coastal-suite", status: ROOM_STATUS.OCCUPIED, housekeepingNote: "" },
  { id: "rm-302", number: "302", floor: 3, roomTypeId: "rt-coastal-suite", status: ROOM_STATUS.RESERVED, housekeepingNote: "" },
  { id: "rm-303", number: "303", floor: 3, roomTypeId: "rt-lagoon-double", status: ROOM_STATUS.READY, housekeepingNote: "" },
  { id: "rm-304", number: "304", floor: 3, roomTypeId: "rt-lagoon-double", status: ROOM_STATUS.DIRTY, housekeepingNote: "" },
  { id: "rm-401", number: "401", floor: 4, roomTypeId: "rt-sunset-penthouse", status: ROOM_STATUS.OCCUPIED, housekeepingNote: "" },
  { id: "vl-01", number: "V1", floor: 0, roomTypeId: "rt-garden-villa", status: ROOM_STATUS.OCCUPIED, housekeepingNote: "" },
  { id: "vl-02", number: "V2", floor: 0, roomTypeId: "rt-garden-villa", status: ROOM_STATUS.CLEAN, housekeepingNote: "Awaiting inspection before 15:00 arrival" },
];
