'use client';

import { useRef, useState } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminBannerService } from '@/services/admin.service';
import type { HeroBanner } from '@/types';
import { refreshStorefrontAfterBannerChange } from '@/lib/refresh-storefront';
import { StatusBadge } from '@/components/admin/status-badge';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 10;

const emptyForm = {
  title: '',
  subtitle: '',
  linkUrl: '',
  sortOrder: '0',
  isActive: true,
};

export function HeroBannersSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminBannerService.getAll(),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createBanner = useMutation({
    mutationFn: () => {
      if (!imageFile) throw new Error('Image required');
      return adminBannerService.create({
        title: form.title.trim() || undefined,
        subtitle: form.subtitle.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        image: imageFile,
      });
    },
    onSuccess: () => {
      toast.success('Hero banner added');
      resetForm();
      void refreshStorefrontAfterBannerChange();
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: () => toast.error('Failed to add hero banner'),
  });

  const updateBanner = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('No banner selected');
      return adminBannerService.update(editingId, {
        title: form.title.trim() || undefined,
        subtitle: form.subtitle.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });
    },
    onSuccess: () => {
      toast.success('Hero banner updated');
      resetForm();
      void refreshStorefrontAfterBannerChange();
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: () => toast.error('Failed to update hero banner'),
  });

  const deleteBanner = useMutation({
    mutationFn: (id: string) => adminBannerService.delete(id),
    onSuccess: () => {
      toast.success('Hero banner deleted');
      if (editingId) resetForm();
      void refreshStorefrontAfterBannerChange();
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: () => toast.error('Failed to delete hero banner'),
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
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const startEdit = (banner: HeroBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      linkUrl: banner.linkUrl || '',
      sortOrder: String(banner.sortOrder),
      isActive: banner.isActive,
    });
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateBanner.mutate();
      return;
    }
    if (!imageFile) {
      toast.error('Banner image is required');
      return;
    }
    createBanner.mutate();
  };

  const isPending = createBanner.isPending || updateBanner.isPending;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[#0f172a]">
            {editingId ? 'Update Hero Banner' : 'Add Hero Banner'}
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Homepage slider images. Recommended size: 1920×800 or similar wide format.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Festive Collection"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Optional subtitle"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">Link URL</label>
            <input
              value={form.linkUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="/collections"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">Sort Order</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-[#cbd5e1]"
          />
          Active (visible on homepage)
        </label>

        {!editingId && (
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
              {imagePreview ? (
                <OptimizedImage src={imagePreview} alt="Banner preview" fill sizes="10rem" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#94a3b8]">No image</div>
              )}
            </div>
            <div>
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
                className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
              >
                {imagePreview ? 'Change Image' : 'Choose Image *'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60"
          >
            {isPending ? 'Saving...' : editingId ? 'Update Banner' : 'Add Banner'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#0f172a]">Existing Banners</h3>
        {isLoading ? (
          <p className="text-sm text-[#94a3b8]">Loading...</p>
        ) : banners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-white py-12 text-center text-sm text-[#94a3b8]">
            No hero banners yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {banners.map((banner: HeroBanner) => (
              <div key={banner.id} className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
                <div className="relative aspect-[16/9]">
                  <OptimizedImage src={banner.imageUrl} alt={banner.title || 'Banner'} fill sizes="(max-width: 640px) 50vw, 320px" className="object-cover" />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="font-semibold text-[#0f172a]">{banner.title || 'Untitled'}</p>
                    {banner.subtitle && (
                      <p className="mt-1 text-xs text-[#64748b]">{banner.subtitle}</p>
                    )}
                    <p className="mt-1 text-xs text-[#94a3b8]">Sort: {banner.sortOrder}</p>
                  </div>
                  <StatusBadge variant={banner.isActive ? 'active' : 'inactive'}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </StatusBadge>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(banner)}
                      className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBanner.mutate(banner.id)}
                      disabled={deleteBanner.isPending}
                      className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
