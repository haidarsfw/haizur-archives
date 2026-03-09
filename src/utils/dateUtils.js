/**
 * Unified date parsing/formatting utility for Haizur Archives.
 *
 * Handles the two date shapes found across the codebase:
 *   - Plain string:  "2025-01-04"
 *   - Object:        { raw: "2025-01-04", part1: "2025", part2: "01-04" }
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Parse a date input into a native Date object.
 *
 * @param {string|{raw: string, part1: string, part2: string}|Date} input
 * @returns {Date}
 */
export function parseDate(input) {
  if (input instanceof Date) return input;

  if (input && typeof input === "object" && input.raw) {
    return new Date(input.raw);
  }

  if (typeof input === "string") {
    return new Date(input);
  }

  return new Date(input);
}

/**
 * Format a Date (or parseable input) into a human-readable string.
 *
 * Supported formats:
 *   'full'  — January 4, 2025
 *   'short' — Jan 4
 *   'iso'   — 2025-01-04
 *   'time'  — 14:30
 *
 * @param {Date|string|object} date
 * @param {'full'|'short'|'iso'|'time'} format
 * @returns {string}
 */
export function formatDate(date, format = "full") {
  const d = parseDate(date);

  if (isNaN(d.getTime())) return "";

  switch (format) {
    case "full":
      return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    case "short":
      return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;

    case "iso": {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    case "time": {
      const h = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${min}`;
    }

    default:
      return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

/**
 * Return a human-friendly relative time string.
 *
 *   "just now"      — less than 60 seconds ago
 *   "2 min ago"     — less than 60 minutes ago
 *   "3 hours ago"   — less than 24 hours ago
 *   "2 days ago"    — less than 30 days ago
 *   "Jan 4, 2025"   — anything older
 *
 * @param {Date|string|object} date
 * @returns {string}
 */
export function formatRelative(date) {
  const d = parseDate(date);

  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffMs = now - d.getTime();

  // Future dates or essentially "now"
  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Normalize a date value to a consistent string representation.
 *
 *   null / undefined  -> ""
 *   string            -> returned as-is
 *   { raw: "..." }    -> raw value
 *   anything else     -> String(d)
 *
 * @param {*} d
 * @returns {string}
 */
export function normalizeDate(d) {
  if (d == null) return "";
  if (typeof d === "string") return d;
  if (typeof d === "object" && d.raw) return d.raw;
  return String(d);
}
