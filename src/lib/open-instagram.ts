/**
 * Open a specific Instagram reel/post in the native Instagram app.
 *
 * iPhone: custom scheme `instagram://media?id={numericMediaId}`
 *   (shortcode → media id via Instagram’s public base64 alphabet).
 * Android: Chrome intent to that /reel|/p|/tv path.
 */

const SHORTCODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Multiply a decimal string by 64 and add a digit (0–63), no BigInt needed. */
function mul64Add(decimal: string, add: number): string {
  let carry = add;
  let out = '';
  for (let i = decimal.length - 1; i >= 0; i -= 1) {
    const product = Number(decimal[i]) * 64 + carry;
    out = String(product % 10) + out;
    carry = Math.floor(product / 10);
  }
  while (carry > 0) {
    out = String(carry % 10) + out;
    carry = Math.floor(carry / 10);
  }
  return out.replace(/^0+/, '') || '0';
}

/** Instagram shortcode → numeric media id (required by iOS app deep links). */
export function shortcodeToMediaId(shortcode: string): string | null {
  const code = shortcode.trim();
  if (!code || /[^A-Za-z0-9_-]/.test(code)) return null;

  let id = '0';
  for (const char of code) {
    const idx = SHORTCODE_ALPHABET.indexOf(char);
    if (idx < 0) return null;
    id = mul64Add(id, idx);
  }
  if (id === '0') return null;
  return id;
}

export function parseInstagramMedia(
  rawUrl: string,
): {
  kind: 'reel' | 'p' | 'tv';
  code: string;
  mediaId: string | null;
  webUrl: string;
} | null {
  try {
    let candidate = rawUrl.trim().replace(/&amp;/g, '&');
    if (/^(?:www\.)?(?:instagram\.com|instagr\.am)\//i.test(candidate)) {
      candidate = `https://${candidate.replace(/^https?:\/\//i, '')}`;
    }
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'instagram.com' && host !== 'instagr.am') return null;

    let path = url.pathname.replace(/\/+$/, '');
    path = path.replace(/\/embed(?:\/captioned)?$/i, '');
    path = path.replace(/^\/reels\//i, '/reel/');
    path = path
      .replace(/^\/share\/(reel|reels|p|tv)\//i, '/$1/')
      .replace(/^\/reels\//i, '/reel/');

    const match = path.match(/^\/(reel|p|tv)\/([^/?#]+)/i);
    if (!match) return null;

    const kind = match[1].toLowerCase() as 'reel' | 'p' | 'tv';
    const code = match[2];
    return {
      kind,
      code,
      mediaId: shortcodeToMediaId(code),
      // www helps iOS Universal Link association when used as fallback
      webUrl: `https://www.instagram.com/${kind}/${code}/`,
    };
  } catch {
    return null;
  }
}

/** Safe href for <a> (https). App open is handled on click. */
export function getInstagramHref(rawUrl: string): string {
  return parseInstagramMedia(rawUrl)?.webUrl || rawUrl.trim();
}

function isAndroid(): boolean {
  return /android/i.test(window.navigator.userAgent || '');
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function iosDeepLinks(media: {
  kind: 'reel' | 'p' | 'tv';
  code: string;
  mediaId: string | null;
}): string[] {
  const links: string[] = [];
  if (media.mediaId) {
    // Primary: numeric media id opens that exact reel/post in the Instagram app
    links.push(`instagram://media?id=${media.mediaId}`);
    if (media.kind === 'reel') {
      links.push(`instagram://reel?media_id=${media.mediaId}`);
      links.push(`instagram://reel?id=${media.mediaId}`);
    }
  }
  // Shortcode variants as secondary attempts
  if (media.kind === 'reel') {
    links.push(`instagram://reel?id=${encodeURIComponent(media.code)}`);
    links.push(`instagram://reels_share?shortcode=${encodeURIComponent(media.code)}`);
  }
  return links;
}

function openWithAppFallback(appUrls: string[], webUrl: string): void {
  let openedApp = false;
  const markHidden = () => {
    openedApp = true;
  };
  document.addEventListener('visibilitychange', markHidden);
  window.addEventListener('pagehide', markHidden);
  window.addEventListener('blur', markHidden);

  window.location.href = appUrls[0];

  if (appUrls[1]) {
    window.setTimeout(() => {
      if (openedApp || document.hidden) return;
      window.location.href = appUrls[1];
    }, 400);
  }

  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', markHidden);
    window.removeEventListener('pagehide', markHidden);
    window.removeEventListener('blur', markHidden);
    if (openedApp || document.hidden) return;
    window.location.href = webUrl;
  }, 1400);
}

/** Open the specific reel/post in Instagram app (or web fallback). */
export function openInstagramMediaInApp(rawUrl: string): void {
  if (typeof window === 'undefined') return;

  const media = parseInstagramMedia(rawUrl);
  const webUrl = media?.webUrl || rawUrl.trim();
  if (!webUrl) return;

  if (media && isAndroid()) {
    const intent = `intent://www.instagram.com/${media.kind}/${media.code}/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    window.location.href = intent;
    return;
  }

  if (media && isIOS()) {
    const appUrls = iosDeepLinks(media);
    if (appUrls.length) {
      openWithAppFallback(appUrls, webUrl);
      return;
    }
  }

  window.location.href = webUrl;
}

/**
 * Click handler for <a href={getInstagramHref(...)}>.
 * Android: always intercept → Chrome intent to that reel.
 * iPhone: if href is already instagram://media?id=…, allow native open;
 *         otherwise intercept and open via media-id deep link.
 */
export function handleInstagramLinkClick(
  event: { preventDefault: () => void; currentTarget?: EventTarget | null },
  rawUrl: string,
): void {
  if (typeof window === 'undefined') return;

  if (isAndroid()) {
    event.preventDefault();
    openInstagramMediaInApp(rawUrl);
    return;
  }

  if (isIOS()) {
    const target = event.currentTarget as HTMLAnchorElement | null | undefined;
    const href = target?.getAttribute?.('href') || '';
    // Native instagram://media?id=… tap — let iOS open the app to that reel.
    if (href.startsWith('instagram://media?id=')) return;

    event.preventDefault();
    openInstagramMediaInApp(rawUrl);
  }
}
