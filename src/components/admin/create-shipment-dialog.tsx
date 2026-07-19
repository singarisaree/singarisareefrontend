'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminOrderService, type ShiprocketCourierOption, type ShiprocketShippingMode } from '@/services/admin.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn, formatPrice, formatShortOrderNumber } from '@/lib/utils';

function todayStart() {
  return startOfDay(new Date());
}

function toIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function nextFourPickupDates(from = todayStart()) {
  return Array.from({ length: 4 }, (_, i) => addDays(from, i));
}

type BulkQuoteRow = {
  orderId: string;
  orderNumber: string | null;
  courierId: number | null;
  courierName: string | null;
  rate: number | null;
  etd: string | null;
  error: string | null;
};

const SHIPPING_MODES: Array<{ id: ShiprocketShippingMode; label: string; hint: string }> = [
  { id: 'domestic', label: 'India', hint: 'Standard domestic couriers' },
  { id: 'international', label: 'International', hint: 'Shiprocket X forward shipment' },
  { id: 'quick', label: 'Instant', hint: 'Hyperlocal Quick delivery' },
];

function modeNotice(mode: ShiprocketShippingMode): string {
  switch (mode) {
    case 'quick':
      return 'This order is Instant — create Quick shipment only.';
    case 'international':
      return 'This order is International — create International shipment only.';
    default:
      return 'This order is India — create Domestic shipment only.';
  }
}

interface CreateShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One or more confirmed/RTO order ids. Bulk mode auto-picks lowest-rate courier per order. */
  orderIds: string[];
  /** Prefer this mode when dialog opens (e.g. customer chose Instant). */
  initialMode?: ShiprocketShippingMode;
  /**
   * When true (default for single Instant/India/International orders), admin cannot switch
   * India / Instant / International — one shipment type for this order.
   */
  lockMode?: boolean;
  onSuccess: () => void;
}

export function CreateShipmentDialog({
  open,
  onOpenChange,
  orderIds,
  initialMode = 'domestic',
  lockMode = true,
  onSuccess,
}: CreateShipmentDialogProps) {
  const isBulk = orderIds.length > 1;
  const orderId = orderIds[0] ?? null;
  const modeLocked = !isBulk && lockMode;

  const [pickupDate, setPickupDate] = useState<Date>(() => todayStart());
  const [pickupOptions, setPickupOptions] = useState(() => nextFourPickupDates());
  const [couriers, setCouriers] = useState<ShiprocketCourierOption[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couriersLoaded, setCouriersLoaded] = useState(false);
  const [bulkQuotes, setBulkQuotes] = useState<BulkQuoteRow[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesLoaded, setQuotesLoaded] = useState(false);
  // When mode is locked to the order type, always use initialMode (avoids India flash before Instant).
  const [shippingMode, setShippingMode] = useState<ShiprocketShippingMode>(initialMode);
  const effectiveMode: ShiprocketShippingMode = modeLocked ? initialMode : shippingMode;

  const pickupDateIso = pickupDate ? toIsoDate(pickupDate) : '';
  const orderIdsKey = orderIds.join(',');

  useEffect(() => {
    if (!open) return;
    setPickupOptions(nextFourPickupDates());
    setPickupDate(todayStart());
    setCouriers([]);
    setSelectedCourierId(null);
    setCouriersLoaded(false);
    setLoadingCouriers(false);
    setSubmitting(false);
    setBulkQuotes([]);
    setQuotesLoaded(false);
    setLoadingQuotes(false);
    setShippingMode(isBulk ? 'domestic' : initialMode);
  }, [open, orderIdsKey, initialMode, isBulk]);

  const selectedCourier = couriers.find((c) => c.courierId === selectedCourierId) ?? null;

  const readyQuotes = useMemo(
    () =>
      bulkQuotes.filter(
        (q): q is BulkQuoteRow & { courierId: number; rate: number; courierName: string } =>
          q.error == null && q.courierId != null && q.rate != null && Boolean(q.courierName),
      ),
    [bulkQuotes],
  );

  const totalRate = useMemo(
    () => readyQuotes.reduce((sum, q) => sum + q.rate, 0),
    [readyQuotes],
  );

  const clearCourierSelection = () => {
    setCouriers([]);
    setSelectedCourierId(null);
    setCouriersLoaded(false);
  };

  const fetchCouriersForOrder = async (targetOrderId: string, mode: ShiprocketShippingMode) => {
    setLoadingCouriers(true);
    setCouriersLoaded(false);
    setSelectedCourierId(null);
    try {
      const result = await adminOrderService.getAvailableCouriers(targetOrderId, mode);
      setCouriers(result.couriers);
      setCouriersLoaded(true);
      if (result.couriers.length === 0) {
        toast.error(
          mode === 'quick'
            ? 'Quick delivery is not available for this route'
            : 'No courier partners available for this order',
        );
      } else {
        setSelectedCourierId(result.couriers[0].courierId);
      }
    } catch (error) {
      setCouriers([]);
      setCouriersLoaded(true);
      toast.error(getApiErrorMessage(error, 'Could not load shipping options'));
    } finally {
      setLoadingCouriers(false);
    }
  };

  const fetchBulkQuotes = async (ids: string[]) => {
    setLoadingQuotes(true);
    setQuotesLoaded(false);
    try {
      const result = await adminOrderService.quoteBulkShiprocketOrders(ids);
      setBulkQuotes(result.quotes);
      setQuotesLoaded(true);
      if (result.quoteCount === 0) {
        toast.error('No courier quotes available for the selected orders');
      } else if (result.failedCount > 0) {
        toast.error(`${result.failedCount} order(s) could not be quoted`);
      }
    } catch (error) {
      setBulkQuotes([]);
      setQuotesLoaded(true);
      toast.error(getApiErrorMessage(error, 'Could not load shipping quotes'));
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    if (!open || isBulk || !orderId || submitting) return;
    if (effectiveMode !== 'quick' && !pickupDateIso) return;
    void fetchCouriersForOrder(orderId, effectiveMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when open/order/mode/date change
  }, [open, isBulk, orderId, pickupDateIso, effectiveMode]);

  // Bulk: load lowest-price quote per order so admin can confirm total first.
  useEffect(() => {
    if (!open || !isBulk || orderIds.length === 0 || submitting) return;
    void fetchBulkQuotes(orderIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when open/order set changes
  }, [open, isBulk, orderIdsKey]);

  const handlePickupSelect = (date: Date) => {
    const next = startOfDay(date);
    if (toIsoDate(next) === pickupDateIso) return;
    setPickupDate(next);
    if (!isBulk) clearCourierSelection();
  };

  const handleCreate = async () => {
    if (orderIds.length === 0) {
      toast.error('Select at least one order to create shipment');
      return;
    }
    if (!pickupDateIso) {
      toast.error('Select a pickup date');
      return;
    }

    if (isBulk) {
      if (readyQuotes.length === 0) {
        toast.error('No orders ready to ship — check quotes first');
        return;
      }

      setSubmitting(true);
      const toastId = toast.loading(
        `Creating ${readyQuotes.length} shipment(s) · ${formatPrice(totalRate)}…`,
      );
      try {
        const result = await adminOrderService.bulkCreateShiprocketOrders(
          readyQuotes.map((q) => q.orderId),
          pickupDateIso,
          readyQuotes.map((q) => ({
            orderId: q.orderId,
            courierId: q.courierId,
            courierName: q.courierName,
          })),
        );
        toast.dismiss(toastId);
        if (result.successCount > 0) {
          toast.success(`${result.successCount} shipment(s) created`);
          onOpenChange(false);
          onSuccess();
        }
        if (result.failedCount > 0) {
          const lastError = result.failed[0]?.message;
          toast.error(
            result.failedCount === readyQuotes.length && lastError
              ? lastError
              : `${result.failedCount} order(s) could not be shipped`,
          );
        }
      } catch (error) {
        toast.dismiss(toastId);
        toast.error(getApiErrorMessage(error, 'Could not create shipments'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!orderId || !selectedCourier) {
      toast.error(
        effectiveMode === 'quick'
          ? 'Select a Quick delivery option'
          : 'Select a pickup date and courier partner',
      );
      return;
    }

    if (effectiveMode !== 'quick' && !pickupDateIso) {
      toast.error('Select a pickup date');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      effectiveMode === 'quick' ? 'Booking Instant (hyperlocal)...' : 'Creating shipment...',
    );
    try {
      await adminOrderService.createShiprocketOrder(orderId, {
        mode: effectiveMode,
        courierId: selectedCourier.courierId,
        ...(effectiveMode !== 'quick' ? { pickupDate: pickupDateIso } : {}),
        courierName: selectedCourier.courierName,
      });
      toast.dismiss(toastId);
      toast.success('Shipment created');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(getApiErrorMessage(error, 'Could not create shipment'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = isBulk
    ? readyQuotes.length > 0 && Boolean(pickupDateIso) && !submitting && !loadingQuotes
    : Boolean(selectedCourier && orderId) &&
      !submitting &&
      (effectiveMode === 'quick' || Boolean(pickupDateIso));

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Create shipments (${orderIds.length})` : 'Create shipment'}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? 'Review the lowest-price courier for each order and total shipping cost, then confirm.'
              : effectiveMode === 'quick'
                ? 'Book Instant (hyperlocal) delivery for this order.'
                : 'Choose a pickup date and courier partner for this order.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {!isBulk && modeLocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {modeNotice(effectiveMode)}
            </div>
          ) : null}

          {!isBulk && !modeLocked && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#475569]">Shipping mode</p>
              <div className="grid grid-cols-3 gap-1.5">
                {SHIPPING_MODES.map((mode) => {
                  const selected = shippingMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={submitting || loadingCouriers}
                      onClick={() => {
                        if (mode.id === shippingMode) return;
                        setShippingMode(mode.id);
                        clearCourierSelection();
                      }}
                      className={cn(
                        'rounded-md border px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-[#0f172a] bg-[#0f172a] text-white'
                          : 'border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]',
                      )}
                    >
                      <span className="block text-[11px] font-semibold">{mode.label}</span>
                      <span
                        className={cn(
                          'mt-0.5 block text-[9px] leading-tight',
                          selected ? 'text-white/70' : 'text-[#94a3b8]',
                        )}
                      >
                        {mode.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(isBulk || effectiveMode !== 'quick') && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#475569]">Pickup date</p>
            <div className="grid grid-cols-4 gap-1.5">
              {pickupOptions.map((date, index) => {
                const selected = toIsoDate(date) === pickupDateIso;
                return (
                  <button
                    key={toIsoDate(date)}
                    type="button"
                    disabled={submitting || loadingCouriers || loadingQuotes}
                    onClick={() => handlePickupSelect(date)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      selected
                        ? 'border-[#0f172a] bg-[#0f172a] text-white'
                        : 'border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]',
                    )}
                  >
                    <span
                      className={cn(
                        'block text-[9px] font-medium leading-tight',
                        selected ? 'text-white/70' : 'text-[#94a3b8]',
                      )}
                    >
                      {index === 0 ? 'Today' : format(date, 'EEE')}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold leading-tight">
                      {format(date, 'MMM d')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {isBulk ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                  Lowest-price courier per order
                </p>
                {loadingQuotes && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Quoting…
                  </span>
                )}
              </div>

              {quotesLoaded && (
                <>
                  {bulkQuotes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e2e8f0] px-4 py-8 text-center text-sm text-[#94a3b8]">
                      No quotes available.
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {bulkQuotes.map((quote) => {
                        const label = quote.orderNumber
                          ? formatShortOrderNumber(quote.orderNumber)
                          : quote.orderId.slice(0, 8);
                        const failed = Boolean(quote.error);
                        return (
                          <div
                            key={quote.orderId}
                            className={cn(
                              'rounded-lg border px-3 py-2.5',
                              failed
                                ? 'border-[#fecaca] bg-[#fef2f2]'
                                : 'border-[#e2e8f0] bg-white',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
                                {failed ? (
                                  <p className="mt-0.5 text-xs text-[#b91c1c]">{quote.error}</p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-[#64748b]">
                                    {quote.courierName}
                                    {quote.etd ? ` · ETD ${quote.etd}` : ''}
                                  </p>
                                )}
                              </div>
                              {!failed && quote.rate != null && (
                                <p className="shrink-0 text-sm font-semibold text-[#0f172a]">
                                  {formatPrice(quote.rate)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 py-3 text-white">
                    <div>
                      <p className="text-xs font-medium text-white/70">Total shipping</p>
                      <p className="text-xs text-white/60">
                        {readyQuotes.length} of {orderIds.length} order(s) ready
                      </p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums">{formatPrice(totalRate)}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#64748b]">
                  {effectiveMode === 'quick'
                    ? 'Instant hyperlocal partners for this route. Requires delivery coordinates on the order.'
                    : 'Available partners are based on the order weight, size, and delivery pincode.'}
                </p>
                {loadingCouriers && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading couriers…
                  </span>
                )}
              </div>

              {couriersLoaded && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                    {effectiveMode === 'quick' ? 'Instant hyperlocal partners' : 'Available courier partners'}
                  </p>
                  {couriers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e2e8f0] px-4 py-8 text-center text-sm text-[#94a3b8]">
                      No courier partners available for this route.
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {couriers.map((courier) => {
                        const selected = selectedCourierId === courier.courierId;
                        return (
                          <label
                            key={courier.courierId}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                              selected
                                ? 'border-[#0f172a] bg-[#f8fafc]'
                                : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="courier"
                              className="mt-1 h-4 w-4 border-[#cbd5e1] text-[#0f172a] accent-[#0f172a]"
                              checked={selected}
                              disabled={submitting}
                              onChange={() => setSelectedCourierId(courier.courierId)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-semibold text-[#0f172a]">
                                  {courier.courierName}
                                </span>
                                <span className="shrink-0 text-sm font-semibold text-[#0f172a]">
                                  {formatPrice(courier.rate)}
                                </span>
                              </span>
                              <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#64748b]">
                                {courier.etd && <span>ETD: {courier.etd}</span>}
                                {courier.rating != null && <span>Rating: {courier.rating}</span>}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? 'Creating…'
              : isBulk
                ? `Confirm · ${formatPrice(totalRate)}`
                : effectiveMode === 'quick'
                  ? 'Create Instant shipment'
                  : 'Create shipment'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
