/**
 * authService.js
 * -----------------------------------------------------------------------------
 * All authentication logic lives here. UI components never talk to the network
 * and never decide where a user lands after login -- they call these functions
 * and follow the role the backend returns.
 *
 * Set VITE_API_BASE_URL in .env when the API isn't on the local Flask default.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

const TOKEN_KEY = "shms.auth.token";
const USER_KEY = "shms.auth.user";

/* -------------------------------------------------------------------------- */
/* Roles + RBAC routing                                                       */
/* -------------------------------------------------------------------------- */
/*
 * Defined in roles.js and re-exported here, so that everything importing them
 * from this module keeps working.
 */

export { ROLES, ROLE_ROUTES, ROLE_LABELS, getDashboardRoute } from "./roles";

import { normaliseRole } from "./roles";

/* -------------------------------------------------------------------------- */
/* Session storage                                                            */
/* -------------------------------------------------------------------------- */
/*
 * Passwords are NEVER persisted anywhere -- they live in React state for the
 * duration of the submit and are dropped.
 *
 * "Remember me" only controls token durability:
 *   on  -> localStorage (survives a browser restart)
 *   off -> sessionStorage (cleared when the tab closes)
 *
 * Production note: the most XSS-resistant option is for the backend to issue an
 * httpOnly, Secure, SameSite cookie. If you switch to that, delete the two
 * storage helpers below and add `credentials: "include"` to the fetch call.
 */

function storageFor(remember) {
  return remember ? window.localStorage : window.sessionStorage;
}

export function saveSession({ token, user }, remember = false) {
  const store = storageFor(remember);
  const other = storageFor(!remember);
  try {
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Private-browsing modes can throw on write; the session just won't persist.
  }
}

export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  try {
    const raw = window.sessionStorage.getItem(USER_KEY) ?? window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function logout() {
  try {
    [window.sessionStorage, window.localStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

/** Error type the UI can render directly. `status` is handy for retry logic. */
export class AuthError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function messageForStatus(status, serverMessage) {
  if (serverMessage) return serverMessage;
  if (status === 401 || status === 403) return "Incorrect email or password. Please try again.";
  if (status === 423) return "This account is locked. Contact your administrator.";
  if (status === 429) return "Too many sign-in attempts. Please wait a moment and retry.";
  if (status >= 500) return "The server is unavailable right now. Please try again shortly.";
  return "We couldn't sign you in. Please try again.";
}

/**
 * Authenticates a user.
 * @param {{ email: string, password: string, remember?: boolean }} credentials
 * @returns {Promise<{ token: string, user: { id, name, email, role } }>}
 * @throws {AuthError}
 */
export async function login({ email, password, remember = false }) {
  const session = await requestLogin({ email, password });

  saveSession(session, remember);
  return session;
}

async function requestLogin({ email, password }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: email.trim(),
        password,
      }),
    });
  } catch {
    throw new AuthError("Unable to reach the server. Check your connection and try again.", 0);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AuthError(
      messageForStatus(response.status, payload.message),
      response.status,
    );
  }

  return {
    token: `backend-${payload.user_id}`,
    user: {
      id: payload.user_id,
      name: payload.username,
      email: payload.username,
      role: normaliseRole(payload.role),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Registration                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates a guest account and signs the new user in.
 *
 * Only guests can self-register. Staff accounts are created by an
 * administrator, so `role` is never accepted from the client — the backend
 * must assign GUEST regardless of what is posted.
 *
 * @param {{ firstName, lastName, email, phone, password }} details
 * @returns {Promise<{ token: string, user: object }>}
 * @throws {AuthError}
 */
export async function register(details) {
  const session = await requestRegister(details);

  saveSession(session, false);
  return session;
}

async function requestRegister({ firstName, lastName, email, phone, password }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      }),
    });
  } catch {
    throw new AuthError("Unable to reach the server. Check your connection and try again.", 0);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 409) {
      throw new AuthError(
        payload.message ?? "An account with that email already exists. Try signing in instead.",
        409,
      );
    }
    throw new AuthError(messageForStatus(response.status, payload.message), response.status);
  }
  if (!payload.token || !payload.user?.role) {
    throw new AuthError("The server returned an unexpected response.", response.status);
  }

  return {
    token: payload.token,
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: String(payload.user.role).toUpperCase(),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Password recovery                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Requests a password reset link.
 *
 * Always resolves, even for an unknown address — revealing which emails have
 * accounts would let anyone enumerate the user list. The UI shows the same
 * confirmation either way.
 */
export async function requestPasswordReset(email) {
  try {
    await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    throw new AuthError("Unable to reach the server. Check your connection and try again.", 0);
  }

  return { sent: true };
}

/**
 * Completes a password reset using the token from the emailed link.
 * @param {{ token: string, password: string }} payload
 */
export async function resetPassword({ token, password }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, password }),
    });
  } catch {
    throw new AuthError("Unable to reach the server. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 410) {
      throw new AuthError(
        payload.message ?? "That reset link is invalid or has expired. Please request a new one.",
        response.status,
      );
    }
    throw new AuthError(messageForStatus(response.status, payload.message), response.status);
  }

  return { reset: true };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

// Deliberately permissive -- the server is the real authority on email validity.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validates the login form.
 * @returns {{ email?: string, password?: string }} field -> message (empty = valid)
 */
export function validateCredentials({ email, password }) {
  const errors = {};

  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    errors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = "Enter a valid email address, e.g. name@hotel.com";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}
