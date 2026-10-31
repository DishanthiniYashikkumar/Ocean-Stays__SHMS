/**
 * Static hotel content — facilities, experiences, testimonials, gallery and
 * contact details. Reads from a CMS or a settings collection later; for now it
 * is the copy that gives the public site its character.
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

export const facilities = [
  {
    id: "fc-pool",
    status: "OPEN",
    capacity: 60,
    department: "Recreation",
    name: "Infinity Pool",
    icon: "bi-water",
    summary: "A 30-metre horizon pool that reads as an extension of the bay.",
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80",
    hours: "06:00 – 20:00",
  },
  {
    id: "fc-spa",
    status: "OPEN",
    capacity: 12,
    department: "Wellness",
    name: "Coastal Spa",
    icon: "bi-flower1",
    summary: "Ayurvedic and contemporary treatments in six garden pavilions.",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    hours: "09:00 – 21:00",
  },
  {
    id: "fc-dining",
    status: "OPEN",
    capacity: 120,
    department: "Food & Beverage",
    name: "Horizon Restaurant",
    icon: "bi-egg-fried",
    summary: "Seafood landed that morning, served on a terrace above the water.",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    hours: "06:30 – 22:30",
  },
  {
    id: "fc-gym",
    status: "OPEN",
    capacity: 20,
    department: "Recreation",
    name: "Fitness Studio",
    icon: "bi-heart-pulse",
    summary: "Technogym equipment, free weights and daily sunrise yoga.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    hours: "24 hours",
  },
  {
    id: "fc-events",
    status: "MAINTENANCE",
    capacity: 180,
    department: "Events",
    name: "Events & Meetings",
    icon: "bi-people",
    summary: "Three flexible spaces seating up to 180, with a dedicated planner.",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
    hours: "By arrangement",
  },
  {
    id: "fc-concierge",
    status: "OPEN",
    capacity: 0,
    department: "Front Office",
    name: "Concierge Desk",
    icon: "bi-bell",
    summary: "Transfers, excursions and reservations, handled before you ask.",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    hours: "24 hours",
  },
];

export const experiences = [
  {
    id: "ex-whale",
    name: "Whale Watching",
    icon: "bi-water",
    duration: "5 hours",
    price: 14500,
    currency: "LKR",
    summary: "Blue whales and spinner dolphins off the Mirissa shelf, from a small boat.",
    image: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ex-fort",
    name: "Galle Fort at Dusk",
    icon: "bi-building",
    duration: "3 hours",
    price: 6500,
    currency: "LKR",
    summary: "A guided walk through the ramparts, ending at the lighthouse for sunset.",
    image: "https://images.unsplash.com/photo-1509982724584-2ce0d4366d8b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ex-surf",
    name: "Private Surf Lesson",
    icon: "bi-wind",
    duration: "2 hours",
    price: 8900,
    currency: "LKR",
    summary: "One-to-one coaching on a beach break suited to first-timers.",
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ex-cooking",
    name: "Coastal Cooking Class",
    icon: "bi-fire",
    duration: "4 hours",
    price: 7200,
    currency: "LKR",
    summary: "Market visit, then a hands-on lesson in southern Sri Lankan curries.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ex-tea",
    name: "Tea Country Day Trip",
    icon: "bi-cup-hot",
    duration: "Full day",
    price: 22000,
    currency: "LKR",
    summary: "A drive into the hills, a working estate, and a tasting at altitude.",
    image: "https://images.unsplash.com/photo-1748753778598-2e5c4244e90e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "ex-turtle",
    name: "Turtle Hatchery Visit",
    icon: "bi-egg",
    duration: "2 hours",
    price: 4500,
    currency: "LKR",
    summary: "A conservation project we've supported since 2019, seen up close.",
    image: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&w=1200&q=80",
  },
];

export const testimonials = [
  {
    id: "tm-1",
    name: "Elena Whitfield",
    location: "London, United Kingdom",
    rating: 5,
    stayedIn: "Coastal Suite",
    quote:
      "We've stayed along this coast for years and nothing comes close. The staff remembered how my husband takes his tea by the second morning. That's not training — that's care.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "tm-2",
    name: "Rajiv Menon",
    location: "Bengaluru, India",
    rating: 5,
    stayedIn: "Garden Villa",
    quote:
      "The villa was completely private, the plunge pool spotless every morning, and the check-in took under four minutes. Faultless on the details that usually go wrong.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "tm-3",
    name: "Sophie Laurent",
    location: "Lyon, France",
    rating: 4,
    stayedIn: "Ocean Deluxe",
    quote:
      "Waking up to that view is worth the flight on its own. The whale watching trip they arranged was the highlight of our two weeks in Sri Lanka.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "tm-4",
    name: "Daniel Okafor",
    location: "Lagos, Nigeria",
    rating: 5,
    stayedIn: "Sunset Penthouse",
    quote:
      "I booked for three nights and extended to six. The rooftop at sunset, entirely to yourself, is something I haven't found at any hotel at any price.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
];

/**
 * Gallery images.
 *
 * Ordered so that "All" alternates between categories and between portrait and
 * landscape shots — the gallery page lays these out as CSS columns, and mixed
 * orientations are what make that masonry read as designed rather than as a
 * grid with gaps.
 *
 * The home page shows only the first five, where the first tile is the 2×2
 * feature — so keep a strong landscape image at g1.
 */
export const galleryImages = [
  { id: "g1", caption: "The bay at first light", category: "Property", src: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80" },
  { id: "g2", caption: "Ocean Deluxe interior", category: "Rooms", src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80" },
  { id: "g3", caption: "Infinity pool, late afternoon", category: "Facilities", src: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80" },
  { id: "g4", caption: "Horizon Restaurant terrace", category: "Dining", src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80" },
  { id: "g5", caption: "Coastal Suite living room", category: "Rooms", src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80" },

  { id: "g6", caption: "Sunset through the palms", category: "Property", src: "https://images.unsplash.com/photo-1610045058619-8c37e8913c55?auto=format&fit=crop&w=1200&q=80" },
  { id: "g7", caption: "Spa pavilion", category: "Facilities", src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80" },
  { id: "g8", caption: "Ocean Deluxe bathroom", category: "Rooms", src: "https://images.unsplash.com/photo-1519868343531-805e97cbda3e?auto=format&fit=crop&w=1200&q=80" },
  { id: "g9", caption: "The main pool at dusk", category: "Facilities", src: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?auto=format&fit=crop&w=1200&q=80" },
  { id: "g10", caption: "Table set for dinner", category: "Dining", src: "https://images.unsplash.com/photo-1519690889869-e705e59f72e1?auto=format&fit=crop&w=1200&q=80" },

  { id: "g11", caption: "Garden Villa plunge pool", category: "Rooms", src: "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=1200&q=80" },
  { id: "g12", caption: "Pool deck, early morning", category: "Facilities", src: "https://images.unsplash.com/photo-1583522862616-c7c405b9e0ed?auto=format&fit=crop&w=1200&q=80" },
  { id: "g13", caption: "Evening on the beach", category: "Property", src: "https://images.unsplash.com/photo-1552272492-3053fbacbf4b?auto=format&fit=crop&w=1200&q=80" },
  { id: "g14", caption: "Horizon Restaurant, morning service", category: "Dining", src: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&w=1200&q=80" },
  { id: "g15", caption: "Sunset from the west wing", category: "Property", src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },

  { id: "g16", caption: "Loungers by the main pool", category: "Facilities", src: "https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=1200&q=80" },
  { id: "g17", caption: "First light over the water", category: "Property", src: "https://images.unsplash.com/photo-1529348915581-73628f0cf212?auto=format&fit=crop&w=1200&q=80" },
  { id: "g18", caption: "Poolside cabanas", category: "Facilities", src: "https://images.unsplash.com/photo-1604348825621-22800b6ed16d?auto=format&fit=crop&w=1200&q=80" },
];

/** Trust signals for the "Why Choose Ocean Stays" section. */
export const highlights = [
  {
    id: "hl-1",
    icon: "bi-water",
    title: "Every room faces water",
    description: "Ocean, lagoon or harbour — no interior rooms anywhere on the property.",
  },
  {
    id: "hl-2",
    icon: "bi-lightning-charge",
    title: "Four-minute check-in",
    description: "Pre-arrival details are captured online, so arrival is a handshake and a key.",
  },
  {
    id: "hl-3",
    icon: "bi-shield-check",
    title: "Flexible cancellation",
    description: "Free cancellation up to 48 hours before arrival on most rates.",
  },
  {
    id: "hl-4",
    icon: "bi-people",
    title: "One team, all year",
    description: "Ninety percent of our staff have been with us more than three seasons.",
  },
];
