/**
 * Scroll Restoration Manager
 * --------------------------
 * Saves and restores window.scrollY across React Router navigations so that
 * pressing browser Back/Forward returns the user to the exact scroll position
 * they were at — instead of jumping to the top.
 *
 * Strategy
 * --------
 * • On every PUSH/REPLACE navigation we record scrollY in sessionStorage,
 *   keyed by window.history.state.key (unique per history entry).
 * • On POP navigation (Back/Forward) we defer scroll restoration until
 *   the page has had a chance to render content (using rAF + small delay).
 * • We intentionally do NOT restore scroll when navigating via Navbar links,
 *   logo clicks, or fresh page loads — only Back/Forward pops.
 */

const SCROLL_STORAGE_KEY = 'rn_scroll_positions';
const MAX_ENTRIES = 50; // Keep at most 50 scroll positions to limit storage

// ─── Storage helpers ────────────────────────────────────────────────────────

function readMap(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>): void {
  try {
    // Trim old entries to keep storage lean
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const trimmed: Record<string, number> = {};
      keys.slice(-MAX_ENTRIES).forEach((k) => (trimmed[k] = map[k]));
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    /* storage unavailable — degrade gracefully */
  }
}

// ─── History key ────────────────────────────────────────────────────────────

/**
 * React Router (via the browser History API) assigns a unique random `key`
 * to every history entry via `window.history.state.key`.  We use this as the
 * storage key so Back and Forward to the *same* path still get distinct
 * scroll positions.
 */
function historyKey(): string {
  return (window.history.state?.key as string | undefined) ?? 'root';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Save the current scrollY under the current history entry key. */
export function saveScrollPosition(): void {
  const key = historyKey();
  const map = readMap();
  map[key] = window.scrollY;
  writeMap(map);
}

/** Get the saved scrollY for the current history entry (or undefined). */
export function getSavedScrollPosition(): number | undefined {
  const key = historyKey();
  const map = readMap();
  return map[key];
}

/** Delete the saved scroll for the current history entry (e.g. after restoring). */
export function clearSavedScrollPosition(): void {
  const key = historyKey();
  const map = readMap();
  delete map[key];
  writeMap(map);
}

/**
 * Restore scroll to `scrollY` only after the layout has settled.
 * Uses two rAF frames + a microtask to wait for React to flush DOM.
 *
 * @param scrollY - target scroll position
 * @param onDone  - optional callback after restore
 */
export function restoreScrollPosition(scrollY: number, onDone?: () => void): void {
  // Guard: don't restore to top (that's the default, no need to force it)
  if (scrollY <= 0) {
    onDone?.();
    return;
  }

  // Use two rAF frames to wait past React's commit phase and any
  // synchronous layout reflows, then apply scroll instantly (no janky smooth).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      onDone?.();
    });
  });
}
