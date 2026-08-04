import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays, X } from 'lucide-react';

export interface DatePickerProps {
  label?: string;
  value?: string | null; // 'yyyy-MM-dd'
  onChange: (value: string) => void;
  placeholder?: string;
  /** Disable every date before today (e.g. Available From, Open House). */
  disablePast?: boolean;
  required?: boolean;
  className?: string;
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const localeFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Premium calendar popover — replaces `<input type="date">` across the wizard.
 * Month/year dropdown navigation, keyboard support (native to react-day-picker),
 * Today shortcut, Clear button, past-date locking, locale-formatted trigger label.
 */
export function DatePicker({ label, value, onChange, placeholder = 'Select date', disablePast, required, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = toDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
          <CalendarDays className="h-4 w-4 text-navy-400 shrink-0" />
          <span className={selected ? '' : 'text-navy-300'}>{selected ? localeFormatter.format(selected) : placeholder}</span>
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="ml-auto shrink-0 text-navy-300 hover:text-red-500 transition-colors"
              aria-label="Clear date"
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
              className="absolute z-50 mt-2 rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-2xl shadow-navy-900/10"
              style={{ '--rdp-accent-color': '#b61f24', '--rdp-accent-background-color': '#fbe9ea' } as React.CSSProperties}
            >
              <DayPicker
                mode="single"
                autoFocus
                selected={selected}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(toIsoDate(date));
                  setOpen(false);
                }}
                captionLayout="dropdown"
                startMonth={new Date(today.getFullYear() - 5, 0)}
                endMonth={new Date(today.getFullYear() + 10, 11)}
                disabled={disablePast ? { before: today } : undefined}
              />
              <div className="flex items-center justify-between gap-2 border-t border-navy-100 dark:border-navy-700 pt-2 mt-1">
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
                    onChange(toIsoDate(today));
                    setOpen(false);
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  Today
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
