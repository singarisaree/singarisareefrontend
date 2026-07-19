'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  customerAuthService,
  type StoreCustomer,
} from '@/services/customer-auth.service';

interface CustomerAuthContextValue {
  customer: StoreCustomer | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setCustomer: (customer: StoreCustomer | null) => void;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const [customer, setCustomer] = useState<StoreCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(!isAdmin);

  const refresh = useCallback(async () => {
    if (isAdmin) return;
    try {
      const result = await customerAuthService.me();
      setCustomer(result.customer);
    } catch {
      setCustomer(null);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    void customerAuthService
      .me()
      .then((result) => {
        if (!cancelled) setCustomer(result.customer);
      })
      .catch(() => {
        if (!cancelled) setCustomer(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const logout = useCallback(async () => {
    try {
      await customerAuthService.logout();
    } finally {
      setCustomer(null);
    }
  }, []);

  const value = useMemo(
    () => ({ customer, isLoading, refresh, setCustomer, logout }),
    [customer, isLoading, refresh, logout],
  );

  return (
    <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return ctx;
}
