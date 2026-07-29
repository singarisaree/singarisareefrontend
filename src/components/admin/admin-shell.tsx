'use client';

import { Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { NetworkGuard } from '@/components/network-guard';
import { AdminRealtimeSync } from '@/components/admin/admin-realtime-sync';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep list cache warm so back from detail feels instant
            staleTime: 2 * 60_000,
            gcTime: 15 * 60 * 1000,
            retry: 1,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const inner = isLogin ? (
    <>{children}</>
  ) : (
    <>
      <AdminRealtimeSync />
      <NetworkGuard />
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <div className="lg:pl-[12.5rem]">
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </>
  );

  return <QueryClientProvider client={queryClient}>{inner}</QueryClientProvider>;
}
