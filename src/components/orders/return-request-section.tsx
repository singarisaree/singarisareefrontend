'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReturnImageUpload } from '@/components/orders/return-image-upload';
import { returnRequestService } from '@/services/store.service';
import {
  formatDate,
  formatPrice,
  getReturnRequestStatusColor,
  getReturnRequestStatusLabel,
} from '@/lib/utils';
import {
  RETURN_WINDOW_DAYS,
  canRequestReturn,
  formatReturnDeadline,
  getLatestReturn,
  getReturnPolicySummary,
  getReturnableQuantities,
  hasActiveReturnRequest,
  isOrderRefunded,
  isWithinReturnWindow,
} from '@/lib/order-return';
import type { Order, ReturnRequest } from '@/types';
import { RETURN_REASONS } from '@/types';

interface ReturnRequestSectionProps {
  order: Order;
  phone: string;
  onSubmitted: (request: ReturnRequest) => void;
}

export function ReturnRequestSection({ order, phone, onSubmitted }: ReturnRequestSectionProps) {
  const latestReturn = getLatestReturn(order);
  const returnable = useMemo(() => getReturnableQuantities(order), [order]);
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [images, setImages] = useState<Array<File | null>>([null, null, null]);
  const [previews, setPreviews] = useState<Array<string | null>>([null, null, null]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isOrderRefunded(order)) return null;
  if (order.status !== 'DELIVERED' && order.status !== 'RETURNED') return null;

  const withinWindow = isWithinReturnWindow(order);
  const showForm = canRequestReturn(order);
  const returnDeadline = formatReturnDeadline(order);
  const activeReturn = hasActiveReturnRequest(order);
  const returnableItems = order.items.filter((item) => (returnable[item.id] ?? 0) > 0);

  const toggleItem = (orderItemId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      if (prev[orderItemId]) {
        const next = { ...prev };
        delete next[orderItemId];
        return next;
      }
      return { ...prev, [orderItemId]: Math.min(1, maxQty) };
    });
  };

  const setItemQty = (orderItemId: string, qty: number, maxQty: number) => {
    const clamped = Math.max(1, Math.min(maxQty, qty));
    setSelectedItems((prev) => ({ ...prev, [orderItemId]: clamped }));
  };

  const handleSubmit = async () => {
    const finalReason = reason === 'Other' ? otherReason.trim() : reason;
    if (finalReason.length < 5) {
      toast.error('Please provide a return reason');
      return;
    }

    const items = Object.entries(selectedItems).map(([orderItemId, quantity]) => ({
      orderItemId,
      quantity,
    }));
    if (items.length < 1) {
      toast.error('Select at least one item to return');
      return;
    }

    const uploadedImages = images.filter((file): file is File => file !== null);
    if (uploadedImages.length < 3) {
      toast.error('Please upload all 3 product photos');
      return;
    }

    setIsSubmitting(true);
    try {
      const request = await returnRequestService.create({
        orderId: order.id,
        phone,
        reason: finalReason,
        items,
        images: uploadedImages,
      });
      toast.success('Return request submitted');
      previews.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      setImages([null, null, null]);
      setPreviews([null, null, null]);
      setReason(RETURN_REASONS[0]);
      setOtherReason('');
      setSelectedItems({});
      onSubmitted(request);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id={`return-${order.id}`} className="mt-6 border-t border-beige pt-6 scroll-mt-24">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-medium">Return</h3>
      </div>

      {latestReturn && (
        <div className="mt-4 space-y-3">
          <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getReturnRequestStatusColor(latestReturn.status)}`}>
            {getReturnRequestStatusLabel(latestReturn.status)}
          </div>

          {latestReturn.items && latestReturn.items.length > 0 && (
            <ul className="mt-1 space-y-3">
              {latestReturn.items.map((item) => {
                const unit = Number(item.orderItem?.unitPrice ?? 0);
                const lineTotal = unit * item.quantity;
                return (
                  <li key={item.id} className="flex gap-3">
                    {item.orderItem?.imageUrl ? (
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-beige">
                        <Image
                          src={item.orderItem.imageUrl}
                          alt={item.orderItem.productName || 'Product'}
                          fill
                          sizes="3rem"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-12 shrink-0 rounded bg-beige" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal">
                        {item.orderItem?.productName ?? 'Item'}
                      </p>
                      <p className="mt-0.5 text-xs text-brown-light">
                        Color: {item.orderItem?.colorName || '—'}
                        {' · '}
                        Qty: <span className="font-medium text-charcoal">{item.quantity}</span>
                      </p>
                      <p className="mt-1 text-sm text-charcoal">{formatPrice(lineTotal)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {latestReturn.status === 'REJECTED' && latestReturn.adminNotes && (
            <p className="text-xs text-brown-light">Note: {latestReturn.adminNotes}</p>
          )}

          {latestReturn.refundCouponCode && (
            <p className="text-xs text-charcoal">
              Store credit coupon:{' '}
              <span className="font-medium">{latestReturn.refundCouponCode}</span>
              . Usable on future orders with the same mobile number until the balance is used up.
            </p>
          )}

          <p className="text-xs text-brown-light">
            Requested on {formatDate(latestReturn.createdAt)}. Full progress is in Tracking under
            Order Details.
          </p>
        </div>
      )}

      {!withinWindow && !activeReturn && (
        <p className="mt-3 text-sm text-brown-light">
          Return window closed
          {returnDeadline ? ` on ${returnDeadline}.` : '.'} Returns are accepted within{' '}
          {RETURN_WINDOW_DAYS} days of delivery.
        </p>
      )}

      {showForm && (
        <div className="mt-4 space-y-4 rounded-lg border border-beige p-4">
          <div className="rounded-lg bg-beige/40 px-3 py-2 text-xs text-brown-light">
            <p>{getReturnPolicySummary()}</p>
            {returnDeadline && (
              <p className="mt-1 font-medium text-charcoal">Return available till {returnDeadline}</p>
            )}
            <Link href="/refund-policy" className="mt-1 inline-block text-gold hover:underline">
              Read full return policy
            </Link>
          </div>

          <p className="text-sm text-brown-light">
            {latestReturn?.status === 'REJECTED'
              ? 'Your previous return was rejected. You can submit a new request within the return window.'
              : latestReturn?.status === 'RETURNED'
                ? 'Select remaining items to return.'
                : 'Select the items you want to return.'}
          </p>

          <div>
            <Label>Items to return</Label>
            {returnableItems.length === 0 ? (
              <p className="mt-2 text-sm text-brown-light">No items left to return on this order.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {returnableItems.map((item) => {
                  const maxQty = returnable[item.id] ?? 0;
                  const selected = selectedItems[item.id];
                  const checked = selected != null;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-beige px-3 py-2"
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.id, maxQty)}
                          className="h-4 w-4 accent-[var(--gold,#b8860b)]"
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-charcoal">{item.productName}</span>
                          <span className="block text-xs text-brown-light">
                            {item.colorName} · up to {maxQty} available
                          </span>
                        </span>
                      </label>
                      {checked && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${item.id}`} className="sr-only">
                            Quantity
                          </Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min={1}
                            max={maxQty}
                            value={selected}
                            onChange={(e) =>
                              setItemQty(item.id, Number(e.target.value) || 1, maxQty)
                            }
                            className="w-20"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor={`reason-${order.id}`}>Return Reason</Label>
            <select
              id={`reason-${order.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-beige bg-white px-3 py-2 text-sm"
            >
              {RETURN_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <Label htmlFor={`other-reason-${order.id}`}>Describe the issue</Label>
              <textarea
                id={`other-reason-${order.id}`}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-beige bg-white px-3 py-2 text-sm"
                placeholder="Tell us why you want to return"
              />
            </div>
          )}

          <div>
            <Label>Product Photos (3 required)</Label>
            <div className="mt-2">
              <ReturnImageUpload
                images={images}
                previews={previews}
                onChange={(nextImages, nextPreviews) => {
                  setImages(nextImages);
                  setPreviews(nextPreviews);
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="gold"
            disabled={isSubmitting || returnableItems.length === 0}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Request Return'}
          </Button>
        </div>
      )}
    </div>
  );
}
