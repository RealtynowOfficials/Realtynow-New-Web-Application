/**
 * useScrollRestoration — React hook
 * ----------------------------------
 * Drop this into any page/layout that needs scroll position memory.
 *
 * How it works
 * ------------
 * 1. On every PUSH/REPLACE navigation the hook listens to `beforeunload`-style
 *    events via React Router's location change to persist scrollY first.
 * 2. On POP navigation (browser Back/Forward) it reads the saved position and
 *    restores it after the page has rendered.
 * 3. Navbar / logo clicks are PUSH navigations → scroll resets to top as usual.
 *
 * Usage
 * -----
 *   // In your layout or page root:
 *   useScrollRestoration();
 *
 * Or if you want to delay restoration until some async data is ready:
 *   const { restoreWhenReady } = useScrollRestoration({ manual: true });
 *   useEffect(() => { if (dataLoaded) restoreWhenReady(); }, [dataLoaded]);
 */

import { useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  saveScrollPosition,
  getSavedScrollPosition,
  restoreScrollPosition,
} from './scroll-restoration';

interface UseScrollRestorationOptions {
  /**
   * If true, automatic restoration is disabled.
   * Call the returned `restoreWhenReady()` manually once content is loaded.
   */
  manual?: boolean;
}

interface UseScrollRestorationResult {
  /** Trigger restoration manually (useful when data is async). */
  restoreWhenReady: () => void;
}

export function useScrollRestoration(
  options: UseScrollRestorationOptions = {},
): UseScrollRestorationResult {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { manual = false } = options;

  // Track whether we have already restored scroll for this navigation
  const restoredRef = useRef(false);
  // Cache the scroll position to restore at navigation time (not at render time)
  const pendingScrollY = useRef<number | undefined>(undefined);

  // ── Step 1: Save position before leaving ──────────────────────────────────
  // We save on every render where the PREVIOUS location's scroll is still live.
  // This fires before React commits the new page, so scrollY is still the old one.
  useLayoutEffect(() => {
    // Reset the restored flag for this new navigation
    restoredRef.current = false;

    if (navigationType === 'POP') {
      // On POP we want to restore — read the target position now
      pendingScrollY.current = getSavedScrollPosition();
    } else {
      // On PUSH/REPLACE, save current position under current history key
      // (this captures where the user was on the PREVIOUS page, because
      //  history.state.key has already updated to the new entry here —
      //  so we save at pagehide via the event listener below instead)
      pendingScrollY.current = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, navigationType]);

  // ── Save on route departure (before new page renders) ─────────────────────
  // We listen to the native `pagehide` to handle tab close, but for SPA
  // navigations we hook into a scroll event + location change pattern.
  useEffect(() => {
    // Save on scroll so the value is always fresh
    const onScroll = () => saveScrollPosition();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      // When this effect cleanup runs, the component is leaving this location
      // — save one final position before unmounting
      saveScrollPosition();
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.key]);

  // ── Step 2: Restore position after render ─────────────────────────────────
  const restoreWhenReady = useCallback(() => {
    if (restoredRef.current) return;
    if (navigationType !== 'POP') return;

    const scrollY = pendingScrollY.current ?? getSavedScrollPosition();
    if (scrollY !== undefined && scrollY > 0) {
      restoredRef.current = true;
      restoreScrollPosition(scrollY);
    }
  }, [navigationType]);

  useEffect(() => {
    if (manual) return; // Let the consumer call restoreWhenReady() manually
    if (navigationType !== 'POP') {
      // PUSH / REPLACE: scroll to top (normal forward navigation)
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    // POP: restore after two animation frames (content should be mounted)
    const scrollY = pendingScrollY.current ?? getSavedScrollPosition();
    if (scrollY !== undefined && scrollY > 0) {
      restoredRef.current = true;
      restoreScrollPosition(scrollY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, navigationType, manual]);

  return { restoreWhenReady };
}
