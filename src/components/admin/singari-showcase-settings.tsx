'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import {
  adminCategoryService,
  adminProductService,
  adminShowcaseService,
} from '@/services/admin.service';
import { refreshStorefrontAfterShowcaseChange } from '@/lib/refresh-storefront';
import { resolveStorefrontImageUrl } from '@/lib/image';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ShowcaseItem } from '@/types';

const MAX_VIDEOS = 6;

export function SingariShowcaseSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickCategoryId, setPickCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [productColorId, setProductColorId] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
  });

  const { data: adminData, isLoading } = useQuery({
    queryKey: ['admin-showcase'],
    queryFn: () => adminShowcaseService.getAdmin(),
  });

  const items = useMemo(() => adminData?.items ?? [], [adminData?.items]);

  const { data: categoryProducts = [], isFetching: loadingProducts } = useQuery({
    queryKey: ['admin-showcase-products', pickCategoryId],
    queryFn: () => adminProductService.getAll({ categoryId: pickCategoryId, limit: '200' }),
    enabled: Boolean(pickCategoryId),
  });

  // Admin list omits colors — load full product for color variants
  const { data: selectedProduct, isFetching: loadingProductDetail } = useQuery({
    queryKey: ['admin-showcase-product', productId],
    queryFn: () => adminProductService.getById(productId),
    enabled: Boolean(productId),
  });

  const usedColorIds = useMemo(
    () => new Set(items.map((i: ShowcaseItem) => i.productColorId)),
    [items],
  );

  const colors = (selectedProduct?.colors ?? []).filter((c) => c.isActive !== false);

  useEffect(() => {
    if (!productId || loadingProductDetail || !selectedProduct) return;
    const activeColors = (selectedProduct.colors ?? []).filter((c) => c.isActive !== false);
    if (!activeColors.length) {
      setProductColorId('');
      return;
    }
    setProductColorId((prev) =>
      activeColors.some((c) => c.id === prev)
        ? prev
        : activeColors.length === 1
          ? activeColors[0].id
          : '',
    );
  }, [productId, loadingProductDetail, selectedProduct]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-showcase'] });
    void refreshStorefrontAfterShowcaseChange();
  };

  const createItem = useMutation({
    mutationFn: () => {
      if (!videoFile) throw new Error('Video is required');
      if (!productId || !productColorId) throw new Error('Select product and color');
      const form = new FormData();
      form.append('video', videoFile);
      form.append('productId', productId);
      form.append('productColorId', productColorId);
      form.append('sortOrder', String(items.length));
      form.append('isActive', 'true');
      return adminShowcaseService.create(form);
    },
    onSuccess: () => {
      toast.success('Showcase video added');
      setVideoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setProductId('');
      setProductColorId('');
      invalidate();
    },
    onError: (error) => {
      if (error instanceof Error && !isAxiosError(error)) {
        toast.error(error.message);
        return;
      }
      const msg = isAxiosError(error)
        ? (error.response?.data as { message?: string })?.message
        : undefined;
      toast.error(msg || 'Failed to add video');
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => adminShowcaseService.delete(id),
    onSuccess: () => {
      toast.success('Video removed');
      invalidate();
    },
    onError: () => toast.error('Could not remove video'),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => adminShowcaseService.reorder(orderedIds),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Could not reorder'),
  });

  const moveItem = (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    reorder.mutate(next.map((i) => i.id));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    createItem.mutate();
  };

  if (isLoading) {
    return <p className="text-sm text-[#64748b]">Loading showcase…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0f172a]">Add showcase video</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm"
              value={pickCategoryId}
              onChange={(e) => {
                setPickCategoryId(e.target.value);
                setProductId('');
                setProductColorId('');
              }}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Product</Label>
            <select
              className="mt-1 w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm"
              value={productId}
              disabled={!pickCategoryId || loadingProducts}
              onChange={(e) => {
                setProductId(e.target.value);
                setProductColorId('');
              }}
            >
              <option value="">
                {loadingProducts ? 'Loading…' : 'Select product'}
              </option>
              {categoryProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Color variant</Label>
            <select
              className="mt-1 w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm disabled:bg-[#f8fafc]"
              value={productColorId}
              disabled={!productId || loadingProductDetail}
              onChange={(e) => setProductColorId(e.target.value)}
            >
              <option value="">
                {!productId
                  ? 'Select product first'
                  : loadingProductDetail
                    ? 'Loading colors…'
                    : colors.length
                      ? 'Select color'
                      : 'No colors found'}
              </option>
              {colors.map((c) => (
                <option key={c.id} value={c.id} disabled={usedColorIds.has(c.id)}>
                  {c.name}{usedColorIds.has(c.id) ? ' (already added)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Video</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="sr-only"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex w-full items-center gap-3 rounded-md border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 py-2.5 text-left text-sm transition-colors hover:border-[#94a3b8] hover:bg-[#f1f5f9]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white border border-[#e2e8f0]">
                <Upload className="h-4 w-4 text-[#64748b]" />
              </span>
              <span className="min-w-0 flex-1">
                {videoFile ? (
                  <>
                    <span className="block truncate font-medium text-[#0f172a]">{videoFile.name}</span>
                    <span className="text-xs text-[#64748b]">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block font-medium text-[#0f172a]">Choose video file</span>
                    <span className="text-xs text-[#64748b]">MP4, WebM, or MOV</span>
                  </>
                )}
              </span>
            </button>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={items.length >= MAX_VIDEOS || createItem.isPending}
            >
              {createItem.isPending ? 'Uploading…' : 'Add video'}
            </Button>
            {items.length >= MAX_VIDEOS && (
              <p className="mt-1 text-xs text-[#64748b]">Maximum {MAX_VIDEOS} videos reached.</p>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
        <h2 className="text-base font-semibold text-[#0f172a]">
          Current videos ({items.length}/{MAX_VIDEOS})
        </h2>
        {!items.length ? (
          <p className="mt-3 text-sm text-[#64748b]">No showcase videos yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item: ShowcaseItem, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e2e8f0] p-3"
              >
                <video
                  src={resolveStorefrontImageUrl(item.videoUrl)}
                  className="h-20 w-14 shrink-0 rounded object-cover bg-black"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0f172a]">{item.productName}</p>
                  <p className="text-xs text-[#64748b]">{item.colorName}</p>
                  <StatusBadge variant={item.isActive ? 'active' : 'inactive'}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </StatusBadge>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded p-2 hover:bg-[#f1f5f9]"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0 || reorder.isPending}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-2 hover:bg-[#f1f5f9]"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1 || reorder.isPending}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-2 text-red-600 hover:bg-red-50"
                    onClick={() => deleteItem.mutate(item.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
