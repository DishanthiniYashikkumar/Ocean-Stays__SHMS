/**
 * contentService.js
 * -----------------------------------------------------------------------------
 * Static marketing content for the public site — facilities, experiences,
 * testimonials, gallery and hotel details.
 *
 * Likely to be served from a CMS or a settings collection rather than a core
 * entity, so it is kept apart from the operational services.
 */

import { USE_MOCK_API, clone, delay, request } from "./apiClient";
import {
  HOTEL,
  experiences,
  facilities,
  galleryImages,
  highlights,
  testimonials,
} from "./mock/hotel";
export { HOTEL };

export async function getFacilities() {
  if (!USE_MOCK_API) {
    const data = await request("/facilities");

    return data.facilities.map(([id, name, description, status]) => ({
      id,
      name,
      description,
      status,
    }));
  }

  await delay(400);

  return clone(facilities);
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
  if (!USE_MOCK_API) {
    return request(`/content/facilities/${facilityId}`, { method: "PATCH", body: changes });
  }

  await delay(700);
  const facility = facilities.find((item) => item.id === facilityId);
  if (!facility) throw new Error("We couldn't find that facility.");

  Object.assign(facility, changes);
  return clone(facility);
}

/** Adds a facility. */
export async function createFacility(payload) {
  if (!USE_MOCK_API) return request("/content/facilities", { method: "POST", body: payload });

  await delay(800);

  if (!payload.name?.trim()) throw new Error("A facility needs a name.");

  const created = {
    id: `fc-${payload.name.trim().toLowerCase().replace(/\W+/g, "-").slice(0, 20)}`,
    name: payload.name.trim(),
    icon: payload.icon || "bi-building",
    summary: payload.summary ?? "",
    image: payload.image ?? "",
    hours: payload.hours ?? "",
    status: payload.status ?? FACILITY_STATUS.OPEN,
    capacity: Number(payload.capacity) || 0,
    department: payload.department ?? "",
  };

  facilities.push(created);
  return clone(created);
}

export async function getExperiences() {
  if (!USE_MOCK_API) return request("/content/experiences");

  await delay(400);
  return clone(experiences);
}

export async function getTestimonials() {
  if (!USE_MOCK_API) return request("/content/testimonials");

  await delay(400);
  return clone(testimonials);
}

/** Gallery images, optionally narrowed to one category. */
export async function getGallery(category) {
  if (!USE_MOCK_API) return request("/content/gallery", { params: { category } });

  await delay(400);
  return clone(
    category && category !== "All"
      ? galleryImages.filter((image) => image.category === category)
      : galleryImages,
  );
}

/** Distinct gallery categories, with "All" first, for the filter row. */
export function getGalleryCategories() {
  return ["All", ...new Set(galleryImages.map((image) => image.category))];
}

export async function getHighlights() {
  if (!USE_MOCK_API) return request("/content/highlights");

  await delay(300);
  return clone(highlights);
}

/**
 * Submits the contact form.
 * @param {{name, email, subject, message}} payload
 */
export async function submitContactMessage(payload) {
  if (!USE_MOCK_API) return request("/content/contact", { method: "POST", body: payload });

  await delay(900);
  return { received: true, reference: `MSG-${Date.now().toString().slice(-6)}` };
}
