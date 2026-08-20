'use client';

import { Suspense, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { adminAuthService } from '@/services/admin.service';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { NetworkGuard } from '@/components/network-guard';
import { AdminRealtimeSync } from '@/components/admin/admin-realtime-sync';

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => adminAuthService.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !data?.admin) {
    if (typeof window !== 'undefined') {
      router.replace('/admin/login');
    }
    return null;
  }

  return <>{children}</>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 15 * 60 * 1000,
            retry: 1,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: 10 * 1000, // Background refresh every 10 seconds
          },
        },
      }),
  );

  useEffect(() => {
    if (isLogin) return;

    const handleAction = () => {
      void queryClient.invalidateQueries();
    };

    window.addEventListener('admin-action-succeeded', handleAction);
    return () => {
      window.removeEventListener('admin-action-succeeded', handleAction);
    };
  }, [queryClient, isLogin]);

  const inner = isLogin ? (
    <>{children}</>
  ) : (
    <AdminAuthGuard>
      <AdminRealtimeSync />
      <NetworkGuard />
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <div className="lg:pl-[12.5rem]">
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </AdminAuthGuard>
  );

  return <QueryClientProvider client={queryClient}>{inner}</QueryClientProvider>;
}
