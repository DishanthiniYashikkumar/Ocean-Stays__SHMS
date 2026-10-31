/**
 * Mock feedback fixtures. Mirrors the Feedback entity.
 *
 * Guests submit here; the admin dashboard reads it back in Phase 10.
 */

export const FEEDBACK_CATEGORY = {
  OVERALL: "OVERALL",
  ROOM: "ROOM",
  DINING: "DINING",
  SERVICE: "SERVICE",
  FACILITIES: "FACILITIES",
  HOUSEKEEPING: "HOUSEKEEPING",
};

export const FEEDBACK_CATEGORY_LABELS = {
  [FEEDBACK_CATEGORY.OVERALL]: "Overall stay",
  [FEEDBACK_CATEGORY.ROOM]: "The room",
  [FEEDBACK_CATEGORY.DINING]: "Dining",
  [FEEDBACK_CATEGORY.SERVICE]: "Service & staff",
  [FEEDBACK_CATEGORY.FACILITIES]: "Facilities",
  [FEEDBACK_CATEGORY.HOUSEKEEPING]: "Housekeeping",
};

export const feedback = [
  {
    id: "fb-4001",
    guestId: "usr-guest-01",
    guestName: "Amara Perera",
    bookingId: "bk-09982",
    bookingReference: "OS-09982",
    category: FEEDBACK_CATEGORY.OVERALL,
    rating: 5,
    comment:
      "The lagoon-side rooms are far quieter than we expected. Staff remembered our coffee order by the second morning.",
    createdAt: "2025-06-02T09:20:00.000Z",
  },
];
