'use client';

import { useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Link from 'next/link';
import { adminReturnRequestService } from '@/services/admin.service';
import {
  formatDate,
  formatShortOrderNumber,
  getReturnRequestStatusLabel,
} from '@/lib/utils';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import { StatusBadge, returnRequestStatusVariant } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminTableSkeleton } from '@/components/admin/loading-skeletons';
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

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'OUT_FOR_PICKUP', label: 'Out for Pickup' },
  { key: 'PICKUP_CANCELLED', label: 'Pickup Cancelled' },
  { key: 'PICKED_UP', label: 'Pickuped' },
  { key: 'RETURNED', label: 'Returned' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

export default function AdminReturnRequestsPage() {
  const { search, debouncedSearch, onSearchChange } = useAdminSearchParam();
  const [activeStatus, setStatus] = useAdminEnumParam(
    'status',
    ['ALL', 'REQUESTED', 'ACCEPTED', 'OUT_FOR_PICKUP', 'PICKUP_CANCELLED', 'PICKED_UP', 'RETURNED', 'REJECTED'] as const,
    'ALL',
  );
  const { dateRange, onDateRangeChange, dateParams } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();

  useResetPageOnFilterChange(resetPage, activeStatus, debouncedSearch, dateParams.startDate, dateParams.endDate);

  const setActiveStatus = useCallback(
    (status: string) => {
      setStatus(status as typeof activeStatus);
    },
    [setStatus],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-return-requests', activeStatus, debouncedSearch, page, pageSize, dateParams],
    queryFn: () =>
      adminReturnRequestService.getAll({
        page,
        limit: pageSize,
        ...(activeStatus !== 'ALL' && { status: activeStatus }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...dateParams,
      }),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const requests = data?.data ?? [];
  const meta = data?.meta;
  const showSkeleton = isLoading && !isFetching;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Return Requests</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Review customer return requests and update pickup progress.
        </p>
      </div>

      <AdminTableCard>
        <div className="space-y-4 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search order, phone, reason..."
            searchValue={search}
            onSearchChange={onSearchChange}
            searchMaxWidth="max-w-md"
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
          <FilterTabs
            value={activeStatus}
            onChange={setActiveStatus}
            options={STATUS_TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
            }))}
          />
        </div>

        {showSkeleton ? (
          <AdminTableSkeleton cols={7} rows={8} />
        ) : (
          <AdminTable>
            <AdminTableHead>
              <AdminTh>Order ID</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Items</AdminTh>
              <AdminTh>Reason</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Requested</AdminTh>
              <AdminTh className="text-right">Action</AdminTh>
            </AdminTableHead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#64748b]">
                    No return requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <AdminTd>
                      {request.order ? (
                        <Link
                          href={`/admin/orders/${request.order.id}`}
                          className="font-mono text-xs font-bold text-[#0f172a] hover:underline"
                        >
                          {formatShortOrderNumber(request.order.orderNumber)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </AdminTd>
                    <AdminTd>
                      <p className="font-medium text-[#0f172a]">{request.customerPhone}</p>
                      {request.order?.customerName && (
                        <p className="text-xs text-[#64748b]">{request.order.customerName}</p>
                      )}
                    </AdminTd>
                    <AdminTd>
                      {request.items && request.items.length > 0 ? (
                        <div className="space-y-0.5 text-xs text-[#64748b]">
                          {request.items.map((item) => (
                            <p key={item.id}>
                              {item.orderItem?.productName ?? 'Item'}
                              {item.orderItem?.colorName ? ` · ${item.orderItem.colorName}` : ''}
                              {' × '}
                              {item.quantity}
                            </p>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </AdminTd>
                    <AdminTd className="max-w-xs truncate">{request.reason}</AdminTd>
                    <AdminTd>
                      <StatusBadge variant={returnRequestStatusVariant(request.status)}>
                        {getReturnRequestStatusLabel(request.status)}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>{formatDate(request.createdAt)}</AdminTd>
                    <AdminTd className="text-right">
                      <ViewDetailsButton
                        href={`/admin/return-requests/${request.id}`}
                        label="Return Details"
                      />
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        )}

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
