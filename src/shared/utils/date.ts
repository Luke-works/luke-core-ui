/**
 * Date/time utility functions for the Camunda management UI.
 */

import { formatDistanceToNow, format, parseISO } from 'date-fns';

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
