/**
 * hotelInfo.js
 * -----------------------------------------------------------------------------
 * Contact details and copy for the public site. The database has no table for
 * these, and the footer needs them synchronously on every page.
 */

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
