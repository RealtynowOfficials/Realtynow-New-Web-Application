/**
 * ScrollManager
 * -------------
 * Replaces the old ScrollToTop component.
 *
 * Rules:
 *  • PUSH / REPLACE navigation → scroll to top (normal forward nav)
 *  • POP navigation (Back/Forward) → restore saved scroll position
 *  • Hash navigation → scroll to the anchor element
 *
 * Drop-in replacement for <ScrollToTop /> — no API changes needed.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { saveScrollPosition, getSavedScrollPosition, restoreScrollPosition } from '../lib/scroll-restoration';

export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const savedScrollY = useRef<number | undefined>(undefined);

  // Capture the saved position synchronously before paint so we can use it
  // in the effect below (by then the DOM will have committed the new page).
  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      savedScrollY.current = getSavedScrollPosition();
    } else {
      savedScrollY.current = undefined;
    }
  }, [location.key, navigationType]);

  // Save scroll on every scroll event for the current history entry
  useEffect(() => {
    const onScroll = () => saveScrollPosition();
    window.addEventListener('scroll', onScroll, { passive: true });
    // Also save once on mount (covers programmatic scroll or initial position)
    saveScrollPosition();

    return () => {
      // Save final position before leaving this location
      saveScrollPosition();
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.key]);

  // Apply scroll after paint
  useEffect(() => {
    // ── Hash navigation: scroll to anchor ─────────────────────────────────
    if (location.hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    // ── POP (Back/Forward): restore saved position ─────────────────────────
    if (navigationType === 'POP') {
      const scrollY = savedScrollY.current ?? getSavedScrollPosition();
      if (scrollY !== undefined && scrollY > 0) {
        restoreScrollPosition(scrollY);
      }
      return;
    }

    // ── PUSH / REPLACE: reset to top ──────────────────────────────────────
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.key, location.hash, navigationType]);

  return null;
}
