/**
 * Open an Instagram reel/post in the Instagram app when possible.
 * Avoids target=_blank (often forces Instagram mobile web).
 */

export function parseInstagramMedia(
  rawUrl: string,
): { kind: 'reel' | 'p' | 'tv'; code: string; webUrl: string } | null {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'instagram.com' && host !== 'instagr.am') return null;

    let path = url.pathname.replace(/\/+$/, '');
    path = path.replace(/\/embed(?:\/captioned)?$/i, '');
    path = path.replace(/^\/reels\//i, '/reel/');
    path = path
      .replace(/^\/share\/(reel|reels|p|tv)\//i, '/$1/')
      .replace(/^\/reels\//i, '/reel/');

    const match = path.match(/^\/(reel|p|tv)\/([^/]+)$/i);
    if (!match) return null;

    const kind = match[1].toLowerCase() as 'reel' | 'p' | 'tv';
    const code = match[2];
    return {
      kind,
      code,
      webUrl: `https://www.instagram.com/${kind}/${code}/`,
    };
  } catch {
    return null;
  }
}

/** Prefer Instagram app deep link / Android intent; fall back to same-tab web URL. */
export function openInstagramMediaInApp(rawUrl: string): void {
  if (typeof window === 'undefined') return;

  const media = parseInstagramMedia(rawUrl);
  const webUrl = media?.webUrl || rawUrl.trim();
  if (!webUrl) return;

  const ua = window.navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (media && isAndroid) {
    // Opens Instagram app to that media; falls back to browser if app missing.
    const intent = `intent://www.instagram.com/${media.kind}/${media.code}/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
    window.location.href = intent;
    return;
  }

  if (media && isIOS) {
    // Try native scheme first, then Universal Link / web if app did not open.
    const appUrl =
      media.kind === 'reel'
        ? `instagram://reel?shortcode=${encodeURIComponent(media.code)}`
        : `instagram://media?shortcode=${encodeURIComponent(media.code)}`;

    const started = Date.now();
    window.location.href = appUrl;

    window.setTimeout(() => {
      // If still on this page shortly after, app likely did not open.
      if (Date.now() - started < 1800 && !document.hidden) {
        window.location.href = webUrl;
      }
    }, 900);
    return;
  }

  // Desktop / unknown: same-tab Instagram URL (better chance of app handoff than _blank).
  window.location.href = webUrl;
}
