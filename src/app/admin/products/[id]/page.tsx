'use client';

import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { adminCategoryService, adminProductService } from '@/services/admin.service';
import { UnsavedGuard } from '@/components/admin/unsaved-guard';
import { formatPrice } from '@/lib/utils';
import { refreshStorefrontAfterProductChange } from '@/lib/refresh-storefront';
import { SortableImageGrid } from '@/components/admin/sortable-image-grid';
import { ImageUploadDropzone } from '@/components/admin/image-upload-dropzone';
import {
  type ColorImageEntry,
  buildImageListFromColor,
  colorImageEntryId,
  imageListHasChanges,
  imageListToSortableItems,
  reorderImageList,
} from '@/lib/color-image-entries';
import type { Category, Product, ProductColor } from '@/types';
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
  AdminFormField,
  AdminFormSelect,
  AdminFormTextarea,
} from '@/components/admin/admin-detail';

const MAX_IMAGES_PER_COLOR = 6;
const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [fabric, setFabric] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [productStatus, setProductStatus] = useState<'available' | 'coming_soon' | 'out_of_stock' | 'hidden'>('available');
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [variantDrafts, setVariantDrafts] = useState<
    Record<string, { name: string; hexCode: string; instagramVideoUrl: string; isActive: boolean }>
  >({});
  const [imageLists, setImageLists] = useState<Record<string, ColorImageEntry[]>>({});
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: '',
    hexCode: '#000000',
    instagramVideoUrl: '',
    stock: '0',
    isActive: true,
  });
  const [newVariantImages, setNewVariantImages] = useState<PendingImage[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => adminProductService.getById(id),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setProductDetails(product.productDetails || '');
      setCategoryId(product.categoryId);
      setPrice(String(product.price));
      setMrp(String(product.mrp));
      setFabric(product.fabric || '');
      setWeight(product.weight ? String(product.weight) : '');
      setLength(product.length ? String(product.length) : '');
      setWidth(product.width ? String(product.width) : '');
      setHeight(product.height ? String(product.height) : '');
      if (product.isComingSoon) {
        setProductStatus('coming_soon');
      } else if (!product.isActive) {
        setProductStatus('hidden');
      } else if (product.totalStock <= 0) {
        setProductStatus('out_of_stock');
      } else {
        setProductStatus('available');
      }
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    setImageLists((prev) => {
      const next: Record<string, ColorImageEntry[]> = { ...prev };
      for (const color of product.colors) {
        if (!next[color.id]) {
          next[color.id] = buildImageListFromColor(color);
        }
      }
      return next;
    });
  }, [product]);

  useEffect(() => {
    return () => {
      Object.values(imageLists).forEach((list) =>
        list.forEach((entry) => {
          if (entry.kind === 'pending') URL.revokeObjectURL(entry.previewUrl);
        }),
      );
      newVariantImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [imageLists, newVariantImages]);

  const save = useMutation({
    mutationFn: async () => {
      const changedColors = product?.colors.filter((c) => colorHasChanges(c)) ?? [];
      for (const color of changedColors) {
        assertColorReadyToSave(color);
      }
      return adminProductService.adminSave(
        id,
        buildAdminSaveFormData({
          includeProduct: true,
          colors: changedColors,
        }),
      );
    },
    onSuccess: (updated) => {
      toast.success('Product updated');
      setIsDirty(false);
      applySavedProductState(updated);
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      void refreshStorefrontAfterProductChange(updated.slug);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update product')),
  });

  const removeProduct = useMutation({
    mutationFn: () => adminProductService.delete(id) as Promise<{ permanentlyDeleted?: boolean }>,
    onSuccess: async (result) => {
      toast.success(
        result?.permanentlyDeleted === false
          ? 'Product hidden (has order history — cannot remove from database)'
          : 'Product permanently deleted',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void refreshStorefrontAfterProductChange(product?.slug);
      router.push('/admin/products');
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Failed to delete product'
        : 'Failed to delete product';
      toast.error(message);
    },
  });

  const addVariant = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append(
        'payload',
        JSON.stringify({
          name: newVariant.name.trim(),
          hexCode: newVariant.hexCode || undefined,
          instagramVideoUrl: newVariant.instagramVideoUrl.trim() || undefined,
          stock: Number(newVariant.stock) || 0,
          isActive: newVariant.isActive,
          sortOrder: product?.colors.length ?? 0,
        }),
      );
      newVariantImages.forEach((img) => formData.append('images', img.file));
      return adminProductService.adminAddColor(id, formData);
    },
    onSuccess: (updated) => {
      toast.success('Variant added');
      queryClient.setQueryData(['admin-product', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      void refreshStorefrontAfterProductChange(updated.slug);
      newVariantImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setNewVariant({ name: '', hexCode: '#000000', instagramVideoUrl: '', stock: '0', isActive: true });
      setNewVariantImages([]);
      setShowAddVariant(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add variant')),
  });

  const getVariantDraft = (color: ProductColor) =>
    variantDrafts[color.id] ?? {
      name: color.name,
      hexCode: color.hexCode || '#000000',
      instagramVideoUrl: color.instagramVideoUrl || '',
      isActive: color.isActive ?? true,
    };

  const variantHasChanges = (color: ProductColor) => {
    const draft = variantDrafts[color.id];
    if (!draft) return false;
    return (
      draft.name.trim() !== color.name ||
      draft.hexCode !== (color.hexCode || '#000000') ||
      draft.instagramVideoUrl.trim() !== (color.instagramVideoUrl || '') ||
      draft.isActive !== (color.isActive ?? true)
    );
  };

  const getStockDraft = (color: ProductColor) =>
    stockDrafts[color.id] ?? String(color.availableStock);

  const stockHasChanges = (color: ProductColor) => {
    const draft = stockDrafts[color.id];
    return draft !== undefined && Number(draft) !== color.availableStock;
  };

  const getImageList = (color: ProductColor) =>
    imageLists[color.id] ?? buildImageListFromColor(color);

  const imageHasChanges = (color: ProductColor) =>
    imageListHasChanges(color, getImageList(color));

  const colorHasChanges = (color: ProductColor) =>
    variantHasChanges(color) || stockHasChanges(color) || imageHasChanges(color);

  const validateImageFiles = (files: File[], currentCount: number) => {
    if (currentCount + files.length > MAX_IMAGES_PER_COLOR) {
      toast.error(`Maximum ${MAX_IMAGES_PER_COLOR} images per variant`);
      return false;
    }
    if (files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type))) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return false;
    }
    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (files.some((file) => file.size > maxBytes)) {
      toast.error(`Each image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const onVariantImagesChange = (color: ProductColor, filesList: FileList | null) => {
    const files = Array.from(filesList ?? []);
    if (!files.length) return;

    const list = getImageList(color);
    if (!validateImageFiles(files, list.length)) return;

    const mapped: ColorImageEntry[] = files.map((file) => ({
      kind: 'pending',
      localId: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setImageLists((prev) => ({
      ...prev,
      [color.id]: [...list, ...mapped],
    }));
  };

  const removeImageFromList = (colorId: string, entryId: string) => {
    setImageLists((prev) => {
      const list = prev[colorId] ?? [];
      const removed = list.find((entry) => colorImageEntryId(entry) === entryId);
      if (removed?.kind === 'pending') URL.revokeObjectURL(removed.previewUrl);
      return {
        ...prev,
        [colorId]: list.filter((entry) => colorImageEntryId(entry) !== entryId),
      };
    });
  };

  const reorderVariantImages = (colorId: string, orderedIds: string[]) => {
    setImageLists((prev) => ({
      ...prev,
      [colorId]: reorderImageList(prev[colorId] ?? [], orderedIds),
    }));
  };

  const onNewVariantImagesChange = (filesList: FileList | null) => {
    const files = Array.from(filesList ?? []);
    if (!files.length) return;
    if (!validateImageFiles(files, newVariantImages.length)) return;
    const mapped = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewVariantImages((prev) => [...prev, ...mapped]);
  };

  const reorderNewVariantImages = (orderedIds: string[]) => {
    setNewVariantImages((prev) => {
      const map = new Map(prev.map((img) => [img.id, img]));
      return orderedIds.map((id) => map.get(id)).filter((img): img is PendingImage => !!img);
    });
  };

  const assertColorReadyToSave = (color: ProductColor) => {
    const draft = getVariantDraft(color);
    if (!draft.name.trim()) {
      throw new Error('Variant name is required');
    }
    const stockValue = Number(getStockDraft(color));
    if (!Number.isInteger(stockValue) || stockValue < 0) {
      throw new Error('Enter a valid whole number for stock (0 or more)');
    }
    const list = getImageList(color);
    if (list.length > MAX_IMAGES_PER_COLOR) {
      throw new Error(`Maximum ${MAX_IMAGES_PER_COLOR} images per variant`);
    }
  };

  const buildAdminSaveFormData = (options: {
    includeProduct: boolean;
    colors: ProductColor[];
  }) => {
    const formData = new FormData();
    const colorsPayload = options.colors.map((color) => {
      const draft = getVariantDraft(color);
      const stockValue = Number(getStockDraft(color));
      const list = getImageList(color);
      const entry: Record<string, unknown> = { id: color.id };

      if (variantHasChanges(color)) {
        entry.name = draft.name.trim();
        entry.hexCode = draft.hexCode || undefined;
        // Empty string/null clears the optional Instagram link
        entry.instagramVideoUrl = draft.instagramVideoUrl.trim() || null;
        entry.isActive = draft.isActive;
      }
      if (stockHasChanges(color)) {
        entry.availableStock = stockValue;
      }
      if (imageHasChanges(color)) {
        const originalIds = [...color.images]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((img) => img.id);
        const existingInList = list
          .filter((e) => e.kind === 'existing')
          .map((e) => e.imageId);
        entry.deleteImageIds = originalIds.filter((imageId) => !existingInList.includes(imageId));
        entry.orderedImageRefs = list.map((e) =>
          e.kind === 'existing' ? e.imageId : 'new',
        );
        list
          .filter((e) => e.kind === 'pending')
          .forEach((e) => formData.append(`color_${color.id}`, e.file));
      }

      return entry;
    });

    formData.append(
      'payload',
      JSON.stringify({
        product: options.includeProduct
          ? {
              name: name.trim(),
              description: description.trim(),
              productDetails: productDetails.trim() || null,
              categoryId,
              price: Number(price),
              mrp: Number(mrp),
              fabric: fabric.trim() || undefined,
              weight: weight ? Number(weight) : undefined,
              length: length ? Number(length) : undefined,
              width: width ? Number(width) : undefined,
              height: height ? Number(height) : undefined,
              isActive: productStatus !== 'hidden',
              isComingSoon: productStatus === 'coming_soon',
              isFeatured: false,
            }
          : {},
        colors: colorsPayload,
      }),
    );

    return formData;
  };

  const applySavedProductState = (updated: Product, colorIds?: string[]) => {
    queryClient.setQueryData(['admin-product', id], updated);
    const ids = colorIds ?? updated.colors.map((c) => c.id);

    setImageLists((prev) => {
      const next = { ...prev };
      for (const colorId of ids) {
        const savedColor = updated.colors.find((c) => c.id === colorId);
        if (savedColor) {
          const previous = prev[colorId];
          previous?.forEach((entry) => {
            if (entry.kind === 'pending') URL.revokeObjectURL(entry.previewUrl);
          });
          next[colorId] = buildImageListFromColor(savedColor);
        }
      }
      return next;
    });

    setVariantDrafts((prev) => {
      const next = { ...prev };
      for (const colorId of ids) delete next[colorId];
      return next;
    });
    setStockDrafts((prev) => {
      const next = { ...prev };
      for (const colorId of ids) delete next[colorId];
      return next;
    });
  };

  if (isLoading) return <AdminDetailLoading />;
  if (!product) return <AdminDetailEmpty message="Product not found" />;

  return (
    <div onChange={() => setIsDirty(true)}>
    <UnsavedGuard hasChanges={isDirty} />
    <AdminDetailShell
      backHref="/admin/products"
      backLabel="Back to Products"
      title={product.name}
      subtitle={`SKU: ${product.sku} · Stock: ${product.totalStock}`}
      badge={
        <StatusBadge variant={productStatus === 'coming_soon' ? 'pending' : productStatus === 'hidden' ? 'inactive' : productStatus === 'out_of_stock' ? 'danger' : 'active'}>
          {productStatus === 'coming_soon' ? 'Coming Soon' : productStatus === 'hidden' ? 'Hidden' : productStatus === 'out_of_stock' ? 'Out of Stock' : 'Available'}
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
                if (!window.confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
                removeProduct.mutate();
              }}
              disabled={removeProduct.isPending || save.isPending}
              className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removeProduct.isPending ? 'Deleting...' : 'Delete'}
            </button>
          }
        />
      }
    >
      <AdminDetailGrid>
        <AdminDetailMain>
          <AdminDetailSection title="Basic Information">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="Product Name" value={name} onChange={setName} />
              <AdminFormSelect label="Category" value={categoryId} onChange={setCategoryId}>
                {categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </AdminFormSelect>
            </div>
            <div className="mt-4">
              <AdminFormTextarea label="Description" value={description} onChange={setDescription} rows={5} />
            </div>
            <div className="mt-4">
              <AdminFormTextarea
                label="Product details (bullet points)"
                value={productDetails}
                onChange={setProductDetails}
                rows={5}
                placeholder={'Pure silk weave\nHandcrafted zari border\nIncludes matching blouse piece'}
                hint="One detail per line. Each line shows as a • bullet on the product page."
              />
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Pricing & Details">
            <div className="grid gap-4 md:grid-cols-3">
              <AdminFormField label="Price (Rs.)" value={price} onChange={setPrice} type="number" />
              <AdminFormField label="MRP (Rs.)" value={mrp} onChange={setMrp} type="number" />
              <AdminFormField label="Fabric" value={fabric} onChange={setFabric} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <AdminFormField label="Weight (grams)" value={weight} onChange={setWeight} type="number" placeholder="e.g. 500" />
              <AdminFormField label="Length (cm)" value={length} onChange={setLength} type="number" placeholder="e.g. 600" />
              <AdminFormField label="Width (cm)" value={width} onChange={setWidth} type="number" placeholder="e.g. 120" />
              <AdminFormField label="Height (cm)" value={height} onChange={setHeight} type="number" placeholder="e.g. 5" />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748b]">Product Status</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'available', label: 'Available' },
                  { value: 'coming_soon', label: 'Coming Soon' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                  { value: 'hidden', label: 'Hidden' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProductStatus(opt.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      productStatus === opt.value
                        ? 'border-[#0f172a] bg-[#0f172a] text-white'
                        : 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </AdminDetailSection>
        </AdminDetailMain>

        <aside className="space-y-6">
          <AdminDetailSection title="Quick Stats">
            <AdminDetailInfoGrid>
              <AdminDetailInfo label="Selling Price" value={formatPrice(product.effectivePrice)} />
              <AdminDetailInfo label="MRP" value={formatPrice(product.mrp)} />
              <AdminDetailInfo label="Total Stock" value={String(product.totalStock)} />
              <AdminDetailInfo label="Sold" value={String(product.soldCount)} />
              <AdminDetailInfo label="Category" value={product.category?.name || '—'} />
              <AdminDetailInfo label="Colors" value={String(product.colors.length)} />
            </AdminDetailInfoGrid>
          </AdminDetailSection>
        </aside>
      </AdminDetailGrid>

      <AdminDetailSection
        className="mt-6"
        title="Colors & Variants"
        description="Add, edit, hide, update stock and images for each variant"
      >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddVariant((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b]"
              >
                <Plus className="h-4 w-4" />
                Add variant
              </button>
            </div>

            {showAddVariant && (
              <div className="mb-6 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4">
                <p className="mb-3 text-sm font-semibold text-[#0f172a]">New variant</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#64748b]">Name</label>
                    <input
                      value={newVariant.name}
                      onChange={(e) => setNewVariant((v) => ({ ...v, name: e.target.value }))}
                      placeholder="e.g. Maroon"
                      className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#64748b]">Color</label>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2">
                      <input
                        type="color"
                        value={newVariant.hexCode}
                        onChange={(e) => setNewVariant((v) => ({ ...v, hexCode: e.target.value }))}
                        className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <input
                        value={newVariant.hexCode}
                        onChange={(e) => setNewVariant((v) => ({ ...v, hexCode: e.target.value }))}
                        className="h-8 w-full rounded border border-[#e2e8f0] px-2 text-xs font-mono focus:border-[#0f172a] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#64748b]">Initial stock</label>
                    <input
                      type="number"
                      min={0}
                      value={newVariant.stock}
                      onChange={(e) => setNewVariant((v) => ({ ...v, stock: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                    />
                        </div>

                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-medium text-[#64748b]">
                            Instagram video link (optional)
                          </label>
                          <input
                            type="text"
                            inputMode="url"
                            value={newVariant.instagramVideoUrl}
                            onChange={(e) =>
                              setNewVariant((v) => ({ ...v, instagramVideoUrl: e.target.value }))
                            }
                            placeholder="https://www.instagram.com/reel/..."
                            className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                          />
                          <p className="text-[11px] text-[#94a3b8]">Leave blank if not needed.</p>
                        </div>

                        <div className="flex items-end">
                          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-[#334155]">
                            <input
                              type="checkbox"
                              checked={newVariant.isActive}
                        onChange={(e) => setNewVariant((v) => ({ ...v, isActive: e.target.checked }))}
                        className="h-4 w-4 rounded border-[#cbd5e1]"
                      />
                      Visible on storefront
                    </label>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-medium text-[#64748b]">
                    Images (max {MAX_IMAGES_PER_COLOR})
                  </label>
                  <ImageUploadDropzone
                    maxImages={MAX_IMAGES_PER_COLOR}
                    currentCount={newVariantImages.length}
                    onFiles={onNewVariantImagesChange}
                    disabled={addVariant.isPending}
                  />
                  {newVariantImages.length > 0 && (
                    <SortableImageGrid
                      items={newVariantImages.map((image) => ({
                        id: image.id,
                        src: image.previewUrl,
                        dashed: true,
                      }))}
                      onReorder={reorderNewVariantImages}
                      onRemove={(imageId) => {
                        const removed = newVariantImages.find((img) => img.id === imageId);
                        if (removed) URL.revokeObjectURL(removed.previewUrl);
                        setNewVariantImages((prev) => prev.filter((img) => img.id !== imageId));
                      }}
                    />
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={!newVariant.name.trim() || addVariant.isPending}
                    onClick={() => addVariant.mutate()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0f172a] px-4 text-xs font-semibold text-white hover:bg-[#1e293b] disabled:opacity-40"
                  >
                    {addVariant.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Create variant
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddVariant(false)}
                    className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-4 text-xs font-medium text-[#64748b] hover:bg-[#f8fafc]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {product.colors.length === 0 ? (
              <p className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#64748b]">
                No variants yet. Add one above.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {product.colors.map((color) => {
                  const draft = getVariantDraft(color);
                  const list = getImageList(color);
                  const isHidden = !(color.isActive ?? true);

                  return (
                    <div
                      key={color.id}
                      className={`rounded-lg border p-4 ${
                        isHidden ? 'border-[#e2e8f0] bg-[#f8fafc] opacity-90' : 'border-[#e2e8f0] bg-white'
                      }`}
                    >
                      <div className="mb-3">
                        <StatusBadge variant={isHidden ? 'inactive' : 'active'}>
                          {isHidden ? 'Hidden' : 'Live'}
                        </StatusBadge>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#64748b]">Variant name</label>
                          <input
                            value={draft.name}
                            onChange={(e) =>
                              setVariantDrafts((prev) => ({
                                ...prev,
                                [color.id]: { ...draft, name: e.target.value },
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#64748b]">Color</label>
                          <div className="flex h-10 items-center gap-2 rounded-lg border border-[#e2e8f0] px-2">
                            <input
                              type="color"
                              value={draft.hexCode}
                              onChange={(e) =>
                                setVariantDrafts((prev) => ({
                                  ...prev,
                                  [color.id]: { ...draft, hexCode: e.target.value },
                                }))
                              }
                              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <input
                              value={draft.hexCode}
                              onChange={(e) =>
                                setVariantDrafts((prev) => ({
                                  ...prev,
                                  [color.id]: { ...draft, hexCode: e.target.value },
                                }))
                              }
                              className="h-8 w-full rounded border border-[#e2e8f0] px-2 text-xs font-mono focus:border-[#0f172a] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#64748b]">
                            Instagram video link (optional)
                          </label>
                          <input
                            type="text"
                            inputMode="url"
                            value={draft.instagramVideoUrl}
                            onChange={(e) =>
                              setVariantDrafts((prev) => ({
                                ...prev,
                                [color.id]: { ...draft, instagramVideoUrl: e.target.value },
                              }))
                            }
                            placeholder="https://www.instagram.com/reel/..."
                            className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                          />
                          <p className="text-[11px] text-[#94a3b8]">
                            Optional. Leave blank if not needed. When set, customers see “Click here
                            to watch on Instagram” for this variant.
                          </p>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#334155]">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(e) =>
                              setVariantDrafts((prev) => ({
                                ...prev,
                                [color.id]: { ...draft, isActive: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded border-[#cbd5e1]"
                          />
                          Visible on storefront
                        </label>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#64748b]">Available stock</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={getStockDraft(color)}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({ ...prev, [color.id]: e.target.value }))
                            }
                            className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[#64748b]">
                            Images ({list.length}/{MAX_IMAGES_PER_COLOR})
                          </label>
                          <ImageUploadDropzone
                            maxImages={MAX_IMAGES_PER_COLOR}
                            currentCount={list.length}
                            onFiles={(files) => onVariantImagesChange(color, files)}
                          />
                          <SortableImageGrid
                            items={imageListToSortableItems(list)}
                            onReorder={(orderedIds) => reorderVariantImages(color.id, orderedIds)}
                            onRemove={(entryId) => removeImageFromList(color.id, entryId)}
                          />
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
      </AdminDetailSection>
    </AdminDetailShell>
    </div>
  );
}
