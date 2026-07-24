import axios from 'axios';
import type { ApiResponse } from '@/lib/api';

export function isConnectionError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response) return false;
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error'
  );
}

export function getConnectionErrorMessage(): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Please check your network and try again.';
  }
  return 'Server not reachable. Please try again.';
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isConnectionError(error)) {
    return getConnectionErrorMessage();
  }
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse | undefined;
    const fieldError = data?.errors?.[0]?.message;
    if (typeof fieldError === 'string' && fieldError.trim()) {
      return fieldError;
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
