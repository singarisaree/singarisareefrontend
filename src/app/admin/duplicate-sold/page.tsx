'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  adminCategoryService,
  adminProductService,
} from '@/services/admin.service';
import { refreshStorefrontAfterProductChange } from '@/lib/refresh-storefront';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminStringParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import type { Product } from '@/types';
import { AdminTableSkeleton } from '@/components/admin/loading-skeletons';
import { AdminPagination } from '@/components/admin/admin-pagination';
import {
  DataTableToolbar,
  FilterSelect,
  ClearFilters,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';

export default function AdminDuplicateSoldPage() {
  const queryClient = useQueryClient();
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [categoryFilter, setCategoryFilter] = useAdminStringParam('category');
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useResetPageOnFilterChange(resetPage, debouncedSearch, categoryFilter, dateParams.startDate, dateParams.endDate);

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: productsResult, isLoading } = useQuery({
    queryKey: ['admin-products', 'duplicate-sold', debouncedSearch, categoryFilter, page, pageSize, dateParams],
    queryFn: () =>
      adminProductService.list({
        page: String(page),
        limit: String(pageSize),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...dateParams,
      }),
    placeholderData: keepPreviousData,
  });

  const products = productsResult?.data ?? [];
  const meta = productsResult?.meta;
  const hasFilters = Boolean(debouncedSearch) || Boolean(categoryFilter) || hasDateRange;

  const updateMutation = useMutation({
    mutationFn: ({ id, baseSoldCount }: { id: string; baseSoldCount: number }) =>
      adminProductService.updateDuplicateSold(id, baseSoldCount),
    onSuccess: async (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      const saved = products.find((p: Product) => p.id === id);
      void refreshStorefrontAfterProductChange(saved?.slug);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Duplicate sold updated');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update duplicate sold')),
    onSettled: () => setSavingId(null),
  });

  const getDraftValue = (product: Product) =>
    drafts[product.id] ?? String(product.baseSoldCount ?? 0);

  const hasChanges = (product: Product) => {
    const draft = drafts[product.id];
    return draft !== undefined && Number(draft) !== (product.baseSoldCount ?? 0);
  };

  const handleSave = (product: Product) => {
    const raw = drafts[product.id] ?? String(product.baseSoldCount ?? 0);
    const value = Number(raw);

    if (!Number.isInteger(value) || value < 0) {
      toast.error('Enter a valid whole number (0 or more)');
      return;
    }

    setSavingId(product.id);
    updateMutation.mutate({ id: product.id, baseSoldCount: value });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Copy className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#0f172a]">Duplicate sold boost</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Storefront marketing only: shows{' '}
              <span className="font-medium text-[#0f172a]">duplicate sold + actual sold</span>.
              This never affects revenue, orders, stock, or any admin financial totals. Actual sold
              comes only from real orders.
            </p>
          </div>
        </div>
      </div>

      <AdminTableCard>
        <div className="border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search by product, SKU, or category..."
            searchValue={search}
            onSearchChange={onSearchChange}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          >
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All categories"
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
            />
            <ClearFilters
              visible={hasFilters}
              onClear={() => {
                setSearch('');
                setCategoryFilter('');
                clearDateRange();
              }}
            />
          </DataTableToolbar>
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTh>Product</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Actual Sold</AdminTh>
            <AdminTh>Duplicate Sold</AdminTh>
            <AdminTh>Storefront Display</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              <AdminTableSkeleton rows={8} cols={6} />
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#64748b]">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product: Product) => {
                const soldCount = product.soldCount ?? 0;
                const draftRaw = getDraftValue(product);
                const changed = hasChanges(product);
                const draftNum = Number(draftRaw);
                const displayCount = changed && Number.isFinite(draftNum)
                  ? soldCount + draftNum
                  : (product.displaySoldCount ?? soldCount + (product.baseSoldCount ?? 0));
                const isSaving = savingId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-[#f8fafc]">
                    <AdminTd>
                      <p className="font-medium text-[#0f172a]">{product.name}</p>
                      <p className="font-mono text-xs text-[#94a3b8]">{product.sku}</p>
                    </AdminTd>
                    <AdminTd>{product.category?.name || '—'}</AdminTd>
                    <AdminTd className="font-medium">{soldCount}</AdminTd>
                    <AdminTd>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={draftRaw}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        className="h-9 w-28 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                      />
                    </AdminTd>
                    <AdminTd className="text-[#64748b]">{displayCount}</AdminTd>
                    <AdminTd>
                      <button
                        type="button"
                        disabled={!changed || isSaving}
                        onClick={() => handleSave(product)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Save
                      </button>
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
