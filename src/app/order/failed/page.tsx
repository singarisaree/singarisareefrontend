'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function FailedRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      router.replace(`/order/success?order_id=${encodeURIComponent(orderId)}`);
    } else {
      router.replace('/checkout');
    }
  }, [orderId, router]);

  return (
    <div className="py-20 text-center text-brown-light">
      Redirecting…
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading…</div>}>
      <FailedRedirect />
    </Suspense>
  );
}
