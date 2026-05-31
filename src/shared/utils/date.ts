/**
 * Date/time utility functions for the Camunda management UI.
 */

import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Formats a date for Camunda 7's REST API.
 *
 * Camunda expects `yyyy-MM-dd'T'HH:mm:ss.SSSZ` where the zone is a numeric
 * offset like `+0000` — NOT the trailing literal `Z` that JS `Date.toISOString()`
 * emits, which Camunda rejects ("Cannot convert value ... to java type Date").
 *
 * Accepts a Date, an ISO/datetime-local string, or null/undefined. Returns
 * `undefined` for empty/invalid input so callers can omit the query param.
 */
export function toCamundaDate(
  value: Date | string | null | undefined,
): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  // `xx` token → numeric offset without a colon (e.g. +0000, -0800).
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxx");
}

/**
 * Returns a relative time string like "3 minutes ago".
 * Returns '-' for null or undefined input.
 */
export function relativeTime(dateString: string | null | undefined): string {
  if (dateString === null || dateString === undefined) {
    return '-';
  }
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

/**
 * Returns an absolute ISO-style formatted timestamp string.
 * Returns '-' for null or undefined input.
 */
export function absoluteTime(dateString: string | null | undefined): string {
  if (dateString === null || dateString === undefined) {
    return '-';
  }
  return format(parseISO(dateString), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * Examples:
 *   formatDuration(8130000)  -> "2h 15m 30s"
 *   formatDuration(45000)    -> "45s"
 *   formatDuration(500)      -> "< 1s"
 *   formatDuration(null)     -> "-"
 */
export function formatDuration(millis: number | null | undefined): string {
  if (millis === null || millis === undefined) {
    return '-';
  }

  const totalSeconds = Math.floor(millis / 1000);

  if (totalSeconds < 1) {
    return '< 1s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
