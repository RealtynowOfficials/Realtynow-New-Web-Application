import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, ChevronDown, Plus, X } from 'lucide-react';
import type { SavedFilter } from '../lib/saved-filters';

export function SavedFiltersMenu<T>({
  presets,
  onApply,
  onSave,
  onRemove,
}: {
  presets: SavedFilter<T>[];
  onApply: (filters: T) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNaming(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-navy-150 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-sm transition hover:bg-navy-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Saved filters{presets.length > 0 ? ` (${presets.length})` : ''}
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-navy-100 bg-white p-2 shadow-xl dark:border-navy-700 dark:bg-navy-900"
          >
            {presets.length === 0 && !naming && (
              <p className="px-2 py-2 text-xs text-navy-400">No saved filters yet.</p>
            )}
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {presets.map((p) => (
                <div key={p.id} className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-navy-50 dark:hover:bg-navy-800">
                  <button
                    onClick={() => {
                      onApply(p.filters);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-xs font-semibold text-navy-700 dark:text-navy-200"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => onRemove(p.id)}
                    className="ml-1 shrink-0 text-navy-300 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-1.5 border-t border-navy-100 pt-1.5 dark:border-navy-700">
              {naming ? (
                <div className="flex items-center gap-1.5 px-1">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) {
                        onSave(name.trim());
                        setName('');
                        setNaming(false);
                        setOpen(false);
                      }
                    }}
                    placeholder="Filter name..."
                    className="min-w-0 flex-1 rounded-lg border border-navy-150 px-2 py-1 text-xs outline-none focus:border-red-400 dark:border-navy-700 dark:bg-navy-800"
                  />
                  <button
                    disabled={!name.trim()}
                    onClick={() => {
                      onSave(name.trim());
                      setName('');
                      setNaming(false);
                      setOpen(false);
                    }}
                    className="shrink-0 rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setNaming(true)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Plus className="h-3.5 w-3.5" /> Save current filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
