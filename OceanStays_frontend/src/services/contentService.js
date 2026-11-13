/**
 * contentService.js
 * -----------------------------------------------------------------------------
 * Static marketing content for the public site — facilities, experiences,
 * testimonials, gallery and hotel details.
 *
 * Likely to be served from a CMS or a settings collection rather than a core
 * entity, so it is kept apart from the operational services.
 */

import { request } from "./apiClient";
import { HOTEL, POLICY, refreshHotelInfo } from "./hotelInfo";

export { HOTEL, POLICY, refreshHotelInfo };

/** Gallery filter categories, with "All" first. */
const GALLERY_CATEGORIES = ["All", "Property", "Rooms", "Facilities", "Dining"];


export async function getFacilities() {
  const data = await request("/facilities");

  return data.facilities.map((facility) => ({
    id: facility.facility_id,
    name: facility.facility_name,
    description: facility.description,
    summary: facility.description,
    icon: facility.icon || "bi-building",
    image: facility.image ?? "",
    hours: facility.hours,
    department: facility.department,
    capacity: facility.capacity ?? "",
    status:
      facility.availability_status === "Open"
        ? FACILITY_STATUS.OPEN
        : facility.availability_status === "Maintenance"
          ? FACILITY_STATUS.MAINTENANCE
          : FACILITY_STATUS.CLOSED,
  }));
}


/** Facility states the admin module manages. */
export const FACILITY_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  MAINTENANCE: "MAINTENANCE",
};

/**
 * Updates a facility.
 *
 * Closing one hides it from the public site as well as the admin list, which is
 * the point: a spa under maintenance should stop being advertised the moment
 * it closes, not when somebody remembers to edit the marketing copy.
 */
export async function updateFacility(facilityId, changes) {
  return request(`/content/facilities/${facilityId}`, { method: "PATCH", body: changes });
}

/** Adds a facility. */
export async function createFacility(payload) {
  return request("/content/facilities", { method: "POST", body: payload });
}

export async function getExperiences() {
  return request("/content/experiences");
}

export async function getTestimonials() {
  return request("/content/testimonials");
}

/** Gallery images, optionally narrowed to one category. */
export async function getGallery(category) {
  return request("/content/gallery", { params: { category } });
}

/** Gallery categories for the filter row. */
export function getGalleryCategories() {
  return GALLERY_CATEGORIES;
}

export async function getHighlights() {
  return request("/content/highlights");
}

/**
 * Submits the contact form.
 * @param {{name, email, subject, message}} payload
 */
export async function submitContactMessage(payload) {
  return request("/content/contact", { method: "POST", body: payload });
}
