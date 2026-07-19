'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { PRODUCT_SHIPPING_RETURNS } from '@/lib/product-shipping-returns';
import { cn } from '@/lib/utils';

export function ShippingReturnsAccordion({ className }: { className?: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-maroon/20', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-maroon px-4 py-3 text-left text-sm font-semibold tracking-wide text-white transition-colors hover:bg-maroon-dark sm:px-5"
      >
        <span>Shipping &amp; Returns</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-white transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-5 bg-white px-4 py-5 text-sm text-charcoal sm:px-5">
          <div>
            <h3 className="text-xs font-bold tracking-[0.14em] text-maroon">
              {PRODUCT_SHIPPING_RETURNS.deliveryTitle}
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.8125rem] leading-relaxed text-charcoal/90">
              {PRODUCT_SHIPPING_RETURNS.deliveryPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-[0.14em] text-maroon">
              {PRODUCT_SHIPPING_RETURNS.returnsTitle}
            </h3>
            <div className="mt-2 space-y-2 text-[0.8125rem] leading-relaxed text-charcoal/90">
              {PRODUCT_SHIPPING_RETURNS.returnsParagraphs.map((paragraph, index) => (
                <p key={paragraph}>
                  {index === PRODUCT_SHIPPING_RETURNS.returnsParagraphs.length - 1 ? (
                    <>
                      We have an easy and hassle return policy. Please look at our{' '}
                      <Link
                        href={PRODUCT_SHIPPING_RETURNS.shippingPolicyHref}
                        className="font-medium text-maroon underline underline-offset-2 hover:text-maroon-dark"
                      >
                        Shipping
                      </Link>{' '}
                      &amp;{' '}
                      <Link
                        href={PRODUCT_SHIPPING_RETURNS.returnsPolicyHref}
                        className="font-medium text-maroon underline underline-offset-2 hover:text-maroon-dark"
                      >
                        Returns
                      </Link>{' '}
                      section for further information.
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
