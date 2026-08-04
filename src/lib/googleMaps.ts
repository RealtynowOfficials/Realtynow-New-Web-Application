// Google Maps JavaScript API + Places library loader — thin promise wrapper,
// mirroring the pattern in src/lib/msg91.ts (script tag + cached load promise,
// so multiple components mounting the Location step never load the script twice).

const LOAD_TIMEOUT_MS = 15_000;
let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps is not configured (VITE_GOOGLE_MAPS_API_KEY missing)'));
  }

  if (window.google?.maps?.places) {
    loadPromise = Promise.resolve(window.google);
    return loadPromise;
  }

  loadPromise = new Promise<typeof google>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Google Maps script timed out loading')), LOAD_TIMEOUT_MS);

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader]');
    if (existing) {
      existing.addEventListener('load', () => {
        clearTimeout(timer);
        resolve(window.google);
      });
      existing.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('Failed to load Google Maps script'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onload = () => {
      clearTimeout(timer);
      resolve(window.google);
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null; // allow retrying on next call
    throw err;
  });

  return loadPromise;
}
