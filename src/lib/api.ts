import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { PaginatedResult, PaginationMeta } from '@/lib/pagination';
import { API_BASE_URL } from '@/lib/api-origin';

const API_URL = API_BASE_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

/** Single in-flight refresh so concurrent 401s don't stampede the API/DB pool. */
let refreshPromise: Promise<unknown> | null = null;

function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectAdminToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    window.location.href = '/admin/login';
  }
}

function isAdminAuthRequest(url: string) {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/me') ||
    url.includes('/auth/logout')
  );
}

function isCustomerAuthRequest(url: string) {
  return url.includes('/customer-auth/');
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? '';

    // Storefront customer session — never bounce to admin login
    if (isCustomerAuthRequest(requestUrl)) {
      return Promise.reject(error);
    }

    // Only auto-refresh for admin API traffic
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/admin') &&
      !isAdminAuthRequest(requestUrl)
    ) {
      return Promise.reject(error);
    }

    if (isAdminAuthRequest(requestUrl) && !requestUrl.includes('/auth/refresh')) {
      // fall through to refresh for /auth/me etc.
    }

    if (requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/login')) {
      redirectAdminToLogin();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      redirectAdminToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      await refreshAuthSession();
      return api(originalRequest);
    } catch {
      redirectAdminToLogin();
      return Promise.reject(error);
    }
  },
);

export type { PaginationMeta, PaginatedResult };

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Array<{ field: string; message: string }>;
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params, signal: options?.signal });
  return data.data as T;
}

export async function apiGetPaginated<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<PaginatedResult<T>> {
  const { data } = await api.get<ApiResponse<T>>(url, { params, signal: options?.signal });
  if (!data.meta) {
    throw new Error('Expected paginated response but meta was missing');
  }
  return { data: data.data as T, meta: data.meta };
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data.data as T;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data.data as T;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  return data.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiResponse<T>>(url);
  return data.data as T;
}
