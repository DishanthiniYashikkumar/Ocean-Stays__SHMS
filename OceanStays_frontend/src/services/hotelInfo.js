/**
 * hotelInfo.js
 * -----------------------------------------------------------------------------
 * Hotel details and booking policy shown across the public site.
 *
 * The values below are defaults. On startup they're replaced with what the
 * admin saved under Settings (GET /content/hotel). The last copy is kept in
 * localStorage so the next visit renders the saved details straight away,
 * with no flash of the defaults.
 *
 * HOTEL and POLICY are updated in place, so modules that imported them keep
 * seeing current values.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";
const CACHE_KEY = "shms.hotel";

export const HOTEL = {
  name: "Ocean Stays",
  tagline: "Where the Ocean Meets Exceptional Hospitality.",
  intro:
    "Experience effortless stays, thoughtful service, and smart hospitality at Ocean Stays.",
  address: {
    line1: "Galle Road, Wellawatte Bay",
    line2: "Galle 80000",
    country: "Sri Lanka",
  },
  phone: "+94 91 224 5500",
  email: "reservations@oceanstays.com",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  mapQuery: "Galle, Sri Lanka",
  social: [
    { id: "instagram", label: "Instagram", icon: "bi-instagram", href: "#" },
    { id: "facebook", label: "Facebook", icon: "bi-facebook", href: "#" },
    { id: "x", label: "X", icon: "bi-twitter-x", href: "#" },
    { id: "tripadvisor", label: "Tripadvisor", icon: "bi-compass", href: "#" },
  ],
};

/** Booking rules; the backend applies the same numbers when it prices a stay. */
export const POLICY = {
  freeCancellationHours: 48,
  modificationCutoffHours: 24,
  taxRate: 0.12,
  serviceChargeRate: 0.1,
  checkInTime: "14:00",
  checkOutTime: "11:00",
};

function apply({ hotel, policy } = {}) {
  if (hotel) {
    if (hotel.name) HOTEL.name = hotel.name;
    if (hotel.tagline) HOTEL.tagline = hotel.tagline;
    if (hotel.phone) HOTEL.phone = hotel.phone;
    if (hotel.email) HOTEL.email = hotel.email;
    HOTEL.address = {
      line1: hotel.addressLine1 || HOTEL.address.line1,
      line2: hotel.addressLine2 ?? HOTEL.address.line2,
      country: hotel.country || HOTEL.address.country,
    };
  }
  if (policy) {
    ["freeCancellationHours", "modificationCutoffHours", "taxRate", "serviceChargeRate"].forEach((key) => {
      if (typeof policy[key] === "number") POLICY[key] = policy[key];
    });
    if (policy.checkInTime) POLICY.checkInTime = HOTEL.checkInTime = policy.checkInTime;
    if (policy.checkOutTime) POLICY.checkOutTime = HOTEL.checkOutTime = policy.checkOutTime;
  }
}

try {
  const cached = window.localStorage.getItem(CACHE_KEY);
  if (cached) apply(JSON.parse(cached));
} catch {
  // Storage can be unavailable (private mode); the defaults stand.
}

/** Fetches the saved hotel details; call again after the admin edits them. */
export async function refreshHotelInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/content/hotel`, { headers: { Accept: "application/json" } });
    if (!response.ok) return HOTEL;
    const data = await response.json();
    apply(data);
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  } catch {
    // Offline or API down: keep whatever we have.
  }
  return HOTEL;
}

refreshHotelInfo();
