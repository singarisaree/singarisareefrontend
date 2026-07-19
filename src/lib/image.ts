/** Blob/data URLs cannot be processed by the Next.js image optimizer. */
export function isLocalImagePreview(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}
