'use client';

import Image from 'next/image';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Package, CheckCircle, XCircle, Boxes } from 'lucide-react';
import { adminCategoryService, adminProductService } from '@/services/admin.service';
import { formatPrice, formatDate, formatTime } from '@/lib/utils';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminStringParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';
import type { Product } from '@/types';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminTableSkeleton, StatCardSkeleton } from '@/components/admin/loading-skeletons';
import { AdminPagination } from '@/components/admin/admin-pagination';
import {
  DataTableToolbar,
  FilterTabs,
  FilterSelect,
  ClearFilters,
  AdminTable,
  AdminTableCard,
  AdminTableHead,
  AdminTh,
  AdminTd,
} from '@/components/admin/data-table';

const STATUS_VALUES = ['all', 'active', 'inactive'] as const;

export default function AdminProductsPage() {
  const router = useRouter();
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [status, setStatus] = useAdminEnumParam('status', STATUS_VALUES, 'all');
  const [category, setCategory] = useAdminStringParam('category');
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();

  useResetPageOnFilterChange(resetPage, debouncedSearch, status, category, dateParams.startDate, dateParams.endDate);

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: productsResult, isLoading } = useQuery({
    queryKey: ['admin-products', debouncedSearch, status, category, page, pageSize, dateParams],
    queryFn: ({ signal }) =>
      adminProductService.list({
        page: String(page),
        limit: String(pageSize),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status === 'active' && { isActive: 'true' }),
        ...(status === 'inactive' && { isActive: 'false' }),
        ...(category && { categoryId: category }),
        ...dateParams,
      }, signal),
    placeholderData: keepPreviousData,
  });

  const products = productsResult?.data ?? [];
  const meta = productsResult?.meta;
  const liveOnStore = products.filter((p: Product) => p.isActive).length;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all' || Boolean(category) || hasDateRange;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Products" value={meta?.total ?? products.length} icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Live on Store" value={liveOnStore} subtext={products.length ? `${Math.round((liveOnStore / products.length) * 100)}% on this page` : undefined} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="Hidden from Store" value={products.length - liveOnStore} icon={XCircle} iconBg="bg-slate-100" iconColor="text-slate-500" />
            <StatCard label="Low Stock" value={products.filter((p: Product) => p.totalStock <= 5).length} icon={Boxes} iconBg="bg-amber-50" iconColor="text-amber-600" />
          </>
        )}
      </div>

      <AdminTableCard>
        <div className="space-y-3 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search products by name, SKU..."
            searchValue={search}
            onSearchChange={onSearchChange}
            addLabel="Add Product"
            onAdd={() => router.push('/admin/products/new')}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          >
            <FilterSelect
              value={category}
              onChange={setCategory}
              placeholder="All categories"
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
            />
            <ClearFilters
              visible={hasFilters}
              onClear={() => {
                setSearch('');
                setStatus('all');
                setCategory('');
                clearDateRange();
              }}
            />
          </DataTableToolbar>
          <FilterTabs
            value={status}
            onChange={(value) => setStatus(value as (typeof STATUS_VALUES)[number])}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Live' },
              { value: 'inactive', label: 'Hidden' },
            ]}
          />
        </div>

        <AdminTable>
          <AdminTableHead>
            <AdminTh>Product</AdminTh>
            <AdminTh>SKU</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Price</AdminTh>
            <AdminTh>Stock</AdminTh>
            <AdminTh>Added</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              <AdminTableSkeleton rows={8} cols={8} />
            ) : (
              products.map((product: Product) => (
                <tr key={product.id} className="transition-colors hover:bg-[#f8fafc]">
                  <AdminTd>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-[#e2e8f0] bg-[#f8fafc]">
                        {product.defaultImage ? (
                          <Image
                            src={product.defaultImage}
                            alt={product.name}
                            fill
                            sizes="2rem"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[0.6rem] text-[#94a3b8]">—</div>
                        )}
                      </div>
                      <span className="font-medium text-[#0f172a]">{product.name}</span>
                    </div>
                  </AdminTd>
                  <AdminTd className="font-mono text-xs text-[#64748b]">{product.sku}</AdminTd>
                  <AdminTd>{product.category?.name}</AdminTd>
                  <AdminTd className="font-semibold">{formatPrice(product.effectivePrice)}</AdminTd>
                  <AdminTd>{product.totalStock ?? 0}</AdminTd>
                  <AdminTd>
                    {product.createdAt && (
                      <div>
                        <p className="text-sm text-[#0f172a]">{formatDate(product.createdAt)}</p>
                        <p className="text-xs text-[#94a3b8]">{formatTime(product.createdAt)}</p>
                      </div>
                    )}
                  </AdminTd>
                  <AdminTd>
                    <StatusBadge variant={product.isComingSoon ? 'pending' : product.isActive ? 'active' : 'inactive'}>
                      {product.isComingSoon ? 'Coming Soon' : product.isActive ? 'Live' : 'Hidden'}
                    </StatusBadge>
                  </AdminTd>
                  <AdminTd>
                    <ViewDetailsButton href={`/admin/products/${product.id}`} label="Product Details" />
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
