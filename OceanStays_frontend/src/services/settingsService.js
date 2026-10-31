/**
 * settingsService.js
 * -----------------------------------------------------------------------------
 * System settings.
 *
 * Saving a section here updates the in-memory settings object. Values that the
 * rest of the app reads from other modules — the booking policy in particular —
 * are pushed back to their source so the change is visible immediately rather
 * than only on this screen.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import { settings } from "./mock/settings";
import { BOOKING_POLICY } from "./bookingService";
import { HOTEL } from "./mock/hotel";

/** The sections the settings page renders, in order. */
export const SETTINGS_SECTIONS = ["hotel", "operations", "notifications"];

export async function getSettings() {
  if (!USE_MOCK_API) return request("/admin/settings");

  await delay(400);
  return clone(settings);
}

/**
 * Saves one section.
 *
 * @param {"hotel"|"operations"|"notifications"} section
 * @param {object} values
 */
export async function updateSettings(section, values) {
  if (!USE_MOCK_API) {
    return request(`/admin/settings/${section}`, { method: "PATCH", body: values });
  }

  await delay(800);

  if (!SETTINGS_SECTIONS.includes(section)) {
    throw new Error("We couldn't find that settings section.");
  }

  Object.assign(settings[section], values);

  /*
   * Keep the rest of the app in step. Without this the admin would change the
   * cancellation window here and the guest portal would keep enforcing the old
   * one, which is exactly the sort of quiet inconsistency that makes a settings
   * screen untrustworthy.
   */
  if (section === "operations") {
    BOOKING_POLICY.freeCancellationHours = Number(values.freeCancellationHours);
    BOOKING_POLICY.modificationCutoffHours = Number(values.modificationCutoffHours);
    BOOKING_POLICY.taxRate = Number(values.taxRatePercent) / 100;
    BOOKING_POLICY.serviceChargeRate = Number(values.serviceChargePercent) / 100;
    HOTEL.checkInTime = values.checkInTime;
    HOTEL.checkOutTime = values.checkOutTime;
  }

  if (section === "hotel") {
    HOTEL.name = values.name;
    HOTEL.tagline = values.tagline;
    HOTEL.email = values.email;
    HOTEL.phone = values.phone;
    HOTEL.address.line1 = values.addressLine1;
    HOTEL.address.line2 = values.addressLine2;
    HOTEL.address.country = values.country;
  }

  return clone(settings[section]);
}
