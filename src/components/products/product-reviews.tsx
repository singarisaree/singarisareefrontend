'use client';

import { useQuery } from '@tanstack/react-query';
import { homeService } from '@/services/store.service';
import type { CustomerReview } from '@/types';
import { ProductReviewsContent } from '@/components/products/product-reviews-content';

interface ProductReviewsProps {
  productId: string;
  initialReviews?: CustomerReview[];
  className?: string;
}

export function ProductReviews({ productId, initialReviews, className }: ProductReviewsProps) {
  const { data: reviews = initialReviews ?? [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => homeService.getProductReviews(productId),
    enabled: !!productId && initialReviews === undefined,
    initialData: initialReviews,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading && reviews.length === 0) return null;

  return <ProductReviewsContent reviews={reviews} className={className} />;
}
