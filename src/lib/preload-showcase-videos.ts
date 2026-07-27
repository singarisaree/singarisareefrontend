const PRELOAD_TIMEOUT_MS = 20_000;

const preloadPromises = new Map<string, Promise<void>>();

function preloadOne(src: string): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();

  const existing = preloadPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, PRELOAD_TIMEOUT_MS);
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('canplaythrough', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.src = src;
    video.load();
  });

  preloadPromises.set(src, promise);
  return promise;
}

export function preloadShowcaseVideo(src: string): Promise<void> {
  return preloadOne(src);
}

export function preloadShowcaseVideos(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !urls.length) return Promise.resolve();
  return Promise.all(urls.map(preloadOne)).then(() => undefined);
}

/** Warm the clicked reel first, then the rest (reuses cached promises). */
export function preloadShowcaseVideosWithPriority(urls: string[], priorityIndex: number): Promise<void> {
  if (!urls.length) return Promise.resolve();
  const safeIndex = Math.max(0, Math.min(urls.length - 1, priorityIndex));
  const priority = urls[safeIndex];
  const rest = urls.filter((_, i) => i !== safeIndex);
  return preloadOne(priority).then(() => {
    void Promise.all(rest.map(preloadOne));
  });
}
