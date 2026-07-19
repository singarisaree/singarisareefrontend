'use client';

import { useCallback } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/admin.service';
import {
  formatDate,
  formatTime,
  formatCustomerName,
  getOrderStatusLabel,
  formatShortOrderNumber,
} from '@/lib/utils';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminStringParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import { useClampPaginationPage, isPaginationMismatch } from '@/lib/use-clamp-pagination-page';
import { StatusBadge, orderStatusVariant } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminTableSkeleton } from '@/components/admin/loading-skeletons';
import { AdminTableLoadingOverlay } from '@/components/admin/admin-table-loading-overlay';
import { AdminPagination } from '@/components/admin/admin-pagination';
import {
  DataTableToolbar,
  FilterTabs,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';

export default function AdminDispatchesPage() {
  const { search, debouncedSearch, onSearchChange } = useAdminSearchParam();
  const [courierParam, setCourierParam] = useAdminStringParam('courier');
  const activeCourier = courierParam || 'ALL';
  const { dateRange, onDateRangeChange, dateParams } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();

  useResetPageOnFilterChange(resetPage, activeCourier, debouncedSearch, dateParams.startDate, dateParams.endDate);

  const setActiveCourier = useCallback(
    (courier: string) => {
      setCourierParam(courier === 'ALL' ? '' : courier);
    },
    [setCourierParam],
  );

  const { data, isPending, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['admin-dispatches', activeCourier, debouncedSearch, page, pageSize, dateParams],
    queryFn: ({ signal }) =>
      adminDashboardService.listDispatches(
        {
          page: String(page),
          limit: String(pageSize),
          ...(activeCourier !== 'ALL' && { courier: activeCourier }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...dateParams,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const dispatches = data?.dispatches ?? [];
  const courierPartners = data?.courierPartners ?? [];
  const meta = data?.meta;

  useClampPaginationPage(meta, page, setPage);

  const paginationMismatch = isPaginationMismatch(meta, dispatches.length, page);
  const isTrulyEmpty =
    meta != null ? meta.total === 0 : !isPending && !isFetching && dispatches.length === 0;
  const showSkeleton =
    (!data && isPending) ||
    paginationMismatch ||
    (!data && isFetching && dispatches.length === 0);
  const showEmpty = !showSkeleton && !isFetching && isTrulyEmpty;
  const showRefetchOverlay = Boolean(
    isFetching && isPlaceholderData && !showSkeleton && dispatches.length > 0,
  );

  const courierTabs = courierPartners.filter(
    (partner) => partner.key !== 'ALL' && partner.key !== 'UNASSIGNED' && partner.count > 0,
  );

  const returnToQuery = (() => {
    const params = new URLSearchParams();
    if (activeCourier !== 'ALL') params.set('courier', activeCourier);
    if (debouncedSearch) params.set('q', debouncedSearch);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Dispatches</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Ready-to-ship orders by courier partner. Shipped orders are removed from this list.
        </p>
      </div>

      <AdminTableCard>
        <div className="space-y-4 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search order, customer, AWB, tracking, courier..."
            searchValue={search}
            onSearchChange={onSearchChange}
            searchMaxWidth="max-w-md"
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
          {courierTabs.length > 0 && (
            <FilterTabs
              value={activeCourier}
              onChange={(value) =>
                setActiveCourier(activeCourier === value ? 'ALL' : value)
              }
              options={courierTabs.map((partner) => ({
                value: partner.key,
                label: partner.label,
                count: partner.count,
              }))}
            />
          )}
        </div>

        <div className="relative">
          <AdminTableLoadingOverlay
            show={showRefetchOverlay}
            label="Loading dispatches…"
          />
          <AdminTable>
            <AdminTableHead>
              <AdminTh>Order ID</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Courier Partner</AdminTh>
              <AdminTh>Method</AdminTh>
              <AdminTh>AWB / Tracking</AdminTh>
              <AdminTh>Order Status</AdminTh>
              <AdminTh>Ready Since</AdminTh>
              <AdminTh>Actions</AdminTh>
            </AdminTableHead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {showSkeleton ? (
                <AdminTableSkeleton rows={8} cols={8} />
              ) : showEmpty ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[#94a3b8]">
                    {activeCourier === 'ALL'
                      ? 'No orders ready to ship'
                      : `No ready-to-ship orders for ${
                          courierTabs.find((p) => p.key === activeCourier)?.label ?? 'this courier'
                        }`}
                  </td>
                </tr>
              ) : (
                dispatches.map((dispatch) => (
                  <tr key={dispatch.shippingId} className="transition-colors hover:bg-[#f8fafc]">
                    <AdminTd className="font-mono text-xs font-bold text-[#0f172a]">
                      {formatShortOrderNumber(dispatch.orderNumber)}
                    </AdminTd>
                    <AdminTd>
                      <div>
                        <p className="font-medium text-[#0f172a]">
                          {formatCustomerName(dispatch.customerName)}
                        </p>
                        <p className="text-xs text-[#94a3b8]">{dispatch.customerPhone}</p>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      {dispatch.courierPartner ? (
                        <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#0f172a]">
                          {dispatch.courierPartner}
                        </span>
                      ) : (
                        <StatusBadge variant="pending">Pending Courier</StatusBadge>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <StatusBadge variant={dispatch.method === 'MANUAL' ? 'neutral' : 'active'}>
                        {dispatch.method === 'MANUAL' ? 'Manual' : 'Shiprocket'}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>
                      <div className="space-y-0.5">
                        {dispatch.awbCode && (
                          <p className="font-mono text-xs text-[#0f172a]">AWB: {dispatch.awbCode}</p>
                        )}
                        {dispatch.trackingNumber && (
                          <p className="font-mono text-xs text-[#64748b]">{dispatch.trackingNumber}</p>
                        )}
                        {!dispatch.awbCode && !dispatch.trackingNumber && dispatch.shiprocketShipmentId && (
                          <p className="text-xs text-[#94a3b8]">
                            Shipment #{dispatch.shiprocketShipmentId}
                          </p>
                        )}
                        {!dispatch.awbCode && !dispatch.trackingNumber && !dispatch.shiprocketShipmentId && (
                          <span className="text-xs text-[#94a3b8]">—</span>
                        )}
                        {dispatch.trackingUrl && (
                          <a
                            href={dispatch.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs font-medium text-[#0f172a] underline"
                          >
                            Track
                          </a>
                        )}
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <StatusBadge variant={orderStatusVariant(dispatch.orderStatus)}>
                        {getOrderStatusLabel(dispatch.orderStatus)}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>
                      <div>
                        <p className="text-sm text-[#0f172a]">{formatDate(dispatch.dispatchedAt)}</p>
                        <p className="text-xs text-[#94a3b8]">{formatTime(dispatch.dispatchedAt)}</p>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <ViewDetailsButton
                        href={`/admin/orders/${dispatch.id}?returnTo=${encodeURIComponent(
                          `/admin/dispatches${returnToQuery}`,
                        )}`}
                        prefetchOrderId={dispatch.id}
                        label="Order Details"
                      />
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </div>
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
