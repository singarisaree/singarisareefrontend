'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/footer';

/** Legacy Razorpay return URL — forwards to the unified order status page. */
function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      router.replace(`/order/success?order_id=${encodeURIComponent(orderId)}`);
    }
  }, [orderId, router]);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <p className="text-brown-light">Order not found.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button variant="outline">Return home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
      <p className="mt-4 text-brown-light">Confirming your payment…</p>
    </div>
  );
}

export default function OrderReturnPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
          </div>
        }
      >
        <ReturnContent />
      </Suspense>
      <Footer />
    </>
  );
}
