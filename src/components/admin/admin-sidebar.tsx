'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Shapes,
  Warehouse,
  Ticket,
  Star,
  Copy,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Truck,
  RotateCcw,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { adminAuthService, adminCategoryService, adminDashboardService, adminOrderService, adminProductService, adminReturnRequestService } from '@/services/admin.service';
import { toast } from 'sonner';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, prefetchKey: 'dashboard-stats' as const },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, prefetchKey: 'admin-orders' as const },
  { href: '/admin/return-requests', label: 'Return Requests', icon: RotateCcw, prefetchKey: 'admin-return-requests' as const },
  { href: '/admin/refunds', label: 'Coupon refunds', icon: IndianRupee, prefetchKey: 'admin-refunds' as const },
  { href: '/admin/dispatches', label: 'Dispatches', icon: Truck, prefetchKey: 'admin-dispatches' as const },
  { href: '/admin/products', label: 'Products', icon: Package, prefetchKey: 'admin-products' as const },
  { href: '/admin/categories', label: 'Categories', icon: Shapes, prefetchKey: 'admin-categories' as const },
  { href: '/admin/stock', label: 'Stock', icon: Warehouse, prefetchKey: 'admin-inventory' as const },
  { href: '/admin/duplicate-sold', label: 'Duplicate Sold', icon: Copy, prefetchKey: 'admin-products' as const },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket, prefetchKey: 'admin-coupons' as const },
  { href: '/admin/users', label: 'Users', icon: UserCircle, prefetchKey: 'admin-users' as const },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, prefetchKey: 'admin-reviews' as const },
  { href: '/admin/escalation', label: 'Escalation', icon: ShieldAlert, prefetchKey: 'admin-orders' as const },
  { href: '/admin/settings', label: 'Settings', icon: Settings, prefetchKey: 'admin-banners' as const },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  if (pathname === '/admin/login') return null;

  const prefetchPage = (key: (typeof navItems)[number]['prefetchKey']) => {
    switch (key) {
      case 'dashboard-stats':
        void queryClient.prefetchQuery({
          queryKey: ['dashboard-stats'],
          queryFn: () => adminDashboardService.getStats(),
          staleTime: 30 * 1000,
        });
        break;
      case 'admin-orders':
        void queryClient.prefetchQuery({
          queryKey: ['admin-orders', 'ALL', '', 1, 20],
          queryFn: () => adminOrderService.list({ page: '1', limit: '20' }),
          staleTime: 30 * 1000,
        });
        break;
      case 'admin-return-requests':
        void queryClient.prefetchQuery({
          queryKey: ['admin-return-requests', 'ALL', '', 1, 20],
          queryFn: () => adminReturnRequestService.getAll({ page: 1, limit: 20 }),
          staleTime: 30 * 1000,
        });
        break;
      case 'admin-dispatches':
        void queryClient.prefetchQuery({
          queryKey: ['admin-dispatches', 'ALL', '', 1, 20],
          queryFn: () => adminDashboardService.listDispatches({ page: '1', limit: '20' }),
          staleTime: 30 * 1000,
        });
        break;
      case 'admin-products':
        void queryClient.prefetchQuery({
          queryKey: ['admin-products'],
          queryFn: () => adminProductService.getAll({ limit: '100' }),
          staleTime: 60 * 1000,
        });
        break;
      case 'admin-categories':
        void queryClient.prefetchQuery({
          queryKey: ['admin-categories'],
          queryFn: () => adminCategoryService.getAll(),
          staleTime: 2 * 60 * 1000,
        });
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await adminAuthService.logout();
      router.push('/admin/login');
      toast.success('Logged out');
    } catch {
      router.push('/admin/login');
    }
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-lg border border-[#e2e8f0] bg-white p-2 shadow-sm lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5 text-[#0f172a]" /> : <Menu className="h-5 w-5 text-[#0f172a]" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[12.5rem] flex-col border-r border-[#e2e8f0] bg-[#f8fafc] transition-transform lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[#e2e8f0] px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f172a] text-sm font-bold text-white">
            SS
          </div>
          <div>
            <p className="text-sm font-bold text-[#0f172a]">Singari Sarees</p>
            <p className="text-[0.65rem] font-medium text-[#64748b]">Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            // Keep status tab / search — list page query, or detail page returnTo
            const href =
              item.href === '/admin/orders'
                ? (() => {
                    if (pathname === '/admin/orders') {
                      const qs = searchParams.toString();
                      return qs ? `/admin/orders?${qs}` : '/admin/orders';
                    }
                    if (pathname.startsWith('/admin/orders/')) {
                      const returnTo = searchParams.get('returnTo');
                      if (
                        returnTo &&
                        returnTo.startsWith('/admin/') &&
                        !returnTo.startsWith('//') &&
                        (returnTo === '/admin/orders' || returnTo.startsWith('/admin/orders?'))
                      ) {
                        return returnTo;
                      }
                    }
                    return '/admin/orders';
                  })()
                : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                onClick={() => setIsOpen(false)}
                onMouseEnter={() => prefetchPage(item.prefetchKey)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-[#0f172a] text-white shadow-sm'
                    : 'text-[#475569] hover:bg-white hover:text-[#0f172a]',
                )}
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={active ? 2 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-[#e2e8f0] p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#0f172a]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
