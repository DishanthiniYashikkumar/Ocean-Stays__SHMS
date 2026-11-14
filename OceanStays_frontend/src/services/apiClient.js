/**
 * apiClient.js
 * -----------------------------------------------------------------------------
 * Thin fetch wrapper shared by every service. It exists so that token handling,
 * JSON parsing and error shaping are written once rather than in eight files.
 *
 * FRONTEND ONLY. This never validates a token or enforces a permission — it
 * just attaches the bearer header the backend will read. All real
 * authentication and authorization is the backend's responsibility.
 *
 * Set VITE_API_BASE_URL in .env when the API isn't on the local Flask default.
 */

import { clearSession, getToken } from "./authService";

/** Fired on window when the API rejects the stored token; AuthProvider signs out. */
export const SESSION_EXPIRED_EVENT = "shms:session-expired";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/** Error type the UI renders directly. `status` supports retry/branching logic. */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function messageForStatus(status, serverMessage, hadToken) {
  if (serverMessage) return serverMessage;
  if (status === 400) return "Some of the details provided weren't valid. Please review and retry.";
  if (status === 401) {
    return hadToken ? "Your session has expired. Please sign in again." : "Please sign in to continue.";
  }
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
  // Reads are safe to repeat, so ride out a backend that is restarting or a
  // brief network drop before showing an error. Writes are never retried.
  const retryDelays = method === "GET" ? [800, 2000] : [];

  for (let attempt = 0; ; attempt += 1) {
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
      break;
    } catch (error) {
      // An aborted request is a caller decision, not a failure to report.
      if (error?.name === "AbortError") throw error;
      if (attempt >= retryDelays.length || signal?.aborted) {
        throw new ApiError("Unable to reach the server. Check your connection and try again.", 0);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
    }
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    throw new ApiError(
      messageForStatus(response.status, payload.message, Boolean(token)),
      response.status,
      payload.errors ?? null,
    );
  }

  return payload;
}

/**
 * Applies pagination to an in-memory array. The API's list routes return every
 * row, so the services page them to the envelope the screens expect.
 */
export function paginate(items, { page = 1, pageSize = 10 } = {}) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}
