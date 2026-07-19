import { User } from 'lucide-react';
import type { CustomerReview } from '@/types';
import { StarRating } from '@/components/reviews/star-rating';
import { cn } from '@/lib/utils';

interface ProductReviewsContentProps {
  reviews: CustomerReview[];
  className?: string;
}

function CustomerAvatar() {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15"
      aria-hidden
    >
      <User className="h-4 w-4 text-gold" />
    </div>
  );
}

function ReviewCard({ review }: { review: CustomerReview }) {
  return (
    <article className="rounded-lg border border-gold/15 bg-beige/40 p-5">
      <div className="flex items-start gap-3">
        <CustomerAvatar />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-charcoal">{review.customerName}</p>
            <StarRating rating={review.rating} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-brown-light">{review.comment}</p>
        </div>
      </div>
    </article>
  );
}

export function ProductReviewsContent({ reviews, className }: ProductReviewsContentProps) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section
      id="product-reviews"
      className={cn('w-full border-t border-gold/20 pt-8 lg:pt-10', className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15">
            <User className="h-5 w-5 text-gold" aria-hidden />
          </div>
          <div>
            <h2 className="font-serif text-xl text-charcoal sm:text-2xl">Customer Reviews</h2>
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={Math.round(average)} size="md" />
              <span className="text-sm text-brown-light">
                {average.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
