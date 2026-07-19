'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { adminAuthService } from '@/services/admin.service';
import { AdminUserAvatar } from './admin-user-avatar';

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/orders': 'Orders',
  '/admin/products': 'Products',
  '/admin/stock': 'Stock',
  '/admin/duplicate-sold': 'Duplicate Sold',
  '/admin/coupons': 'Coupons',
  '/admin/coupons/new': 'Create Coupon',
  '/admin/users': 'Users',
  '/admin/reviews': 'Reviews',
  '/admin/settings': 'Settings',
};

export function AdminHeader() {
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ||
    (pathname.startsWith('/admin/coupons/') ? 'Edit Coupon' : 'Admin');

  const { data } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => adminAuthService.me(),
  });

  const admin = data?.admin;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white px-6 lg:px-8">
      <h1 className="text-xl font-semibold text-[#0f172a]">{title}</h1>

      <div className="flex items-center gap-5">
        <button
          type="button"
          className="relative rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>

        {admin && (
          <div className="flex items-center gap-3 border-l border-[#e2e8f0] pl-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#0f172a]">{admin.name}</p>
              <p className="text-xs text-[#64748b]">Store Administrator</p>
            </div>
            <AdminUserAvatar name={admin.name} size="md" />
          </div>
        )}
      </div>
    </header>
  );
}
