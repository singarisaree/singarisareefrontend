const PRELOAD_TIMEOUT_MS = 20_000;

export function preloadShowcaseVideos(urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !urls.length) return Promise.resolve();

  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
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
          video.addEventListener('canplaythrough', finish, { once: true });
          video.addEventListener('error', finish, { once: true });
          video.src = src;
          video.load();
        }),
    ),
  ).then(() => undefined);
}
