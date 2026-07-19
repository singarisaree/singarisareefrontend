'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { refreshStorefrontAfterReviewChange } from '@/lib/refresh-storefront';
import {
  adminCategoryService,
  adminProductService,
  adminReviewService,
} from '@/services/admin.service';
import type { CustomerReview, Product } from '@/types';
import { StarRating } from '@/components/reviews/star-rating';
import { StatusBadge } from '@/components/admin/status-badge';
import { CardGridSkeleton } from '@/components/admin/loading-skeletons';
import {
  DataTableToolbar,
  FilterSelect,
  ClearFilters,
  AdminTableCard,
} from '@/components/admin/data-table';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useAdminPagination } from '@/lib/use-admin-pagination';
import { useResetPageOnFilterChange } from '@/lib/use-reset-page-on-filter-change';
import {
  useAdminSearchParam,
  useAdminDateRangeParam,
  useAdminCategoryProductParams,
} from '@/lib/use-admin-list-filters';

const emptyForm = {
  categoryId: '',
  productId: '',
  customerName: '',
  rating: 5,
  comment: '',
  isActive: true,
  sortOrder: '0',
};

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { search, debouncedSearch, onSearchChange, setSearch } = useAdminSearchParam();
  const {
    categoryFilter,
    productFilter,
    setCategory,
    setProduct,
    clearCategoryProduct,
  } = useAdminCategoryProductParams();
  const { dateRange, onDateRangeChange, dateParams, hasDateRange, clearDateRange } = useAdminDateRangeParam();
  const { page, setPage, pageSize, setPageSize, resetPage } = useAdminPagination();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useResetPageOnFilterChange(resetPage, debouncedSearch, categoryFilter, productFilter, dateParams.startDate, dateParams.endDate);

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
    staleTime: 2 * 60 * 1000,
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-active'],
    queryFn: () => adminProductService.getAll({ limit: '100', isActive: 'true' }),
    staleTime: 60 * 1000,
  });
  const products = Array.isArray(productsData) ? productsData : [];

  const activeProducts = useMemo(
    () => products.filter((p: Product) => p.isActive),
    [products],
  );

  const productCategoryId = (p?: Product | null) => p?.categoryId || p?.category?.id || '';

  const filterProducts = useMemo(
    () =>
      categoryFilter
        ? activeProducts.filter((p: Product) => productCategoryId(p) === categoryFilter)
        : activeProducts,
    [activeProducts, categoryFilter],
  );

  const formProducts = useMemo(
    () =>
      form.categoryId
        ? activeProducts.filter((p: Product) => productCategoryId(p) === form.categoryId)
        : [],
    [activeProducts, form.categoryId],
  );

  const { data: reviewsResult, isLoading } = useQuery({
    queryKey: ['admin-reviews', productFilter, categoryFilter, debouncedSearch, page, pageSize, dateParams],
    queryFn: () =>
      adminReviewService.list({
        page: String(page),
        limit: String(pageSize),
        ...(productFilter && { productId: productFilter }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...dateParams,
      }),
    placeholderData: keepPreviousData,
  });

  const reviews = reviewsResult?.data ?? [];
  const meta = reviewsResult?.meta;
  const hasFilters = Boolean(debouncedSearch) || Boolean(categoryFilter) || Boolean(productFilter) || hasDateRange;

  const resetForm = () => {
    setForm({
      ...emptyForm,
      categoryId: categoryFilter,
      productId: productFilter,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const saveReview = useMutation({
    mutationFn: () => {
      if (!form.categoryId) throw new Error('Category required');
      if (!form.productId) throw new Error('Product required');
      if (!form.customerName.trim()) throw new Error('Customer name required');
      if (!form.comment.trim()) throw new Error('Review required');

      const payload = {
        productId: form.productId,
        customerName: form.customerName.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      return editingId
        ? adminReviewService.update(editingId, payload)
        : adminReviewService.create(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Review updated' : 'Review added');
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      void refreshStorefrontAfterReviewChange();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to save review')),
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => adminReviewService.delete(id),
    onSuccess: () => {
      toast.success('Review deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      void refreshStorefrontAfterReviewChange();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to delete review')),
  });

  const startEdit = (review: CustomerReview) => {
    const product = activeProducts.find(
      (p) => p.id === (review.productId || review.product?.id),
    );
    setEditingId(review.id);
    setForm({
      categoryId: productCategoryId(product),
      productId: review.productId || review.product?.id || '',
      customerName: review.customerName,
      rating: review.rating,
      comment: review.comment,
      isActive: review.isActive !== false,
      sortOrder: String(review.sortOrder ?? 0),
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: categoryFilter,
      productId: productFilter,
    });
    setShowForm(true);
  };

  const onCategoryFilterChange = (categoryId: string) => {
    setCategory(categoryId);
  };

  const onFormCategoryChange = (categoryId: string) => {
    setForm((f) => ({ ...f, categoryId, productId: '' }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Product Reviews</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Add and manage customer reviews. Pick any category from your store, then an active product in that category.
        </p>
      </div>

      <AdminTableCard>
        <div className="space-y-4 border-b border-[#e2e8f0] p-5">
          <DataTableToolbar
            searchPlaceholder="Search by customer, review, or product..."
            searchValue={search}
            onSearchChange={onSearchChange}
            addLabel="Add Review"
            onAdd={openCreate}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          >
            <ClearFilters
              visible={hasFilters}
              onClear={() => {
                setSearch('');
                clearCategoryProduct();
                clearDateRange();
              }}
            />
          </DataTableToolbar>
          <div className="flex flex-wrap items-center gap-4">
            <FilterSelect
              id="categoryFilter"
              label="Category"
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              placeholder="All categories"
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              className="min-w-[11rem]"
            />
            <FilterSelect
              id="productFilter"
              label="Product"
              value={productFilter}
              onChange={setProduct}
              disabled={!categoryFilter}
              placeholder={categoryFilter ? 'All products in category' : 'Select category first'}
              options={filterProducts.map((p) => ({ value: p.id, label: p.name }))}
              className="min-w-[11rem]"
            />
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveReview.mutate();
            }}
            className="space-y-4 border-b border-[#e2e8f0] bg-[#f8fafc] p-5"
          >
            <h2 className="text-sm font-semibold text-[#0f172a]">
              {editingId ? 'Edit Review' : 'New Review'}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="formCategory" className="text-sm font-medium text-[#334155]">
                  1. Category *
                </label>
                <select
                  id="formCategory"
                  required
                  value={form.categoryId}
                  onChange={(e) => onFormCategoryChange(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="formProduct" className="text-sm font-medium text-[#334155]">
                  2. Product *
                </label>
                <select
                  id="formProduct"
                  required
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                  disabled={!form.categoryId}
                  className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#94a3b8]"
                >
                  <option value="">
                    {form.categoryId ? 'Select product' : 'Select category first'}
                  </option>
                  {formProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#334155]">3. Customer name *</label>
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="e.g. Priya Sharma"
                className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm sm:max-w-md"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#334155]">4. Rating *</label>
              <StarRating
                rating={form.rating}
                size="md"
                interactive
                onChange={(rating) => setForm((f) => ({ ...f, rating }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#334155]">5. Review *</label>
              <textarea
                required
                rows={3}
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Write the customer review..."
                className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-[#334155]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                Visible on storefront
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor="sortOrder" className="text-sm text-[#334155]">
                  Sort order
                </label>
                <input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="h-9 w-20 rounded-lg border border-[#e2e8f0] bg-white px-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saveReview.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {saveReview.isPending ? 'Saving...' : editingId ? 'Update Review' : 'Add Review'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="p-5">
          {isLoading ? (
            <CardGridSkeleton count={4} />
          ) : reviews.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#94a3b8]">No reviews yet. Add one above.</p>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {reviews.map((review: CustomerReview) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0f172a]">{review.customerName}</p>
                      {review.product?.name && (
                        <p className="mt-0.5 truncate text-xs text-[#64748b]">{review.product.name}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(review)}
                        className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                        aria-label="Edit review"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this review?')) deleteReview.mutate(review.id);
                        }}
                        className="rounded-lg p-2 text-[#64748b] hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StarRating rating={review.rating} />
                    <StatusBadge variant={review.isActive !== false ? 'active' : 'inactive'}>
                      {review.isActive !== false ? 'Live' : 'Hidden'}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#475569]">{review.comment}</p>
                </div>
                ))}
              </div>
              {meta && (
                <div className="mt-6">
                  <AdminPagination
                    meta={meta}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </AdminTableCard>
    </div>
  );
}
