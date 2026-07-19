import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/lib/api-origin';
import type { ApiResponse } from '@/lib/api';

/** Storefront API client — no cookies, safe for public pages */
export const storeApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export async function storeGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await storeApi.get<ApiResponse<T>>(url, { params });
  return data.data as T;
}

export async function storePost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await storeApi.post<ApiResponse<T>>(url, body);
  return data.data as T;
}

export function isStoreApiError(error: unknown): error is AxiosError<ApiResponse> {
  return axios.isAxiosError(error);
}
