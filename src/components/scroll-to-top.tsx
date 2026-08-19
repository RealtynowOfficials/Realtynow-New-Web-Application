/**
 * ScrollManager
 * -------------
 * Manages scroll restoration & reset across navigations.
 *
 * Rules:
 *  • Initial page load / Page refresh → ALWAYS scroll to the top (top: 0, left: 0)
 *  • PUSH / REPLACE navigation → scroll to top (normal forward nav)
 *  • POP navigation (browser Back/Forward) → restore saved scroll position
 *  • Hash navigation → scroll to anchor element
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  saveScrollPosition,
  getSavedScrollPosition,
  restoreScrollPosition,
  clearAllSavedScrollPositions,
} from '../lib/scroll-restoration';

export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const savedScrollY = useRef<number | undefined>(undefined);
  const isInitialMountRef = useRef(true);
  const prevPathnameRef = useRef(location.pathname);

  // Disable browser's automatic scroll restoration on load/refresh so it never restores stale footer positions
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Always start at the top on initial page load / refresh
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    clearAllSavedScrollPositions();
  }, []);

  // Capture saved position ONLY for genuine in-session browser Back/Forward (POP) navigations
  useLayoutEffect(() => {
    if (navigationType === 'POP' && !isInitialMountRef.current) {
      savedScrollY.current = getSavedScrollPosition();
    } else {
      savedScrollY.current = undefined;
    }
  }, [location.key, navigationType]);

  // Save scroll on scroll events during normal navigation
  useEffect(() => {
    const onScroll = () => saveScrollPosition();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      saveScrollPosition();
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.key]);

  // Handle scroll positioning on route change
  useLayoutEffect(() => {
    const isInitial = isInitialMountRef.current;
    isInitialMountRef.current = false;

    // On initial page load / refresh, always force scroll to top
    if (isInitial) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
      return;
    }

    const prevPathname = prevPathnameRef.current;
    const pathnameChanged = location.pathname !== prevPathname;
    prevPathnameRef.current = location.pathname;

    // Hash navigation: defer until after paint so the element exists
    if (location.hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    // Do NOT scroll to top when navigating within the Admin Portal (/admin/*)
    const isAdminNav = prevPathname.startsWith('/admin') && location.pathname.startsWith('/admin');

    // Fresh navigations (PUSH/REPLACE) to different pages -> scroll to top
    if (navigationType !== 'POP' && pathnameChanged && !isAdminNav) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.key, location.hash, navigationType, location.pathname]);

  // Apply scroll AFTER paint for Back/Forward restores (needs DOM to be fully laid out)
  useEffect(() => {
    if (navigationType === 'POP' && !location.hash && savedScrollY.current != null) {
      const scrollY = savedScrollY.current;
      if (scrollY > 0) {
        restoreScrollPosition(scrollY);
      }
    }
  }, [location.key, location.hash, navigationType]);

  return null;
}
