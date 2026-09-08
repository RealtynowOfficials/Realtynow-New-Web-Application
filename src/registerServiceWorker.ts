export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // In development mode, automatically unregister any active Service Worker AND purge CacheStorage
  // to ensure 100% clean HMR without any stale SW interception or cached assets
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) console.log('[DEV] Unregistered Service Worker on scope:', registration.scope);
        });
      }
    });

    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key).then(() => {
            console.log('[DEV] Purged stale CacheStorage:', key);
          });
        }
      });
    }
    return;
  }

  // Production PWA Registration & Auto-Update Lifecycle
  window.addEventListener('load', () => {
    let refreshing = false;

    // Reload page once when new service worker takes control (new deployment discovered)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] New deployment active. Seamlessly reloading application...');
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered (scope:', registration.scope, ')');

        // Check for updates on load and on tab focus
        registration.update().catch(() => {});

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[PWA] New build installed. Triggering immediate activation...');
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                console.log('[PWA] Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}

