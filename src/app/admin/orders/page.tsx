'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { FileText, Receipt, Truck, CheckCircle, Package, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { refreshAdminOrderLists } from '@/lib/refresh-admin-order-lists';
import { adminOrderService } from '@/services/admin.service';
import { formatPrice, formatDate, formatTime, getOrderStatusLabel, formatCustomerName, formatShortOrderNumber } from '@/lib/utils';
import { getDeliveryTypeLabel, resolveDeliveryType } from '@/lib/delivery-type';
import { printOrderReport, printInvoices, openShiprocketLabels } from '@/lib/order-print';
import type { Order, ShippingAddress } from '@/types';
import { StatusBadge, orderStatusVariant } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminTableSkeleton } from '@/components/admin/loading-skeletons';
import { AdminTableLoadingOverlay } from '@/components/admin/admin-table-loading-overlay';
import { CreateShipmentDialog } from '@/components/admin/create-shipment-dialog';
import {
  DataTableToolbar,
  FilterTabs,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import { useClampPaginationPage, isPaginationMismatch } from '@/lib/use-clamp-pagination-page';
import { getApiErrorMessage } from '@/lib/api-error';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

const STATUS_TABS = [
  'ALL', 'PLACED', 'PAYMENT_PENDING', 'CONFIRMED', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT',
  'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED', 'RTO', 'REFUNDED',
] as const;

const DELIVERY_TYPE_FILTERS = ['ALL', 'INDIA', 'QUICK', 'INTERNATIONAL'] as const;

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [activeTab, setStatus] = useAdminEnumParam('status', STATUS_TABS, 'ALL');
  const [deliveryType, setDeliveryType] = useAdminEnumParam(
    'deliveryType',
    DELIVERY_TYPE_FILTERS,
    'ALL',
  );
  const { dateRange, onDateRangeChange, dateParams } = useAdminDateRangeParam();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();

  useResetPageOnFilterChange(
    resetPage,
    activeTab,
    deliveryType,
    debouncedSearch,
    dateParams.startDate,
    dateParams.endDate,
  );

  const setActiveTab = useCallback((tab: string) => {
    setSelectedOrders(new Set());
    setStatus(tab as (typeof STATUS_TABS)[number]);
  }, [setStatus]);

  const onDeliveryTypeChange = useCallback(
    (value: string) => {
      setSelectedOrders(new Set());
      setDeliveryType(value as (typeof DELIVERY_TYPE_FILTERS)[number]);
    },
    [setDeliveryType],
  );

  const { data: ordersResult, isPending, isFetching, isPlaceholderData, isError, error, refetch } = useQuery({
    queryKey: ['admin-orders', activeTab, deliveryType, debouncedSearch, page, pageSize, dateParams],
    queryFn: ({ signal }) =>
      adminOrderService.list(
        {
          ...(activeTab !== 'ALL' && { status: activeTab }),
          ...(deliveryType !== 'ALL' && { deliveryType }),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...dateParams,
          page: String(page),
          limit: String(pageSize),
        },
        signal,
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const orders = ordersResult?.data ?? [];
  const meta = ordersResult?.meta;
  const loadError =
    isError &&
    !(
      (error as { code?: string; name?: string } | null)?.code === 'ERR_CANCELED' ||
      (error as { name?: string } | null)?.name === 'CanceledError'
    );

  useClampPaginationPage(meta, page, setPage);

  const paginationMismatch = isPaginationMismatch(meta, orders.length, page);
  const isTrulyEmpty = meta != null ? meta.total === 0 : !isPending && !isFetching && orders.length === 0;
  // Keep cached rows visible when returning from detail — never blank the table for a background refetch
  const showSkeleton =
    (!ordersResult && isPending) ||
    paginationMismatch ||
    (!ordersResult && isFetching && orders.length === 0);
  const showEmpty = !showSkeleton && !isFetching && !loadError && isTrulyEmpty;
  /** Overlay only while switching tab/search (placeholder data), not on back-navigation refetch */
  const showRefetchOverlay = Boolean(isFetching && isPlaceholderData && !showSkeleton && orders.length > 0);

  const filteredOrders = orders;
  const selectedCount = selectedOrders.size;

  const ordersListReturnTo = useMemo(() => {
    const params = new URLSearchParams({
      ...(activeTab !== 'ALL' ? { status: activeTab } : {}),
      ...(deliveryType !== 'ALL' ? { deliveryType } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(dateParams.startDate ? { startDate: dateParams.startDate } : {}),
      ...(dateParams.endDate ? { endDate: dateParams.endDate } : {}),
      ...(page > 1 ? { page: String(page) } : {}),
      ...(pageSize !== DEFAULT_PAGE_SIZE ? { limit: String(pageSize) } : {}),
    });
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : '/admin/orders';
  }, [
    activeTab,
    deliveryType,
    debouncedSearch,
    dateParams.startDate,
    dateParams.endDate,
    page,
    pageSize,
  ]);

  const selectedPlacedIds = useMemo(
    () =>
      Array.from(selectedOrders).filter((id) =>
        filteredOrders.some((o: Order) => o.id === id && o.status === 'PLACED'),
      ),
    [selectedOrders, filteredOrders],
  );

  const selectedConfirmedIds = useMemo(
    () =>
      Array.from(selectedOrders).filter((id) =>
        filteredOrders.some((o: Order) => o.id === id && o.status === 'CONFIRMED'),
      ),
    [selectedOrders, filteredOrders],
  );

  const selectedReadyToShipIds = useMemo(
    () =>
      Array.from(selectedOrders).filter((id) =>
        filteredOrders.some((o: Order) => o.id === id && o.status === 'READY_TO_SHIP'),
      ),
    [selectedOrders, filteredOrders],
  );

  const selectedRtoIds = useMemo(
    () =>
      Array.from(selectedOrders).filter((id) =>
        filteredOrders.some((o: Order) => o.id === id && o.status === 'RTO'),
      ),
    [selectedOrders, filteredOrders],
  );

  const selectedCreateShipmentIds = useMemo(() => {
    if (activeTab === 'CONFIRMED') return selectedConfirmedIds;
    if (activeTab === 'RTO') return selectedRtoIds;
    return [];
  }, [activeTab, selectedConfirmedIds, selectedRtoIds]);

  const canCreateShipment = deliveryType !== 'ALL' && selectedCreateShipmentIds.length > 0;

  const shipmentInitialMode = useMemo((): 'domestic' | 'international' | 'quick' => {
    if (deliveryType === 'QUICK') return 'quick';
    if (deliveryType === 'INTERNATIONAL') return 'international';
    return 'domestic';
  }, [deliveryType]);

  const tabAction = useMemo(() => {
    switch (activeTab) {
      case 'PLACED':
        return {
          label: 'Confirm',
          icon: CheckCircle,
          count: selectedPlacedIds.length,
          enabled: selectedPlacedIds.length > 0,
        };
      case 'CONFIRMED':
      case 'RTO':
        return {
          label: selectedCreateShipmentIds.length > 1 ? 'Create Shipments' : 'Create Shipment',
          icon: Package,
          count: selectedCreateShipmentIds.length,
          enabled: canCreateShipment,
        };
      case 'READY_TO_SHIP':
        return {
          label: 'Shiprocket Label',
          icon: Truck,
          count: selectedReadyToShipIds.length,
          enabled: selectedReadyToShipIds.length > 0,
        };
      default:
        return null;
    }
  }, [
    activeTab,
    selectedPlacedIds.length,
    selectedCreateShipmentIds.length,
    selectedReadyToShipIds.length,
    canCreateShipment,
  ]);

  const TabActionIcon = tabAction?.icon;

  const handlePrintOrders = async () => {
    const ids = Array.from(selectedOrders);
    if (ids.length === 0) { toast.error('Select orders first'); return; }
    toast.loading('Generating report...');
    await printOrderReport(ids, activeTab);
    toast.dismiss();
  };

  const handlePrintInvoices = async () => {
    const ids = Array.from(selectedOrders);
    if (ids.length === 0) { toast.error('Select orders first'); return; }
    const toastId = toast.loading('Generating invoices...');
    await printInvoices(ids);
    toast.dismiss(toastId);
  };

  const handleConfirmOrders = async () => {
    if (selectedPlacedIds.length === 0) {
      toast.error('Select placed orders to confirm');
      return;
    }
    const toastId = toast.loading(`Confirming ${selectedPlacedIds.length} order(s)...`);
    try {
      const result = await adminOrderService.bulkUpdateStatus(selectedPlacedIds, 'CONFIRMED');
      toast.dismiss(toastId);
      if (result.successCount > 0) {
        toast.success(`${result.successCount} order(s) confirmed`);
        setSelectedOrders(new Set());
        void refreshAdminOrderLists(queryClient);
        // Follow confirmed orders to the Confirmed tab (don't leave an empty Placed list)
        setActiveTab('CONFIRMED');
      }
      if (result.failedCount > 0) {
        const lastError = result.failed[0]?.message;
        toast.error(
          result.failedCount === selectedPlacedIds.length && lastError
            ? lastError
            : `${result.failedCount} order(s) could not be confirmed`,
        );
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, 'Could not confirm orders'));
    }
  };

  const openCreateShipmentDialog = () => {
    if (deliveryType === 'ALL') {
      toast.error('Select India, Instant, or International first — Create Shipment is not allowed on All');
      return;
    }
    if (selectedCreateShipmentIds.length === 0) {
      toast.error(
        activeTab === 'RTO'
          ? 'Select RTO order(s) to create shipment'
          : 'Select confirmed order(s) to create shipment',
      );
      return;
    }
    setShipmentDialogOpen(true);
  };

  const handlePrintShipmentLabels = async () => {
    if (selectedReadyToShipIds.length === 0) {
      toast.error('Select orders with "Ready to Ship" status');
      return;
    }
    const toastId = toast.loading('Opening Shiprocket labels...');
    try {
      const result = await openShiprocketLabels(selectedReadyToShipIds);
      toast.dismiss(toastId);
      if (result.failed > 0) {
        toast.success(
          `Opened ${result.opened} Shiprocket label(s). ${result.failed} skipped (no AWB).`,
        );
      } else {
        toast.success(`Opened ${result.opened} Shiprocket label(s)`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, 'Could not open Shiprocket labels'));
    }
  };

  const handleCancelShipments = async () => {
    if (selectedReadyToShipIds.length === 0) {
      toast.error('Select Ready to Ship order(s) to cancel shipment');
      return;
    }
    const confirmed = window.confirm(
      selectedReadyToShipIds.length === 1
        ? 'Cancel this shipment? The order will return to Confirmed so you can create shipment again.'
        : `Cancel shipment for ${selectedReadyToShipIds.length} orders? They will return to Confirmed so you can create shipment again.`,
    );
    if (!confirmed) return;

    const toastId = toast.loading(
      `Cancelling ${selectedReadyToShipIds.length} shipment(s)...`,
    );
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (const orderId of selectedReadyToShipIds) {
      try {
        await adminOrderService.cancelShiprocketShipment(orderId);
        successCount += 1;
      } catch (error) {
        failedCount += 1;
        lastError = getApiErrorMessage(error, 'Could not cancel shipment');
      }
    }

    toast.dismiss(toastId);
    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? 'Shipment cancelled — order moved to Confirmed'
          : `${successCount} shipment(s) cancelled — orders moved to Confirmed`,
      );
      setSelectedOrders(new Set());
      void refreshAdminOrderLists(queryClient);
      setActiveTab('CONFIRMED');
    }
    if (failedCount > 0) {
      toast.error(
        failedCount === selectedReadyToShipIds.length && lastError
          ? lastError
          : `${failedCount} shipment(s) could not be cancelled`,
      );
    }
  };

  const handleTabAction = async () => {
    if (activeTab === 'PLACED') await handleConfirmOrders();
    else if (activeTab === 'CONFIRMED' || activeTab === 'RTO') openCreateShipmentDialog();
    else if (activeTab === 'READY_TO_SHIP') await handlePrintShipmentLabels();
  };

  return (
    <div className="space-y-6">
      <AdminTableCard>
        <div className="space-y-4 border-b border-[#e2e8f0] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DataTableToolbar
              searchPlaceholder="Search orders..."
              searchValue={search}
              onSearchChange={onSearchChange}
              searchMaxWidth="max-w-xs"
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
            >
              <label className="sr-only" htmlFor="orders-delivery-type">
                Delivery type
              </label>
              <select
                id="orders-delivery-type"
                value={deliveryType}
                onChange={(e) => onDeliveryTypeChange(e.target.value)}
                className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-medium text-[#0f172a] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
              >
                <option value="ALL">All types</option>
                <option value="INDIA">India</option>
                <option value="QUICK">Instant</option>
                <option value="INTERNATIONAL">International</option>
              </select>
            </DataTableToolbar>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCount > 0 && (
                <span className="rounded-full bg-[#0f172a] px-3 py-1 text-xs font-semibold text-white">
                  {selectedCount} selected
                </span>
              )}
              <button
                type="button"
                onClick={handlePrintOrders}
                disabled={selectedCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="h-3.5 w-3.5" />
                Orders
              </button>
              <button
                type="button"
                onClick={handlePrintInvoices}
                disabled={selectedCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Receipt className="h-3.5 w-3.5" />
                Invoice
              </button>
              {tabAction && TabActionIcon && (
                <button
                  type="button"
                  onClick={handleTabAction}
                  disabled={!tabAction.enabled}
                  title={
                    (activeTab === 'CONFIRMED' || activeTab === 'RTO') && deliveryType === 'ALL'
                      ? 'Choose India, Instant, or International to create shipment'
                      : undefined
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TabActionIcon className="h-3.5 w-3.5" />
                  {tabAction.label}
                </button>
              )}
              {activeTab === 'READY_TO_SHIP' && (
                <button
                  type="button"
                  onClick={() => void handleCancelShipments()}
                  disabled={selectedReadyToShipIds.length === 0}
                  title="Cancel selected shipments and return orders to Confirmed"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-xs font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel Shipment
                </button>
              )}
            </div>
          </div>
          <FilterTabs
            value={activeTab}
            onChange={setActiveTab}
            options={STATUS_TABS.map((tab) => ({
              value: tab,
              label: tab === 'ALL' ? 'All' : getOrderStatusLabel(tab),
            }))}
          />
        </div>

        <div className="relative">
          <AdminTableLoadingOverlay
            show={showRefetchOverlay}
            label="Loading orders…"
          />
          <AdminTable>
            <AdminTableHead>
              <AdminTh className="w-10">
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders(new Set(filteredOrders.map((o: Order) => o.id)));
                    } else {
                      setSelectedOrders(new Set());
                    }
                  }}
                  className="h-4 w-4 rounded border-[#cbd5e1]"
                />
              </AdminTh>
              <AdminTh>Order ID</AdminTh>
              <AdminTh>Customer</AdminTh>
              <AdminTh>Phone</AdminTh>
              <AdminTh>Delivery</AdminTh>
              <AdminTh>Status</AdminTh>
              <AdminTh>Total</AdminTh>
              <AdminTh>Received</AdminTh>
              <AdminTh>Actions</AdminTh>
            </AdminTableHead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {showSkeleton ? (
                <AdminTableSkeleton rows={8} cols={9} />
              ) : loadError ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <p className="text-[#94a3b8]">
                      {getApiErrorMessage(error, 'Could not load orders.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="mt-2 text-sm font-semibold text-[#0f172a] underline"
                    >
                      Try again
                    </button>
                  </td>
                </tr>
              ) : showEmpty ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Package className="h-10 w-10 text-[#cbd5e1]" strokeWidth={1.5} />
                      <p className="mt-3 text-sm font-medium text-[#64748b]">
                        {activeTab === 'ALL'
                          ? 'No orders yet'
                          : `No ${getOrderStatusLabel(activeTab).toLowerCase()} orders`}
                        {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
                      </p>
                      {(activeTab !== 'ALL' || debouncedSearch) && (
                        <p className="mt-1 text-xs text-[#94a3b8]">
                          Try a different status tab or clear your search.
                        </p>
                      )}
                      {(activeTab !== 'ALL' || debouncedSearch) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setActiveTab('ALL');
                          }}
                          className="mt-4 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc]"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <AdminTableSkeleton rows={5} cols={9} />
              ) : (
                filteredOrders.map((order: Order) => (
                  <tr key={order.id} className="transition-colors hover:bg-[#f8fafc]">
                    <AdminTd className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={(e) => {
                          setSelectedOrders((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(order.id);
                            else next.delete(order.id);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-[#cbd5e1]"
                      />
                    </AdminTd>
                    <AdminTd className="font-mono text-xs font-bold text-[#0f172a]">
                      {formatShortOrderNumber(order.orderNumber)}
                    </AdminTd>
                    <AdminTd>
                      <span className="font-medium text-[#0f172a]">{formatCustomerName(order.customerName)}</span>
                    </AdminTd>
                    <AdminTd>{order.customerPhone}</AdminTd>
                    <AdminTd>
                      <StatusBadge
                        variant={
                          resolveDeliveryType(order.shippingAddress as ShippingAddress) === 'QUICK'
                            ? 'active'
                            : resolveDeliveryType(order.shippingAddress as ShippingAddress) ===
                                'INTERNATIONAL'
                              ? 'neutral'
                              : 'inactive'
                        }
                      >
                        {getDeliveryTypeLabel(
                          resolveDeliveryType(order.shippingAddress as ShippingAddress),
                        )}
                      </StatusBadge>
                    </AdminTd>
                    <AdminTd>
                      <div>
                        <StatusBadge variant={orderStatusVariant(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </StatusBadge>
                        {order.updatedAt && (
                          <p className="mt-1 text-[10px] text-[#94a3b8]">
                            {formatDate(order.updatedAt)} {formatTime(order.updatedAt)}
                          </p>
                        )}
                      </div>
                    </AdminTd>
                    <AdminTd className="font-semibold text-[#0f172a]">
                      {formatPrice(Number(order.grandTotal))}
                    </AdminTd>
                    <AdminTd>
                      <div>
                        <p className="text-sm text-[#0f172a]">{formatDate(order.createdAt)}</p>
                        <p className="text-xs text-[#94a3b8]">{formatTime(order.createdAt)}</p>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <ViewDetailsButton
                        href={`/admin/orders/${order.id}?returnTo=${encodeURIComponent(ordersListReturnTo)}`}
                        prefetchOrderId={order.id}
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

      <CreateShipmentDialog
        key={`ship-${shipmentInitialMode}-${selectedCreateShipmentIds.join(',')}`}
        open={shipmentDialogOpen}
        onOpenChange={setShipmentDialogOpen}
        orderIds={selectedCreateShipmentIds}
        initialMode={shipmentInitialMode}
        lockMode
        onSuccess={() => {
          setSelectedOrders(new Set());
          void refreshAdminOrderLists(queryClient);
          // Follow the shipment to Ready to Ship (don't leave an empty Confirmed/RTO list)
          setActiveTab('READY_TO_SHIP');
        }}
      />
    </div>
  );
}
