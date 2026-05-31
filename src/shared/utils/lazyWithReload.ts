import { lazy, type ComponentType } from 'react';

/**
 * Drop-in replacement for React.lazy that survives chunk-not-found errors.
 *
 * On a static deploy, each build emits content-hashed chunks (e.g.
 * LoginPage-D_rK3VU6.js). When a new version is deployed, the old chunks are
 * removed from the CDN. A browser still running the previous build — or holding
 * a cached index.html — then requests a hash that no longer exists and React
 * throws "Failed to fetch dynamically imported module" (a 404).
 *
 * This wrapper forces a single full reload on that failure, which fetches the
 * fresh index.html and the current chunk hashes. A sessionStorage guard ensures
 * we reload at most once, so a genuinely missing chunk surfaces the real error
 * instead of looping.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  const RELOAD_KEY = 'luke:chunk-reload';
  return lazy(async () => {
    try {
      const mod = await factory();
      // Successful load — clear the guard so a future deploy can reload again.
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        // Never resolve, so React shows the existing fallback until the reload
        // takes over rather than flashing an error boundary.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
