import { formatTime } from '@/lib/utils';

const DEFAULT_INSTANT_MS = 60 * 60 * 1000;

/** Round up to the next N-minute mark so the clock time stays clean (e.g. 1:00 pm). */
function roundUpToMinuteStep(date: Date, stepMinutes = 5): Date {
  const stepMs = stepMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

/** True when a string looks like a clock time ("4:52 PM", "16:30"). */
function parseClockTimeToDate(raw: string): Date | null {
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const period = ampm[3].toLowerCase();
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59 || hours < 1 || hours > 12) {
      return null;
    }
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    if (d.getTime() < Date.now() - 5 * 60_000) d.setDate(d.getDate() + 1);
    return d;
  }

  const twentyFour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2]);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    if (d.getTime() < Date.now() - 5 * 60_000) d.setDate(d.getDate() + 1);
    return d;
  }

  return null;
}

/** Minutes from a distance label like "~5.2 km" (same formula as backend). */
function minutesFromDistanceLabel(raw: string): number | null {
  const kmMatch = raw.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (!kmMatch) return null;
  const km = Number(kmMatch[1]);
  if (!Number.isFinite(km) || km <= 0) return null;
  return Math.min(180, Math.max(30, Math.round(20 + km * 4)));
}

/** Parse Instant ETA labels ("45 min", "About 1 hour", "90", "~5 km") into milliseconds. */
export function parseQuickEtaDurationMs(eta: string | null | undefined): number | null {
  if (eta == null || !String(eta).trim()) return null;
  const raw = String(eta).trim();

  const fromKm = minutesFromDistanceLabel(raw);
  if (fromKm != null) return fromKm * 60_000;

  if (/same.?day|today/i.test(raw)) return DEFAULT_INSTANT_MS;

  if (/^\d+$/.test(raw)) {
    const mins = Number(raw);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const rangeMins = raw.match(/(\d+)\s*[-–]\s*(\d+)\s*min/i);
  if (rangeMins) {
    const high = Number(rangeMins[2]);
    return Number.isFinite(high) && high > 0 ? high * 60_000 : null;
  }

  const aboutHours = raw.match(/about\s+(\d+(?:\.\d+)?)\s+hours?/i);
  if (aboutHours) {
    const hours = Number(aboutHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  const aboutMins = raw.match(/(?:about\s+|~)?(\d+)\s*min(?:utes?)?/i);
  if (aboutMins) {
    const mins = Number(aboutMins[1]);
    return Number.isFinite(mins) && mins > 0 ? mins * 60_000 : null;
  }

  const plainHours = raw.match(/^~?\s*(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
  if (plainHours) {
    const hours = Number(plainHours[1]);
    return Number.isFinite(hours) && hours > 0 ? hours * 3_600_000 : null;
  }

  const hoursAndMins = raw.match(/(\d+)\s*h(?:ours?)?\s*(?:and\s*)?(\d+)\s*m/i);
  if (hoursAndMins) {
    const hours = Number(hoursAndMins[1]);
    const mins = Number(hoursAndMins[2]);
    if (Number.isFinite(hours) && Number.isFinite(mins) && (hours > 0 || mins > 0)) {
      return hours * 3_600_000 + mins * 60_000;
    }
  }

  return null;
}

export function formatInstantArrivesByTime(
  etaMinutes?: string | null,
  estimatedDelivery?: string | Date | null,
): string {
  const raw = etaMinutes != null ? String(etaMinutes).trim() : '';

  if (raw) {
    const clock = parseClockTimeToDate(raw);
    if (clock) return formatTime(roundUpToMinuteStep(clock));

    const asDate = new Date(raw);
    if (
      Number.isFinite(asDate.getTime()) &&
      (/^\d{4}-\d{2}-\d{2}/.test(raw) || raw.includes('T') || /gmt|utc|\+\d{2}/i.test(raw))
    ) {
      return formatTime(roundUpToMinuteStep(asDate));
    }
  }

  const durationMs = parseQuickEtaDurationMs(etaMinutes ?? undefined);
  if (durationMs != null) {
    return formatTime(roundUpToMinuteStep(new Date(Date.now() + durationMs)));
  }

  if (estimatedDelivery != null) {
    const eta =
      estimatedDelivery instanceof Date ? estimatedDelivery : new Date(estimatedDelivery);
    if (Number.isFinite(eta.getTime())) {
      const looksLikeDateOnly =
        eta.getHours() === 0 && eta.getMinutes() === 0 && eta.getSeconds() === 0;
      const arriveAt = looksLikeDateOnly ? new Date(Date.now() + DEFAULT_INSTANT_MS) : eta;
      return formatTime(roundUpToMinuteStep(arriveAt));
    }
  }

  return formatTime(roundUpToMinuteStep(new Date(Date.now() + DEFAULT_INSTANT_MS)));
}

/** Checkout: “Delivery by 1:00 pm” — clock only, no duration text. */
export function formatQuickEtaLabel(
  etaMinutes?: string | null,
  estimatedDelivery?: string | null,
): string {
  return `Delivery by ${formatInstantArrivesByTime(etaMinutes, estimatedDelivery)}`;
}
