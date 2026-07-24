'use client';

import { use, useEffect, useRef, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { adminCategoryService } from '@/services/admin.service';
import { refreshStorefrontAfterCategoryChange } from '@/lib/refresh-storefront';
import { UnsavedGuard } from '@/components/admin/unsaved-guard';
import { StatusBadge } from '@/components/admin/status-badge';
import {
  AdminDetailEmpty,
  AdminDetailGrid,
  AdminDetailInfo,
  AdminDetailInfoGrid,
  AdminDetailLoading,
  AdminDetailMain,
  AdminDetailSaveBar,
  AdminDetailSection,
  AdminDetailShell,
  AdminFormCheckbox,
  AdminFormField,
} from '@/components/admin/admin-detail';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 10;

export default function AdminCategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: category, isLoading } = useQuery({
    queryKey: ['admin-category', id],
    queryFn: () => adminCategoryService.getById(id),
  });

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSortOrder(String(category.sortOrder));
      setIsActive(category.isActive);
    }
  }, [category]);

  const save = useMutation({
    mutationFn: () =>
      adminCategoryService.update(id, {
        name: name.trim(),
        sortOrder: Number(sortOrder),
        isActive,
      }),
    onSuccess: () => {
      toast.success('Category updated');
      setIsDirty(false);
      void refreshStorefrontAfterCategoryChange(category?.slug);
      void queryClient.invalidateQueries({ queryKey: ['admin-category', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update category')),
  });

  const uploadImage = useMutation({
    mutationFn: (file: File) => adminCategoryService.uploadImage(id, file),
    onSuccess: () => {
      toast.success('Category image updated');
      setPreviewUrl(null);
      void refreshStorefrontAfterCategoryChange(category?.slug);
      queryClient.invalidateQueries({ queryKey: ['admin-category', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to upload image')),
  });

  const hideCategory = useMutation({
    mutationFn: () => adminCategoryService.delete(id),
    onSuccess: () => {
      toast.success('Category deleted');
      void refreshStorefrontAfterCategoryChange(category?.slug);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      router.push('/admin/categories');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Failed to delete category'
        : 'Failed to delete category';
      toast.error(message);
    },
  });

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
    setPreviewUrl(URL.createObjectURL(file));
    uploadImage.mutate(file);
    e.target.value = '';
  };

  if (isLoading) return <AdminDetailLoading />;
  if (!category) return <AdminDetailEmpty message="Category not found" />;

  const currentImage = previewUrl || category.imageUrl || null;
  const productCount = category._count?.products ?? 0;
  const canDelete = productCount === 0;

  return (
    <div onChange={() => setIsDirty(true)}>
    <UnsavedGuard hasChanges={isDirty} />
    <AdminDetailShell
      backHref="/admin/categories"
      backLabel="Back to Categories"
      title={category.name}
      subtitle={`Slug: ${category.slug}`}
      badge={
        <StatusBadge variant={category.isActive ? 'active' : 'inactive'}>
          {category.isActive ? 'Active' : 'Hidden'}
        </StatusBadge>
      }
      footer={
        <AdminDetailSaveBar
          onSave={() => save.mutate()}
          saving={save.isPending}
          extra={
            <button
              type="button"
              onClick={() => {
                if (!canDelete) {
                  toast.error('Delete or move all products in this category first');
                  return;
                }
                if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
                hideCategory.mutate();
              }}
              disabled={hideCategory.isPending || save.isPending || !canDelete}
              title={
                canDelete
                  ? 'Delete this empty category'
                  : `Cannot delete — ${productCount} product${productCount === 1 ? '' : 's'} still in this category`
              }
              className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hideCategory.isPending ? 'Deleting...' : 'Delete'}
            </button>
          }
        />
      }
    >
      <AdminDetailGrid>
        <AdminDetailMain>
          <AdminDetailSection title="Category Image" description="Shown on the homepage and collection pages">
            <div className="space-y-4">
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                {currentImage ? (
                  <OptimizedImage
                    src={currentImage}
                    alt={category.name}
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-48 items-center justify-center text-sm text-[#94a3b8]">
                    No image uploaded
                  </div>
                )}
              </div>
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
                disabled={uploadImage.isPending}
                className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
              >
                {uploadImage.isPending ? 'Uploading...' : currentImage ? 'Update Image' : 'Add Image'}
              </button>
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Category Details">
            <div className="space-y-4">
              <AdminFormField label="Category Name" value={name} onChange={setName} />
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminFormField label="Sort Order" value={sortOrder} onChange={setSortOrder} type="number" />
                <div className="flex items-end">
                  <AdminFormCheckbox label="Active (visible on store)" checked={isActive} onChange={setIsActive} />
                </div>
              </div>
            </div>
          </AdminDetailSection>
        </AdminDetailMain>

        <aside className="space-y-6">
          <AdminDetailSection title="Overview">
            <AdminDetailInfoGrid>
              <AdminDetailInfo label="Products" value={String(productCount)} />
              <AdminDetailInfo label="Slug" value={category.slug} />
              <AdminDetailInfo label="Sort Order" value={String(category.sortOrder)} />
              <AdminDetailInfo label="Status" value={category.isActive ? 'Active' : 'Hidden'} />
            </AdminDetailInfoGrid>
            {!canDelete && (
              <p className="mt-4 text-sm text-amber-700">
                Delete is blocked until this category has 0 products. Move or delete products first.
              </p>
            )}
          </AdminDetailSection>
        </aside>
      </AdminDetailGrid>
    </AdminDetailShell>
    </div>
  );
}
