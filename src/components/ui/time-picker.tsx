import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, X } from 'lucide-react';

export interface TimePickerProps {
  label?: string;
  value?: string | null; // 'HH:mm', 24hr
  onChange: (value: string) => void;
  placeholder?: string;
  /** Slot picks below this time (24hr 'HH:mm') render disabled — used for "To" fields. */
  minTime?: string | null;
  required?: boolean;
  className?: string;
}

function formatSlot(hhmm: string, use12h: boolean): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!use12h) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

/**
 * Premium time popover — replaces `<input type="time">`. Native time input up top for
 * exact/keyboard entry, 30-min quick-pick list below, 12/24hr display toggle (value is
 * always stored 24hr internally so it stays comparable for range validation).
 */
export function TimePicker({ label, value, onChange, placeholder = 'Select time', minTime, required, className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [use12h, setUse12h] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !value) return;
    const el = listRef.current?.querySelector(`[data-slot="${value}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [open, value]);

  const displayValue = useMemo(() => (value ? formatSlot(value, use12h) : ''), [value, use12h]);

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-navy-500 dark:text-navy-300 uppercase tracking-widest mb-1.5">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="w-full flex items-center gap-2 bg-white dark:bg-navy-900 border border-navy-150 dark:border-navy-700 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-900 dark:text-white focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all shadow-sm"
        >
          <Clock className="h-4 w-4 text-navy-400 shrink-0" />
          <span className={value ? '' : 'text-navy-300'}>{displayValue || placeholder}</span>
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="ml-auto shrink-0 text-navy-300 hover:text-red-500 transition-colors"
              aria-label="Clear time"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="dialog"
              className="absolute z-50 mt-2 w-56 rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-2xl shadow-navy-900/10"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <input
                  type="time"
                  value={value ?? ''}
                  onChange={(e) => onChange(e.target.value)}
                  className="flex-1 min-w-0 bg-navy-50 dark:bg-navy-800 border border-navy-150 dark:border-navy-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-navy-900 dark:text-white focus:outline-none focus:border-red-400"
                />
                <div className="flex shrink-0 rounded-lg border border-navy-150 dark:border-navy-700 overflow-hidden text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUse12h(true)}
                    className={`px-2 py-1.5 transition-colors ${use12h ? 'bg-red-600 text-white' : 'bg-white dark:bg-navy-900 text-navy-500'}`}
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    onClick={() => setUse12h(false)}
                    className={`px-2 py-1.5 transition-colors ${!use12h ? 'bg-red-600 text-white' : 'bg-white dark:bg-navy-900 text-navy-500'}`}
                  >
                    24h
                  </button>
                </div>
              </div>

              <div ref={listRef} className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
                {SLOTS.map((slot) => {
                  const disabled = !!minTime && slot <= minTime;
                  const active = slot === value;
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-slot={slot}
                      disabled={disabled}
                      onClick={() => {
                        onChange(slot);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-red-600 text-white'
                          : disabled
                            ? 'text-navy-200 cursor-not-allowed'
                            : 'text-navy-600 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800'
                      }`}
                    >
                      {formatSlot(slot, use12h)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-navy-100 dark:border-navy-700 pt-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-xs font-semibold text-navy-400 hover:text-red-600 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const rounded = Math.round(now.getMinutes() / 30) * 30;
                    now.setMinutes(rounded % 60);
                    if (rounded === 60) now.setHours(now.getHours() + 1);
                    onChange(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                    setOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
