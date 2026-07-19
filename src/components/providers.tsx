'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { StorefrontPrefetch } from '@/components/storefront-prefetch';
import { StorefrontLiveRefresh } from '@/components/storefront-live-refresh';
import { NavigationProgress } from '@/components/navigation-progress';
import { CustomerAuthProvider } from '@/components/customer-auth-provider';

function StorefrontQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const content = (
    <CustomerAuthProvider>
      {!isAdmin && (
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
      )}
      {!isAdmin && <StorefrontPrefetch />}
      {!isAdmin && <StorefrontLiveRefresh />}
      {children}
      <Toaster
        position="top-center"
        duration={1800}
        visibleToasts={1}
        expand={false}
        closeButton
        toastOptions={{
          duration: 1800,
          style: {
            background: '#fcf9f6',
            border: '1px solid #7a0012',
            color: '#333333',
            fontFamily: 'var(--font-poppins), sans-serif',
          },
        }}
        mobileOffset={{ top: '4.25rem' }}
      />
    </CustomerAuthProvider>
  );

  if (isAdmin) {
    return content;
  }

  return <StorefrontQueryProvider>{content}</StorefrontQueryProvider>;
}
