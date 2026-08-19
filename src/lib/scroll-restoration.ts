/**
 * Scroll Restoration Manager
 * --------------------------
 * Saves and restores window.scrollY across React Router navigations so that
 * pressing browser Back/Forward returns the user to the exact scroll position
 * they were at — instead of jumping to the top.
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
 * to every history entry via `window.history.state.key`.
 * We ONLY use valid, non-initial router keys. Root / undefined keys are excluded
 * to ensure initial page loads and page refreshes never restore stale scroll.
 */
function historyKey(): string | null {
  const key = window.history.state?.key as string | undefined;
  if (!key || key === 'root' || key === 'default') return null;
  return key;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Save the current scrollY under the current history entry key. */
export function saveScrollPosition(): void {
  const key = historyKey();
  if (!key) return;
  const map = readMap();
  map[key] = window.scrollY;
  writeMap(map);
}

/** Get the saved scrollY for the current history entry (or undefined). */
export function getSavedScrollPosition(): number | undefined {
  const key = historyKey();
  if (!key) return undefined;
  const map = readMap();
  return map[key];
}

/** Delete the saved scroll for the current history entry (e.g. after restoring). */
export function clearSavedScrollPosition(): void {
  const key = historyKey();
  if (!key) return;
  const map = readMap();
  delete map[key];
  writeMap(map);
}

/** Clear all saved scroll positions (called on initial load or refresh). */
export function clearAllSavedScrollPositions(): void {
  try {
    sessionStorage.removeItem(SCROLL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Restore scroll to `scrollY` only after the layout has settled.
 * Uses two rAF frames to wait for React to flush DOM.
 */
export function restoreScrollPosition(scrollY: number, onDone?: () => void): void {
  if (scrollY <= 0) {
    onDone?.();
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      onDone?.();
    });
  });
}
