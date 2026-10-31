/**
 * apiClient.js
 * -----------------------------------------------------------------------------
 * Thin fetch wrapper shared by every service. It exists so that token handling,
 * JSON parsing and error shaping are written once rather than in eight files.
 *
 * FRONTEND ONLY. This never validates a token or enforces a permission — it
 * just attaches the bearer header the backend will read. All real
 * authentication and authorization is the NestJS team's responsibility.
 *
 * Backend integration checklist:
 *   1. Set VITE_API_BASE_URL in .env
 *   2. Set VITE_USE_MOCK_API="false"
 *   3. Confirm each service's endpoint paths match the NestJS controllers.
 * No component changes are required.
 */

import { getToken } from "./authService";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

/** Mock mode keeps the UI runnable before any endpoint exists. Defaults to on. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

/** Error type the UI renders directly. `status` supports retry/branching logic. */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function messageForStatus(status, serverMessage) {
  if (serverMessage) return serverMessage;
  if (status === 400) return "Some of the details provided weren't valid. Please review and retry.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to perform that action.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 409) return "That action conflicts with an existing record.";
  if (status === 422) return "Some of the details provided weren't valid. Please review and retry.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "The server is unavailable right now. Please try again shortly.";
  return "Something went wrong. Please try again.";
}

/**
 * Performs a JSON request against the API.
 *
 * @param {string} path      Endpoint path, e.g. "/rooms"
 * @param {object} [options]
 * @param {string} [options.method="GET"]
 * @param {object} [options.body]    Serialised to JSON automatically
 * @param {object} [options.params]  Appended as a query string, nullish dropped
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export async function request(path, { method = "GET", body, params, signal } = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const token = getToken();
  let response;

  try {
    response = await fetch(url.toString(), {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    // An aborted request is a caller decision, not a failure to report.
    if (error?.name === "AbortError") throw error;
    throw new ApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      messageForStatus(response.status, payload.message),
      response.status,
      payload.errors ?? null,
    );
  }

  return payload;
}

/* -------------------------------------------------------------------------- */
/* Mock helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Simulates network latency so loading and skeleton states are actually
 * visible during development rather than flashing past.
 */
export function delay(ms = 550) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns a deep copy so callers can't mutate the shared mock fixtures. */
export function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

/**
 * Applies pagination to an in-memory array, returning the same envelope shape
 * the backend is expected to send for list endpoints.
 */
export function paginate(items, { page = 1, pageSize = 10 } = {}) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: clone(items.slice(start, start + pageSize)),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}
