'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminCouponService } from '@/services/admin.service';
import { formatPrice } from '@/lib/utils';
import type { Coupon } from '@/types';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import {
  DataTableToolbar,
  FilterTabs,
  ClearFilters,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';
import { Ticket, CheckCircle, XCircle, Percent } from 'lucide-react';

const STATUS_VALUES = ['all', 'active', 'inactive'] as const;

export default function AdminCouponsPage() {
  const router = useRouter();
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [status, setStatus] = useAdminEnumParam('status', STATUS_VALUES, 'all');
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();

  useResetPageOnFilterChange(resetPage, debouncedSearch, status, dateParams.startDate, dateParams.endDate);

  const { data: couponsResult, isLoading } = useQuery({
    queryKey: ['admin-coupons', debouncedSearch, status, page, pageSize, dateParams],
    queryFn: () =>
      adminCouponService.list({
        page: String(page),
        limit: String(pageSize),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status === 'active' && { isActive: 'true' }),
        ...(status === 'inactive' && { isActive: 'false' }),
        ...dateParams,
      }),
    placeholderData: keepPreviousData,
  });

  const coupons = couponsResult?.data ?? [];
  const meta = couponsResult?.meta;
  const active = coupons.filter((c: Coupon) => c.isActive).length;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all' || hasDateRange;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748b]">
        Promo coupons only. Store credit / refund coupons are managed under{' '}
        <Link href="/admin/refunds" className="font-medium text-[#0f172a] underline-offset-2 hover:underline">
          Refunds
        </Link>
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Coupons" value={meta?.total ?? coupons.length} icon={Ticket} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard label="Active" value={active} subtext="on this page" icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Inactive" value={coupons.length - active} subtext="on this page" icon={XCircle} iconBg="bg-slate-100" iconColor="text-slate-500" />
        <StatCard label="Percentage" value={coupons.filter((c: Coupon) => c.type === 'PERCENTAGE').length} subtext="on this page" icon={Percent} iconBg="bg-blue-50" iconColor="text-blue-600" />
      </div>

      <AdminTableCard>
        <div className="space-y-3 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search coupon code..."
            searchValue={search}
            onSearchChange={onSearchChange}
            addLabel="Add Coupon"
            onAdd={() => router.push('/admin/coupons/new')}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          >
            <ClearFilters
              visible={hasFilters}
              onClear={() => {
                setSearch('');
                setStatus('all');
                clearDateRange();
              }}
            />
          </DataTableToolbar>
          <FilterTabs
            value={status}
            onChange={(value) => setStatus(value as (typeof STATUS_VALUES)[number])}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Code</AdminTh>
            <AdminTh>Type</AdminTh>
            <AdminTh>Value</AdminTh>
            <AdminTh>Min Order</AdminTh>
            <AdminTh>Usage</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-[#94a3b8]">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-[#94a3b8]">No coupons found.</td></tr>
            ) : (
              coupons.map((coupon: Coupon) => (
                <tr key={coupon.id} className="hover:bg-[#f8fafc]">
                  <AdminTd className="font-mono font-semibold text-[#0f172a]">{coupon.code}</AdminTd>
                  <AdminTd>{coupon.type}</AdminTd>
                  <AdminTd className="font-semibold">
                    {coupon.type === 'FLAT' ? formatPrice(coupon.value) : `${coupon.value}%`}
                  </AdminTd>
                  <AdminTd>{formatPrice(coupon.minOrderAmount)}</AdminTd>
                  <AdminTd>{coupon.usedCount ?? 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</AdminTd>
                  <AdminTd>
                    <StatusBadge variant={coupon.isActive ? 'active' : 'inactive'}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </AdminTd>
                  <AdminTd>
                    <ViewDetailsButton href={`/admin/coupons/${coupon.id}`} label="Coupon Details" />
                  </AdminTd>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
        {meta && (
          <AdminPagination
            meta={meta}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </AdminTableCard>
    </div>
  );
}
