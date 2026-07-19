import { serverStore } from '@/lib/server-store';
import { ProductReviewsContent } from '@/components/products/product-reviews-content';

interface ProductReviewsAsyncProps {
  productId: string;
  className?: string;
}

export async function ProductReviewsAsync({ productId, className }: ProductReviewsAsyncProps) {
  const reviews = await serverStore.getProductReviews(productId).catch(() => []);
  return <ProductReviewsContent reviews={reviews} className={className} />;
}
