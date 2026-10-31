/**
 * authService.js
 * -----------------------------------------------------------------------------
 * All authentication logic lives here. UI components never talk to the network
 * and never decide where a user lands after login -- they call these functions
 * and follow the role the backend returns.
 *
 * To connect the real backend later:
 *   1. Set VITE_API_BASE_URL in .env  (see .env.example)
 *   2. Set VITE_USE_MOCK_AUTH="false"
 * Nothing else in the UI has to change.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// Mock mode lets the page run before the backend exists. Defaults to on.
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== "false";

const TOKEN_KEY = "shms.auth.token";
const USER_KEY = "shms.auth.user";

/* -------------------------------------------------------------------------- */
/* Roles + RBAC routing                                                       */
/* -------------------------------------------------------------------------- */
/*
 * Defined in roles.js and re-exported here, so that everything importing them
 * from this module keeps working while fixtures can reach the constants
 * without depending on auth.
 */

export { ROLES, ROLE_ROUTES, ROLE_LABELS, getDashboardRoute } from "./roles";

// A re-export creates no local binding, and the mock helpers below use these.
import { ROLES } from "./roles";
import { users as mockUsers } from "./mock/users";

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
  const session = USE_MOCK_AUTH
    ? await mockLogin({ email, password })
    : await requestLogin({ email, password });

  saveSession(session, remember);
  return session;
}

async function requestLogin({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: email.trim(),
      password,
    }),
  });

  const payload = await response.json();

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
      role: String(payload.role).toUpperCase(),
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
  const session = USE_MOCK_AUTH ? await mockRegister(details) : await requestRegister(details);

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
  if (USE_MOCK_AUTH) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { sent: true };
  }

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
  if (USE_MOCK_AUTH) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (!token) throw new AuthError("That reset link is invalid or has expired.", 400);
    return { reset: true };
  }

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
/* Mock backend (development only)                                            */
/* -------------------------------------------------------------------------- */
/*
 * No credentials are hardcoded and no password is ever checked against a
 * stored value -- any password of 8+ characters is accepted, shorter ones
 * simulate a 401.
 *
 * Signing in with a fixture address returns that fixture user, so the portal
 * has real bookings, notifications and invoices behind it:
 *
 *   amara.perera@example.com   -> Guest          (usr-guest-01)
 *   reception@oceanstays.com   -> Receptionist   (usr-recep-01)
 *   housekeeping@oceanstays.com-> Housekeeping   (usr-hk-01)
 *   service@oceanstays.com     -> Service Staff  (usr-service-01)
 *   admin@oceanstays.com       -> Administrator  (usr-admin-01)
 *
 * Any other address falls back to a role derived from its local part, so every
 * role stays reachable -- that account simply has no data behind it.
 */

const MOCK_ROLE_HINTS = [
  [/^(admin|administrator)/, ROLES.ADMIN],
  [/^(reception|frontdesk|desk)/, ROLES.RECEPTIONIST],
  [/^(housekeep|hk|cleaning)/, ROLES.HOUSEKEEPING],
  [/^(service|room-?service|staff)/, ROLES.SERVICE_STAFF],
];

function mockRoleFor(email) {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  const hit = MOCK_ROLE_HINTS.find(([pattern]) => pattern.test(localPart));
  return hit ? hit[1] : ROLES.GUEST;
}

async function mockLogin({ email, password }) {
  await new Promise((resolve) => setTimeout(resolve, 900)); // network latency

  if (password.length < 8) {
    throw new AuthError("Incorrect email or password. Please try again.", 401);
  }

  const normalised = email.trim().toLowerCase();

  /*
   * Prefer a real fixture user. Bookings, notifications and invoices are keyed
   * to fixture ids like `usr-guest-01`, so signing in with a derived id would
   * leave every portal page showing its empty state.
   */
  const known = mockUsers.find((candidate) => candidate.email.toLowerCase() === normalised);

  if (known) {
    return {
      token: `mock.${btoa(`${normalised}:${known.role}`)}.token`,
      user: {
        id: known.id,
        name: known.name,
        email: known.email,
        phone: known.phone,
        role: known.role,
      },
    };
  }

  // Unknown address: derive an identity so every role stays reachable. This
  // account has no fixture data behind it, which is what a new sign-up looks
  // like anyway.
  const role = mockRoleFor(normalised);
  const localPart = normalised.split("@")[0] ?? "user";

  return {
    token: `mock.${btoa(`${normalised}:${role}`)}.token`,
    user: {
      id: `mock-${localPart}`,
      name: localPart.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email: normalised,
      role,
    },
  };
}

/** Addresses the mock treats as already registered, to exercise the 409 path. */
const MOCK_TAKEN_EMAILS = ["admin@oceanstays.com", "reception@oceanstays.com"];

async function mockRegister({ firstName, lastName, email, phone, password }) {
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const normalised = email.trim().toLowerCase();

  if (MOCK_TAKEN_EMAILS.includes(normalised)) {
    throw new AuthError(
      "An account with that email already exists. Try signing in instead.",
      409,
    );
  }
  if (password.length < 8) {
    throw new AuthError("Please choose a password of at least 8 characters.", 400);
  }

  const name = `${firstName.trim()} ${lastName.trim()}`.trim();

  return {
    // Self-registration always produces a GUEST — never a staff role.
    token: `mock.${btoa(`${normalised}:${ROLES.GUEST}`)}.token`,
    user: {
      id: `mock-${normalised.split("@")[0]}`,
      name,
      email: normalised,
      phone: phone.trim(),
      role: ROLES.GUEST,
    },
  };
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
