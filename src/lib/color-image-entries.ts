import type { ProductColor, ProductImage } from '@/types';

export type ColorImageEntry =
  | { kind: 'existing'; imageId: string; url: string }
  | { kind: 'pending'; localId: string; previewUrl: string; file: File };

export function colorImageEntryId(entry: ColorImageEntry): string {
  return entry.kind === 'existing' ? entry.imageId : entry.localId;
}

export function buildImageListFromColor(color: ProductColor): ColorImageEntry[] {
  return [...color.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      kind: 'existing' as const,
      imageId: img.id,
      url: img.url,
    }));
}

export function imageListToSortableItems(list: ColorImageEntry[]) {
  return list.map((entry) => ({
    id: colorImageEntryId(entry),
    src: entry.kind === 'existing' ? entry.url : entry.previewUrl,
    dashed: entry.kind === 'pending',
  }));
}

export function reorderImageList(list: ColorImageEntry[], orderedIds: string[]): ColorImageEntry[] {
  const map = new Map(list.map((entry) => [colorImageEntryId(entry), entry]));
  return orderedIds.map((id) => map.get(id)).filter((entry): entry is ColorImageEntry => !!entry);
}

export function imageListHasChanges(color: ProductColor, list: ColorImageEntry[]): boolean {
  const originalIds = [...color.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.id);
  const existingInList = list.filter((e) => e.kind === 'existing').map((e) => e.imageId);

  if (list.some((e) => e.kind === 'pending')) return true;
  if (existingInList.length !== originalIds.length) return true;
  return existingInList.some((id, index) => id !== originalIds[index]);
}

export function buildOrderedImageIds(
  list: ColorImageEntry[],
  uploadedImages: ProductImage[],
): string[] {
  let uploadIndex = 0;
  return list.map((entry) => {
    if (entry.kind === 'existing') return entry.imageId;
    const uploaded = uploadedImages[uploadIndex++];
    if (!uploaded) throw new Error('Upload count mismatch');
    return uploaded.id;
  });
}
