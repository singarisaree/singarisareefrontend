'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { adminDashboardService, adminProductService } from '@/services/admin.service';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { AdminTableSkeleton, StatCardSkeleton } from '@/components/admin/loading-skeletons';
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
import { Warehouse, AlertTriangle, CheckCircle, PackageX, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { refreshStorefrontAfterProductChange } from '@/lib/refresh-storefront';

const STOCK_VALUES = ['all', 'low', 'out'] as const;

export default function AdminStockPage() {
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [stock, setStock] = useAdminEnumParam('stock', STOCK_VALUES, 'all');
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const queryClient = useQueryClient();

  useResetPageOnFilterChange(resetPage, debouncedSearch, stock, dateParams.startDate, dateParams.endDate);

  const { data: inventoryResult, isLoading } = useQuery({
    queryKey: ['admin-inventory', debouncedSearch, stock, page, pageSize, dateParams],
    queryFn: ({ signal }) =>
      adminDashboardService.listInventory({
        page: String(page),
        limit: String(pageSize),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(stock !== 'all' && { stock }),
        ...dateParams,
      }, signal),
    placeholderData: keepPreviousData,
  });

  const inventory = inventoryResult?.data ?? [];
  const meta = inventoryResult?.meta;

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      adminProductService.updateStock(id, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void refreshStorefrontAfterProductChange();
      toast.success('Stock updated');
      setEditingId(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update stock')),
  });

  const startEdit = (id: string, currentQty: number) => {
    setEditingId(id);
    setEditQty(String(currentQty));
  };

  const saveEdit = () => {
    const qty = parseInt(editQty, 10);
    if (editingId && !isNaN(qty) && qty >= 0) {
      updateMutation.mutate({ id: editingId, quantity: qty });
    }
  };

  const uniqueProducts = new Set(inventory.map((item) => item.product.id)).size;
  const lowStock = inventory.filter((item) => item.quantity - item.reserved <= item.lowStockAlert).length;
  const outOfStock = inventory.filter((item) => item.quantity - item.reserved <= 0).length;
  const hasFilters = Boolean(debouncedSearch) || stock !== 'all' || hasDateRange;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Products" value={meta?.total ?? uniqueProducts} subtext={`${inventory.length} variants on this page`} icon={Warehouse} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="In Stock" value={inventory.length - outOfStock} subtext="on this page" icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="Low Stock" value={lowStock} subtext="on this page" icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
            <StatCard label="Out of Stock" value={outOfStock} subtext="on this page" icon={PackageX} iconBg="bg-red-50" iconColor="text-red-600" />
          </>
        )}
      </div>

      <AdminTableCard>
        <div className="space-y-3 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search by product or SKU..."
            searchValue={search}
            onSearchChange={onSearchChange}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          >
            <ClearFilters
              visible={hasFilters}
              onClear={() => {
                setSearch('');
                setStock('all');
                clearDateRange();
              }}
            />
          </DataTableToolbar>
          <FilterTabs
            value={stock}
            onChange={(value) => setStock(value as (typeof STOCK_VALUES)[number])}
            options={[
              { value: 'all', label: 'All' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
          />
        </div>
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Product</AdminTh>
            <AdminTh>SKU</AdminTh>
            <AdminTh>Color</AdminTh>
            <AdminTh>Qty</AdminTh>
            <AdminTh>Reserved</AdminTh>
            <AdminTh>Available</AdminTh>
            <AdminTh>Status</AdminTh>
          </AdminTableHead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              <AdminTableSkeleton rows={8} cols={7} />
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[#94a3b8]">No inventory found</td>
              </tr>
            ) : (
              inventory.map((item) => {
                const quantity = Number(item.quantity) || 0;
                const reserved = Number(item.reserved) || 0;
                const available = quantity - reserved;
                const isLow = available <= item.lowStockAlert && available > 0;
                const isOut = available <= 0;
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-[#f8fafc]">
                    <AdminTd>
                      <div>
                        <p className="font-medium text-[#0f172a]">{item.product.name}</p>
                        {item.product.category?.name && (
                          <p className="text-xs text-[#64748b]">{item.product.category.name}</p>
                        )}
                      </div>
                    </AdminTd>
                    <AdminTd className="font-mono text-xs text-[#64748b]">{item.product.sku}</AdminTd>
                    <AdminTd>{item.productColor.name}</AdminTd>
                    <AdminTd>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editQty}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, '');
                              setEditQty(v);
                            }}
                            className="w-16 rounded border border-[#e2e8f0] px-2 py-1 text-center text-sm focus:border-[#0f172a] focus:outline-none"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="rounded-md bg-[#0f172a] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#1e293b]"
                          >
                            {updateMutation.isPending ? '...' : 'Update'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-xs text-[#64748b] hover:text-[#0f172a]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#0f172a]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => startEdit(item.id, quantity)}
                            className="rounded p-0.5 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                            title="Edit stock"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </AdminTd>
                    <AdminTd>{reserved}</AdminTd>
                    <AdminTd className="font-semibold">{available}</AdminTd>
                    <AdminTd>
                      <StatusBadge variant={isOut ? 'danger' : isLow ? 'pending' : 'active'}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </StatusBadge>
                    </AdminTd>
                  </tr>
                );
              })
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
