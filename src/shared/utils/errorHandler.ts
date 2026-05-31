/**
 * Error handling utilities for the Camunda management UI.
 */

import { AxiosError } from 'axios';

/**
 * Extracts a user-facing error message from an unknown error value.
 *
 * - For Axios errors: checks response.data.message, then response.statusText,
 *   then falls back to "Request failed".
 * - For standard Error instances: returns error.message.
 * - For anything else: returns a generic message.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const dataMessage = error.response?.data?.message;
    if (typeof dataMessage === 'string' && dataMessage.length > 0) {
      return dataMessage;
    }

    const statusText = error.response?.statusText;
    if (typeof statusText === 'string' && statusText.length > 0) {
      return statusText;
    }

    return 'Request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
