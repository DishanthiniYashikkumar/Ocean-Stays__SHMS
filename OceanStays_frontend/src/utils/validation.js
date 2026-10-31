/**
 * validation.js
 * -----------------------------------------------------------------------------
 * Reusable field validators. Deliberately permissive — the server is always the
 * real authority. These exist to catch mistakes early and explain them kindly.
 */

// Matches authService's pattern so both forms accept the same addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Loose international format: digits, spaces, dashes, parens, optional +.
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/;

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value).trim());
}

export function isPhone(value) {
  return PHONE_PATTERN.test(String(value).trim());
}

/**
 * Runs a set of rules against a values object.
 *
 * @param {object} values
 * @param {Record<string, Array<(value: any, values: object) => string|undefined>>} rules
 * @returns {Record<string, string>} field -> first failing message
 */
export function validate(values, rules) {
  const errors = {};

  Object.entries(rules).forEach(([field, checks]) => {
    for (const check of checks) {
      const message = check(values[field], values);
      if (message) {
        errors[field] = message;
        break;
      }
    }
  });

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Rule builders                                                              */
/* -------------------------------------------------------------------------- */

export const required = (label) => (value) =>
  !String(value ?? "").trim() ? `${label} is required.` : undefined;

export const email = () => (value) =>
  value && !isEmail(value) ? "Enter a valid email address, e.g. name@example.com" : undefined;

export const phone = () => (value) =>
  value && !isPhone(value) ? "Enter a valid phone number." : undefined;

export const minLength = (length, label) => (value) =>
  value && String(value).trim().length < length
    ? `${label} must be at least ${length} characters.`
    : undefined;

export const maxLength = (length, label) => (value) =>
  value && String(value).length > length
    ? `${label} must be ${length} characters or fewer.`
    : undefined;

export const matches = (otherField, message) => (value, values) =>
  value && value !== values[otherField] ? message : undefined;

export const checked = (message) => (value) => (value ? undefined : message);

/* -------------------------------------------------------------------------- */
/* Card format checks                                                         */
/* -------------------------------------------------------------------------- */
/*
 * These catch typos before the guest submits — nothing more. They are NOT a
 * substitute for the payment provider's validation, and no value checked here
 * is ever stored, logged or sent to our own API. In production the card fields
 * are a hosted iframe from the provider, so these run against a field this
 * application never actually owns.
 */

/** Groups digits in fours: "4242424242424242" -> "4242 4242 4242 4242". */
export function formatCardNumber(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** Formats keystrokes as MM/YY. */
export function formatExpiry(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Luhn checksum — rejects mistyped digits, not invalid accounts. */
export function isCardNumber(value) {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

/** True when MM/YY is a real month that has not already passed. */
export function isExpiryValid(value) {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(value).trim());
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  // A card is valid through the last day of its expiry month.
  const expiresAfter = new Date(year, month, 1);
  return expiresAfter > now;
}

export const cardNumber = () => (value) =>
  value && !isCardNumber(value) ? "Check that card number — it doesn't look right." : undefined;

export const expiry = () => (value) =>
  value && !isExpiryValid(value) ? "Enter a valid future expiry date as MM/YY." : undefined;

export const cvc = () => (value) =>
  value && !/^\d{3,4}$/.test(String(value).trim())
    ? "The security code is 3 or 4 digits."
    : undefined;

/* -------------------------------------------------------------------------- */
/* Password strength                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Scores a password for the strength meter.
 *
 * This is guidance for the guest, not a gate — the only hard rule is the
 * 8-character minimum enforced by the `minLength` rule. Deliberately simple
 * and transparent: length plus character variety.
 *
 * @param {string} password
 * @returns {{ score: 0|1|2|3|4, label: string, tone: string }}
 */
export function passwordStrength(password = "") {
  if (!password) return { score: 0, label: "", tone: "neutral" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const levels = [
    { label: "Too short", tone: "danger" },
    { label: "Weak", tone: "danger" },
    { label: "Fair", tone: "warning" },
    { label: "Good", tone: "info" },
    { label: "Strong", tone: "success" },
  ];

  return { score, ...levels[score] };
}
