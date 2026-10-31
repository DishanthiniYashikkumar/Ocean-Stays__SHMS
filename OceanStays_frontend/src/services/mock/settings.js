/**
 * Mock system settings. Mirrors a settings collection rather than an entity.
 *
 * Scope is deliberately limited to things the rest of this frontend actually
 * reads — hotel details, the booking policy and notification preferences.
 * Inventing security or integration settings the app cannot honour would put
 * switches on screen that do nothing.
 */

import { HOTEL } from "./hotel";
import { BOOKING_POLICY } from "../bookingService";

export const settings = {
  hotel: {
    name: HOTEL.name,
    tagline: HOTEL.tagline,
    email: HOTEL.email,
    phone: HOTEL.phone,
    addressLine1: HOTEL.address.line1,
    addressLine2: HOTEL.address.line2,
    country: HOTEL.address.country,
  },

  operations: {
    checkInTime: HOTEL.checkInTime,
    checkOutTime: HOTEL.checkOutTime,
    freeCancellationHours: BOOKING_POLICY.freeCancellationHours,
    modificationCutoffHours: BOOKING_POLICY.modificationCutoffHours,
    taxRatePercent: Math.round(BOOKING_POLICY.taxRate * 100),
    serviceChargePercent: Math.round(BOOKING_POLICY.serviceChargeRate * 100),
    currency: "LKR",
  },

  notifications: {
    bookingConfirmation: true,
    checkInReminder: true,
    checkOutReminder: true,
    paymentReceipts: true,
    serviceUpdates: true,
    marketingEmails: false,
  },
};
