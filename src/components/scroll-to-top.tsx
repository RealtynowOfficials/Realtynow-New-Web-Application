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
  // Tracks the pathname across renders so a query-string-only update (filters,
  // sort, page, etc. via setSearchParams — which still counts as a PUSH/REPLACE
  // navigation with a fresh location.key) can be told apart from an actual
  // navigation to a different page. Without this, typing into any filter bound
  // to the URL yanks scroll back to the top on every keystroke.
  const prevPathnameRef = useRef(location.pathname);

  // Disable browser's automatic scroll restoration to avoid fighting with our logic
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Capture the saved position synchronously before paint so we can use it
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

  // Apply scroll BEFORE paint for fresh navigations to eliminate flash
  useLayoutEffect(() => {
    const pathnameChanged = location.pathname !== prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    // Hash navigation: defer until after paint so the element exists
    if (location.hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    // PUSH / REPLACE to a genuinely different page: reset to top synchronously
    // before the browser paints. A PUSH/REPLACE that only changed the query
    // string (setSearchParams — filters, sort, pagination, ...) must NOT reset
    // scroll; it's still the same page and the user is mid-interaction with it.
    if (navigationType !== 'POP' && pathnameChanged) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.key, location.hash, navigationType, location.pathname]);

  // Apply scroll AFTER paint for Back/Forward restores (needs DOM to be fully laid out)
  useEffect(() => {
    if (navigationType === 'POP' && !location.hash) {
      const scrollY = savedScrollY.current ?? getSavedScrollPosition();
      if (scrollY !== undefined && scrollY > 0) {
        restoreScrollPosition(scrollY);
      }
    }
  }, [location.key, location.hash, navigationType]);

  return null;
}
