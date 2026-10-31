/**
 * format.js
 * -----------------------------------------------------------------------------
 * Display formatting. Uses the platform Intl APIs rather than a date library,
 * which keeps the dependency list honest.
 */

const LOCALE = "en-GB";

/**
 * Formats an amount as currency.
 * @param {number} amount
 * @param {string} [currency="LKR"]
 * @param {{compact?: boolean}} [options] compact renders 1.2M rather than 1,200,000
 */
export function formatCurrency(amount, currency = "LKR", { compact = false } = {}) {
  if (amount == null || Number.isNaN(amount)) return "—";

  const formatted = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
  }).format(amount);

  // en-GB writes thousands as a lowercase "k" beside an uppercase "M"/"B";
  // uppercase it so "LKR 567.8K" reads consistently with "LKR 1.2M".
  return compact ? formatted.toUpperCase() : formatted;
}

/** "12 Sep 2025" */
export function formatDate(value, options) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

/** "12 Sep, 14:30" — for timestamps where the year is noise. */
export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "12 Sep – 16 Sep 2025", collapsing a shared month or year. */
export function formatDateRange(start, end) {
  if (!start || !end) return "—";
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";

  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  const fromLabel = new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(from);

  return `${fromLabel} – ${formatDate(to)}`;
}

/** "3 minutes ago", "in 2 days" */
export function formatRelative(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return formatter.format(seconds, "second");
}

/**
 * "Good morning" / "Good afternoon" / "Good evening" from the browser's local
 * clock: morning 05:00–11:59, afternoon 12:00–16:59, evening otherwise.
 */
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "AP" from "Amara Perera" — for avatar fallbacks. */
export function initials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Today as YYYY-MM-DD, for date input min attributes. */
export function todayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

/** Shifts an ISO date string by a number of days. */
export function addDays(dateISO, days) {
  const date = dateISO ? new Date(dateISO) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
