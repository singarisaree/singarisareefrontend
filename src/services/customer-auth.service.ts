import { apiGet, apiPost } from '@/lib/api';

export interface StoreCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export const customerAuthService = {
  sendOtp: (phone: string) =>
    apiPost<{ phone: string; expiresInSeconds: number; debugOtp?: string }>(
      '/customer-auth/otp/send',
      { phone },
    ),

  verifyOtp: (data: { phone: string; otp: string; name?: string }) =>
    apiPost<{ customer: StoreCustomer }>('/customer-auth/otp/verify', data),

  me: () => apiGet<{ customer: StoreCustomer }>('/customer-auth/me'),

  logout: () => apiPost<null>('/customer-auth/logout'),

  logoutAll: () => apiPost<null>('/customer-auth/logout-all'),
};
