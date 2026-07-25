'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  customerAuthService,
  type StoreCustomer,
} from '@/services/customer-auth.service';
import { CustomerLoginDialog } from '@/components/auth/customer-login-dialog';

const CUSTOMER_CACHE_KEY = 'singari_customer_v1';

function readCachedCustomer(): StoreCustomer | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CUSTOMER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreCustomer;
    if (!parsed?.id || !parsed?.phone || !parsed?.name) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email ?? null,
    };
  } catch {
    return null;
  }
}

function writeCachedCustomer(customer: StoreCustomer | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!customer) {
      sessionStorage.removeItem(CUSTOMER_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(
      CUSTOMER_CACHE_KEY,
      JSON.stringify({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? null,
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export type OpenLoginOptions = {
  /** Navigate here after successful login (must start with `/`). */
  next?: string;
  initialPhone?: string;
  onVerified?: () => void;
};

interface CustomerAuthContextValue {
  customer: StoreCustomer | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setCustomer: (customer: StoreCustomer | null) => void;
  logout: () => Promise<void>;
  openLogin: (options?: OpenLoginOptions) => void;
  closeLogin: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith('/admin');
  const [customer, setCustomerState] = useState<StoreCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(!isAdmin);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const loginNextRef = useRef<string | null>(null);
  const loginOnVerifiedRef = useRef<(() => void) | null>(null);

  const setCustomer = useCallback((next: StoreCustomer | null) => {
    setCustomerState(next);
    writeCachedCustomer(next);
  }, []);

  const refresh = useCallback(async () => {
    if (isAdmin) return;
    try {
      const result = await customerAuthService.me();
      setCustomer(result.customer);
    } catch {
      setCustomer(null);
    }
  }, [isAdmin, setCustomer]);

  // Restore cached profile before paint so LOGIN does not flash after refresh.
  useLayoutEffect(() => {
    if (isAdmin) return;
    const cached = readCachedCustomer();
    if (cached) setCustomerState(cached);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
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
  }, [isAdmin, setCustomer]);

  const logout = useCallback(async () => {
    try {
      await customerAuthService.logout();
    } finally {
      setCustomer(null);
    }
  }, [setCustomer]);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    loginNextRef.current = null;
    loginOnVerifiedRef.current = null;
  }, []);

  const openLogin = useCallback((options?: OpenLoginOptions) => {
    if (isAdmin) return;
    const next = options?.next?.trim();
    loginNextRef.current = next && next.startsWith('/') ? next : null;
    loginOnVerifiedRef.current = options?.onVerified ?? null;
    setLoginPhone(options?.initialPhone?.replace(/\D/g, '').slice(-10) || '');
    setLoginOpen(true);
  }, [isAdmin]);

  const handleLoginOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeLogin();
      else setLoginOpen(true);
    },
    [closeLogin],
  );

  const handleVerified = useCallback(() => {
    const onVerified = loginOnVerifiedRef.current;
    const next = loginNextRef.current;
    loginOnVerifiedRef.current = null;
    loginNextRef.current = null;
    onVerified?.();
    if (next && next !== pathname) {
      router.push(next);
    }
  }, [pathname, router]);

  const value = useMemo(
    () => ({
      customer,
      isLoading,
      refresh,
      setCustomer,
      logout,
      openLogin,
      closeLogin,
    }),
    [customer, isLoading, refresh, setCustomer, logout, openLogin, closeLogin],
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
      {!isAdmin ? (
        <CustomerLoginDialog
          open={loginOpen}
          onOpenChange={handleLoginOpenChange}
          setCustomer={setCustomer}
          initialPhone={loginPhone}
          onVerified={handleVerified}
        />
      ) : null}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return ctx;
}
