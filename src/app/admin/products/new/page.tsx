'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Category } from '@/types';
import { adminCategoryService, adminProductService } from '@/services/admin.service';
import { refreshStorefrontAfterProductChange } from '@/lib/refresh-storefront';
import { SortableImageGrid } from '@/components/admin/sortable-image-grid';
import { ImageUploadDropzone } from '@/components/admin/image-upload-dropzone';

interface ColorFormImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ColorForm {
  id: string;
  name: string;
  hexCode: string;
  instagramVideoUrl: string;
  stock: string;
  images: ColorFormImage[];
}

const MAX_IMAGES_PER_COLOR = 6;
const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function AdminAddProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorsRef = useRef<ColorForm[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [fabric, setFabric] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [colors, setColors] = useState<ColorForm[]>([
    { id: crypto.randomUUID(), name: '', hexCode: '#000000', instagramVideoUrl: '', stock: '0', images: [] },
  ]);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminCategoryService.getAll(),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      colors.forEach((color, index) => {
        color.images.forEach((image) => {
          formData.append(`color_${index}`, image.file);
        });
      });
      formData.append(
        'payload',
        JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          categoryId,
          description: description.trim(),
          productDetails: productDetails.trim() || undefined,
          fabric: fabric.trim() || undefined,
          price: Number(price),
          mrp: Number(mrp),
          weight: weight ? Number(weight) : undefined,
          length: length ? Number(length) : undefined,
          width: width ? Number(width) : undefined,
          height: height ? Number(height) : undefined,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          isFeatured,
          colors: colors.map((color, index) => ({
            name: color.name.trim(),
            hexCode: color.hexCode || undefined,
            instagramVideoUrl: color.instagramVideoUrl.trim() || undefined,
            stock: Number(color.stock) || 0,
            sortOrder: index,
          })),
        }),
      );
      return adminProductService.adminCreate(formData);
    },
    onSuccess: (created) => {
      toast.success('Product added');
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      void refreshStorefrontAfterProductChange(created.slug);
      router.push('/admin/products');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to add product')),
  });

  const addColor = () => {
    setColors((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', hexCode: '#000000', instagramVideoUrl: '', stock: '0', images: [] },
    ]);
  };

  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  useEffect(() => {
    return () => {
      colorsRef.current.forEach((color) => {
        color.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      });
    };
  }, []);

  const removeColor = (index: number) => {
    if (colors.length === 1) {
      toast.error('At least one color is required');
      return;
    }
    setColors((prev) => {
      prev[index]?.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateColor = <K extends keyof ColorForm>(index: number, key: K, value: ColorForm[K]) => {
    setColors((prev) =>
      prev.map((color, i) => (i === index ? { ...color, [key]: value } : color)),
    );
  };

  const onColorImagesChange = (index: number, filesList: FileList | null) => {
    const files = Array.from(filesList ?? []);
    const current = colors[index]?.images ?? [];
    const total = current.length + files.length;
    if (total > MAX_IMAGES_PER_COLOR) {
      toast.error(`Each color can have maximum ${MAX_IMAGES_PER_COLOR} images`);
      return;
    }
    const hasInvalidType = files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
    if (hasInvalidType) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    const hasOversized = files.some((file) => file.size > maxBytes);
    if (hasOversized) {
      toast.error(`Each image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    const mappedFiles = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    updateColor(index, 'images', [...current, ...mappedFiles]);
  };

  const reorderColorImages = (colorIndex: number, orderedIds: string[]) => {
    setColors((prev) =>
      prev.map((color, i) => {
        if (i !== colorIndex) return color;
        const map = new Map(color.images.map((img) => [img.id, img]));
        return {
          ...color,
          images: orderedIds.map((id) => map.get(id)).filter((img): img is ColorFormImage => !!img),
        };
      }),
    );
  };

  const removeColorImage = (colorIndex: number, imageId: string) => {
    setColors((prev) => {
      const targetImage = prev[colorIndex]?.images.find((img) => img.id === imageId);
      if (targetImage) {
        URL.revokeObjectURL(targetImage.previewUrl);
      }
      return prev.map((color, i) =>
        i === colorIndex
          ? { ...color, images: color.images.filter((img) => img.id !== imageId) }
          : color,
      );
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !description.trim()) {
      toast.error('Please fill required fields');
      return;
    }
    if (!/^\d{6}$/.test(sku.trim())) {
      toast.error('SKU must be exactly 6 digits');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    if (Number(price) <= 0 || Number(mrp) <= 0) {
      toast.error('Price and MRP must be greater than 0');
      return;
    }
    for (const color of colors) {
      if (!color.name.trim()) {
        toast.error('Each color needs a name');
        return;
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(color.hexCode)) {
        toast.error('Please choose a valid color');
        return;
      }
      if (Number(color.stock) < 0) {
        toast.error('Color stock cannot be negative');
        return;
      }
      if (color.images.length > MAX_IMAGES_PER_COLOR) {
        toast.error(`Each color can have maximum ${MAX_IMAGES_PER_COLOR} images`);
        return;
      }
    }
    createProduct.mutate();
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Add Product</h1>
        <p className="mt-1 text-sm text-[#64748b]">Create a new product and assign category.</p>
        <p className="mt-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
          <span className="font-semibold text-[#0f172a]">Image tip:</span> Upload{' '}
          <span className="font-medium text-[#0f172a]">3:4</span> portrait photos
          (e.g. 1200×1600). Avoid square or landscape — they crop on the store.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-[#334155]">Product Name *</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sku" className="text-sm font-medium text-[#334155]">SKU *</label>
            <input
              id="sku"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={sku}
              onChange={(e) => setSku(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 digits e.g. 482917"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 font-mono text-sm tracking-wider focus:border-[#0f172a] focus:outline-none"
            />
            <p className="text-xs text-[#64748b]">Exactly 6 digits. Must be unique for each product.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="categoryId" className="text-sm font-medium text-[#334155]">Category *</label>
            <select
              id="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={categoriesLoading}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm focus:border-[#0f172a] focus:outline-none disabled:opacity-60"
            >
              <option value="">Select category</option>
              {categories.map((category: Category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="fabric" className="text-sm font-medium text-[#334155]">Fabric</label>
            <input
              id="fabric"
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              placeholder="e.g. Pure Kanjivaram Silk"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-[#334155]">Description *</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm focus:border-[#0f172a] focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="productDetails" className="text-sm font-medium text-[#334155]">
            Product details (bullet points)
          </label>
          <textarea
            id="productDetails"
            rows={5}
            value={productDetails}
            onChange={(e) => setProductDetails(e.target.value)}
            placeholder={'Pure silk weave\nHandcrafted zari border\nIncludes matching blouse piece'}
            className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
          />
          <p className="text-xs text-[#64748b]">
            Enter one detail per line. Each line will show as a • bullet on the product page.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium text-[#334155]">Price *</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="mrp" className="text-sm font-medium text-[#334155]">MRP *</label>
            <input
              id="mrp"
              type="number"
              min="0"
              step="0.01"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="weight" className="text-sm font-medium text-[#334155]">Weight (grams)</label>
            <input
              id="weight"
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 500"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="length" className="text-sm font-medium text-[#334155]">Length (cm)</label>
            <input
              id="length"
              type="number"
              min="0"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g. 600"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="width" className="text-sm font-medium text-[#334155]">Width (cm)</label>
            <input
              id="width"
              type="number"
              min="0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="e.g. 120"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="height" className="text-sm font-medium text-[#334155]">Height (cm)</label>
            <input
              id="height"
              type="number"
              min="0"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 5"
              className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-[#e2e8f0] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0f172a]">Colors, stock and images</p>
            <button
              type="button"
              onClick={addColor}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Color
            </button>
          </div>
          <div className="space-y-4">
            {colors.map((color, index) => (
              <div key={color.id} className="rounded-lg border border-[#e2e8f0] p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#334155]">Color Name *</label>
                    <input
                      value={color.name}
                      onChange={(e) => updateColor(index, 'name', e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#334155]">Color Picker</label>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-[#e2e8f0] px-2">
                      <input
                        type="color"
                        value={color.hexCode}
                        onChange={(e) => updateColor(index, 'hexCode', e.target.value)}
                        className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <input
                        value={color.hexCode}
                        onChange={(e) => updateColor(index, 'hexCode', e.target.value)}
                        placeholder="#000000"
                        className="h-8 w-full rounded border border-[#e2e8f0] px-2 text-xs font-mono text-[#334155] focus:border-[#0f172a] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#334155]">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={color.stock}
                      onChange={(e) => updateColor(index, 'stock', e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-[#334155]">
                    Instagram video link (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="url"
                    value={color.instagramVideoUrl}
                    onChange={(e) => updateColor(index, 'instagramVideoUrl', e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm focus:border-[#0f172a] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#94a3b8]">Leave blank if not needed.</p>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-[#334155]">Images (max {MAX_IMAGES_PER_COLOR})</label>
                  <ImageUploadDropzone
                    maxImages={MAX_IMAGES_PER_COLOR}
                    currentCount={color.images.length}
                    onFiles={(files) => onColorImagesChange(index, files)}
                  />
                  {color.images.length > 0 && (
                    <SortableImageGrid
                      items={color.images.map((image) => ({
                        id: image.id,
                        src: image.previewUrl,
                      }))}
                      onReorder={(orderedIds) => reorderColorImages(index, orderedIds)}
                      onRemove={(imageId) => removeColorImage(index, imageId)}
                    />
                  )}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => removeColor(index)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Color
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="tags" className="text-sm font-medium text-[#334155]">Tags</label>
          <input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="bridal, silk, festive"
            className="h-10 w-full rounded-lg border border-[#e2e8f0] px-3 text-sm placeholder:text-[#94a3b8] focus:border-[#0f172a] focus:outline-none"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-[#334155]">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-[#cbd5e1]"
          />
          Mark as featured
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createProduct.isPending}
            className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createProduct.isPending ? 'Saving...' : 'Save Product'}
          </button>
          <Link
            href="/admin/products"
            className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#f8fafc]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
