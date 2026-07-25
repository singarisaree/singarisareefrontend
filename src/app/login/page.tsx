'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCustomerAuth } from '@/components/customer-auth-provider';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isLoading, openLogin } = useCustomerAuth();
  const nextRaw = searchParams.get('next') || '/';
  const next = nextRaw.startsWith('/') ? nextRaw : '/';

  useEffect(() => {
    if (isLoading) return;
    if (customer) {
      router.replace(next);
      return;
    }
    openLogin({ next });
    // Stay on a normal storefront page under the dialog
    router.replace(next === '/checkout' ? '/checkout' : '/');
  }, [customer, isLoading, next, openLogin, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-cream text-sm text-brown-light">
      Opening login…
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-cream text-sm text-brown-light">
          Loading…
        </div>
      }
    >
      <LoginRedirect />
    </Suspense>
  );
}
