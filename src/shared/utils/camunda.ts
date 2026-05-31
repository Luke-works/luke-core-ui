/**
 * Camunda-specific utility functions for the management UI.
 */

/**
 * Returns a CSS variable color string based on process/instance status.
 */
export function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'running':
      return 'var(--accent-green)';
    case 'SUSPENDED':
    case 'suspended':
      return 'var(--accent-yellow)';
    case 'INCIDENT':
    case 'incident':
      return 'var(--accent-red)';
    case 'COMPLETED':
    case 'completed':
    case 'INTERNALLY_TERMINATED':
      return 'var(--text-muted)';
    default:
      return 'var(--text-secondary)';
  }
}

/**
 * Returns a human-readable label for a Camunda status string.
 */
export function statusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'running':
      return 'Active';
    case 'SUSPENDED':
    case 'suspended':
      return 'Suspended';
    case 'INCIDENT':
    case 'incident':
      return 'Incident';
    case 'COMPLETED':
    case 'completed':
      return 'Completed';
    case 'INTERNALLY_TERMINATED':
      return 'Terminated';
    default:
      return status;
  }
}

/**
 * Truncates a Camunda ID for display. If the ID is longer than 16 characters,
 * returns the first 8 and last 4 characters separated by ellipsis.
 */
export function truncateId(id: string): string {
  if (id.length > 16) {
    return `${id.slice(0, 8)}...${id.slice(-4)}`;
  }
  return id;
}

/**
 * Formats a Camunda variable value for display based on its type.
 */
export function formatVariableValue(value: any, type: string): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  switch (type) {
    case 'Boolean':
      return value ? 'true' : 'false';
    case 'Integer':
    case 'Long':
    case 'Short':
    case 'Double':
      return Number(value).toLocaleString();
    case 'String':
      return String(value);
    case 'Object':
    case 'Json':
      return typeof value === 'string' ? value : JSON.stringify(value);
    default:
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
  }
}

/**
 * Returns a human-readable priority label based on a numeric priority value.
 *   0-25  -> Low
 *   26-50 -> Medium
 *   51-75 -> High
 *   76+   -> Critical
 */
export function priorityLabel(priority: number): string {
  if (priority <= 25) return 'Low';
  if (priority <= 50) return 'Medium';
  if (priority <= 75) return 'High';
  return 'Critical';
}

/**
 * Returns a CSS variable color string based on a numeric priority value.
 */
export function priorityColor(priority: number): string {
  if (priority <= 25) return 'var(--text-muted)';
  if (priority <= 50) return 'var(--accent-blue)';
  if (priority <= 75) return 'var(--accent-orange)';
  return 'var(--accent-red)';
}
