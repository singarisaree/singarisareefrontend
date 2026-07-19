import { serverStore } from '@/lib/server-store';
import { RelatedProductsContent } from '@/components/products/related-products-content';

interface RelatedProductsAsyncProps {
  productId: string;
  category?: { name: string; slug: string };
  className?: string;
}

export async function RelatedProductsAsync({
  productId,
  category,
  className,
}: RelatedProductsAsyncProps) {
  const related = await serverStore.getRelatedProducts(productId, 4).catch(() => []);
  return (
    <RelatedProductsContent related={related} category={category} className={className} />
  );
}
