import { useCallback, useState } from 'react';

export interface SavedFilter<T> {
  id: string;
  name: string;
  filters: T;
  createdAt: string;
}

function storageKeyFor(pageKey: string) {
  return `realtynow_saved_filters_${pageKey}`;
}

/**
 * localStorage-backed named filter presets, scoped per page (pageKey). Purely additive —
 * no backend table, so this is safe to drop into any existing filtered list page without
 * touching its data-fetching logic.
 */
export function useSavedFilters<T>(pageKey: string) {
  const [presets, setPresets] = useState<SavedFilter<T>[]>(() => {
    try {
      const raw = localStorage.getItem(storageKeyFor(pageKey));
      return raw ? (JSON.parse(raw) as SavedFilter<T>[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback(
    (next: SavedFilter<T>[]) => {
      setPresets(next);
      try {
        localStorage.setItem(storageKeyFor(pageKey), JSON.stringify(next));
      } catch {
        /* storage full/unavailable — preset just won't survive a reload */
      }
    },
    [pageKey],
  );

  const save = useCallback(
    (name: string, filters: T) => {
      const preset: SavedFilter<T> = { id: crypto.randomUUID(), name, filters, createdAt: new Date().toISOString() };
      persist([...presets, preset]);
    },
    [presets, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(presets.filter((p) => p.id !== id));
    },
    [presets, persist],
  );

  return { presets, save, remove };
}
