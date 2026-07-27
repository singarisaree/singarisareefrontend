import { formatTime } from '@/lib/utils';

const DEFAULT_INSTANT_MS = 60 * 60 * 1000;

/** Parse Instant ETA labels ("45 min", "About 1 hour", "90", "same day") into milliseconds. */
export function parseQuickEtaDurationMs(eta: string | null | undefined): number | null {
  if (eta == null || !String(eta).trim()) return null;
  const raw = String(eta).trim();

  if (/same.?day|today/i.test(raw)) return DEFAULT_INSTANT_MS;

  if (/^\d+$/.test(raw)) {
    const mins = Number(raw);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const aboutHours = raw.match(/about\s+(\d+(?:\.\d+)?)\s+hours?/i);
  if (aboutHours) {
    const hours = Number(aboutHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  const aboutMins = raw.match(/(?:about\s+)?(\d+)\s+min(?:utes?)?/i);
  if (aboutMins) {
    const mins = Number(aboutMins[1]);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const plainHours = raw.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
  if (plainHours) {
    const hours = Number(plainHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  return null;
}

export function formatInstantArrivesByTime(
  etaMinutes?: string | null,
  estimatedDelivery?: string | Date | null,
): string {
  const durationMs = parseQuickEtaDurationMs(etaMinutes ?? undefined);
  if (durationMs != null) {
    return formatTime(new Date(Date.now() + durationMs));
  }

  if (estimatedDelivery != null) {
    const eta =
      estimatedDelivery instanceof Date ? estimatedDelivery : new Date(estimatedDelivery);
    if (Number.isFinite(eta.getTime())) {
      const looksLikeDateOnly =
        eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
      const arriveAt = looksLikeDateOnly ? new Date(Date.now() + DEFAULT_INSTANT_MS) : eta;
      return formatTime(arriveAt);
    }
  }

  return formatTime(new Date(Date.now() + DEFAULT_INSTANT_MS));
}

/** Checkout / cards: “Arrives by 4:52 PM”. */
export function formatQuickEtaLabel(
  etaMinutes?: string | null,
  estimatedDelivery?: string | null,
): string {
  return `Arrives by ${formatInstantArrivesByTime(etaMinutes, estimatedDelivery)}`;
}
