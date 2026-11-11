/**
 * ThreatLens Timezone & Date/Time Formatting Utilities
 *
 * Enforces Indian Standard Time (IST / Asia/Kolkata, UTC+05:30)
 * consistently across the entire frontend while canonical backend
 * storage and REST communication remain strictly in UTC.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';
export const IST_LOCALE = 'en-IN';

// Core Intl.DateTimeFormat instance configured per specifications
export const istDateTimeFormatter = new Intl.DateTimeFormat(IST_LOCALE, {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

/**
 * Safely parses an ISO string, timestamp number, or Date object into a Date.
 * Ensures ISO strings without an explicit timezone offset are parsed as UTC.
 */
function parseDate(isoOrDate) {
  if (isoOrDate instanceof Date) return isoOrDate;
  if (typeof isoOrDate === 'string') {
    let str = isoOrDate.trim();
    if (!str) return null;
    // If it is an ISO string missing timezone info (e.g. 2026-11-11T14:52:25), treat as UTC
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
      str = str.replace(' ', 'T') + 'Z';
    }
    return new Date(str);
  }
  if (typeof isoOrDate === 'number') {
    return new Date(isoOrDate);
  }
  return null;
}

/**
 * Formats a UTC ISO string, timestamp, or Date object into IST.
 * Output format: "YYYY-MM-DD HH:mm:ss IST" (or custom options)
 *
 * Example:
 *   "2026-11-11T14:52:25Z" -> "2026-11-11 20:22:25 IST"
 *
 * @param {string|number|Date} isoOrDate - Timestamp to format
 * @param {Object} [options]
 * @param {boolean} [options.includeSeconds=true] - Whether to include seconds (:ss)
 * @param {boolean} [options.includeTz=true] - Whether to append " IST"
 * @param {string} [options.fallback='–'] - Fallback for null/invalid values
 * @returns {string} Formatted IST date-time string
 */
export function formatIST(isoOrDate, { includeSeconds = true, includeTz = true, fallback = '–' } = {}) {
  if (!isoOrDate) return fallback;
  try {
    const date = parseDate(isoOrDate);
    if (!date || isNaN(date.getTime())) return fallback;

    const parts = istDateTimeFormatter.formatToParts(date);
    const m = {};
    for (let i = 0; i < parts.length; i++) {
      m[parts[i].type] = parts[i].value;
    }

    const hour = m.hour === '24' ? '00' : m.hour;
    let res = `${m.year}-${m.month}-${m.day} ${hour}:${m.minute}`;
    if (includeSeconds) res += `:${m.second}`;
    if (includeTz) res += ' IST';
    return res;
  } catch {
    return fallback;
  }
}

/**
 * Formats time-only in IST: "HH:mm:ss" or "HH:mm"
 * Useful for refresh badges, real-time status, and timers.
 */
export function formatISTTime(isoOrDate, { includeSeconds = true, fallback = '–' } = {}) {
  if (!isoOrDate) return fallback;
  try {
    const date = parseDate(isoOrDate);
    if (!date || isNaN(date.getTime())) return fallback;

    const parts = istDateTimeFormatter.formatToParts(date);
    const m = {};
    for (let i = 0; i < parts.length; i++) {
      m[parts[i].type] = parts[i].value;
    }

    const hour = m.hour === '24' ? '00' : m.hour;
    return includeSeconds ? `${hour}:${m.minute}:${m.second}` : `${hour}:${m.minute}`;
  } catch {
    return fallback;
  }
}

/**
 * Formats date-only in IST: "YYYY-MM-DD"
 */
export function formatISTDate(isoOrDate, { fallback = '–' } = {}) {
  if (!isoOrDate) return fallback;
  try {
    const date = parseDate(isoOrDate);
    if (!date || isNaN(date.getTime())) return fallback;

    const parts = istDateTimeFormatter.formatToParts(date);
    const m = {};
    for (let i = 0; i < parts.length; i++) {
      m[parts[i].type] = parts[i].value;
    }

    return `${m.year}-${m.month}-${m.day}`;
  } catch {
    return fallback;
  }
}

