'use client';

import { useEffect, useRef, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Category } from '@/types';
import { adminCategoryService } from '@/services/admin.service';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ViewDetailsButton } from '@/components/admin/view-details-button';
import { AdminTableSkeleton } from '@/components/admin/loading-skeletons';
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
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { refreshStorefrontAfterCategoryChange } from '@/lib/refresh-storefront';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminEnumParam,
  useAdminDateRangeParam,
} from '@/lib/use-admin-list-filters';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 10;
const STATUS_VALUES = ['all', 'active', 'inactive'] as const;

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const [status, setStatus] = useAdminEnumParam('status', STATUS_VALUES, 'all');
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useResetPageOnFilterChange(resetPage, debouncedSearch, status, dateParams.startDate, dateParams.endDate);

  const { data: categoriesResult, isLoading } = useQuery({
    queryKey: ['admin-categories', 'table', debouncedSearch, status, page, pageSize, dateParams],
    queryFn: () =>
      adminCategoryService.list({
        page: String(page),
        limit: String(pageSize),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status === 'active' && { isActive: 'true' }),
        ...(status === 'inactive' && { isActive: 'false' }),
        ...dateParams,
      }),
    placeholderData: keepPreviousData,
  });

  const categories = categoriesResult?.data ?? [];
  const meta = categoriesResult?.meta;

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const createCategory = useMutation({
    mutationFn: async () => {
      const created = await adminCategoryService.create({
        name: name.trim(),
        isActive: true,
      });
      if (imageFile) {
        await adminCategoryService.uploadImage(created.id, imageFile);
      }
      return created;
    },
    onSuccess: (created) => {
      toast.success('Category added');
      void refreshStorefrontAfterCategoryChange(created.slug);
      setName('');
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add category')),
  });

  const activeCount = categories.filter((category: Category) => category.isActive).length;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all' || hasDateRange;

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    createCategory.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Categories" value={meta?.total ?? categories.length} icon={Layers} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Active" value={activeCount} subtext="on this page" icon={Layers} iconBg="bg-green-50" iconColor="text-green-600" />
      </div>

      <AdminTableCard className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Category name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full max-w-md rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
          />

          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
              {imagePreview ? (
                <OptimizedImage src={imagePreview} alt="Category preview" fill sizes="5rem" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#94a3b8]">No image</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={onImageSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 rounded-lg border border-[#e2e8f0] px-4 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
              >
                {imagePreview ? 'Change Image' : 'Add Image'}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="h-10 rounded-lg border border-[#e2e8f0] px-4 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={createCategory.isPending}
            className="h-10 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createCategory.isPending ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      </AdminTableCard>

      <AdminTableCard>
        <div className="space-y-3 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search categories..."
            searchValue={search}
            onSearchChange={onSearchChange}
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
            <AdminTh>Image</AdminTh>
            <AdminTh>Name</AdminTh>
            <AdminTh>Slug</AdminTh>
            <AdminTh>Products</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {isLoading ? (
              <AdminTableSkeleton rows={6} cols={6} />
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#94a3b8]">No categories found</td>
              </tr>
            ) : (
              categories.map((category: Category) => (
                <tr key={category.id} className="hover:bg-[#f8fafc]">
                  <AdminTd>
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[#e2e8f0] bg-[#f8fafc]">
                      {category.imageUrl ? (
                        <OptimizedImage src={category.imageUrl} alt={category.name} fill sizes="3rem" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[#94a3b8]">—</div>
                      )}
                    </div>
                  </AdminTd>
                  <AdminTd className="font-medium text-[#0f172a]">{category.name}</AdminTd>
                  <AdminTd className="font-mono text-xs text-[#64748b]">{category.slug}</AdminTd>
                  <AdminTd>{category._count?.products ?? 0}</AdminTd>
                  <AdminTd>
                    <StatusBadge variant={category.isActive ? 'active' : 'inactive'}>
                      {category.isActive ? 'Active' : 'Hidden'}
                    </StatusBadge>
                  </AdminTd>
                  <AdminTd>
                    <ViewDetailsButton href={`/admin/categories/${category.id}`} label="Category Details" />
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
