/**
 * settingsService.js
 * -----------------------------------------------------------------------------
 * System settings.
 */

import { request } from "./apiClient";
import { refreshHotelInfo } from "./hotelInfo";

/** The sections the settings page renders, in order. */
export const SETTINGS_SECTIONS = ["hotel", "operations", "notifications"];

export async function getSettings() {
  return request("/admin/settings");
}

/**
 * Saves one section.
 *
 * @param {"hotel"|"operations"|"notifications"} section
 * @param {object} values
 */
export async function updateSettings(section, values) {
  const saved = await request(`/admin/settings/${section}`, { method: "PATCH", body: values });
  // Hotel details and booking policy appear on the public site; refresh them.
  if (section === "hotel" || section === "operations") refreshHotelInfo();
  return saved;
}
