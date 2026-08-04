import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarClock, X } from 'lucide-react';

export interface DateTimePickerProps {
  label?: string;
  value?: string | null; // 'yyyy-MM-dd HH:mm'
  onChange: (value: string) => void;
  placeholder?: string;
  disablePast?: boolean;
  required?: boolean;
  className?: string;
}

function splitValue(value: string | null | undefined): { date?: Date; time: string } {
  if (!value) return { date: undefined, time: '' };
  const [datePart, timePart = ''] = value.split(' ');
  const [y, m, d] = (datePart ?? '').split('-').map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : undefined;
  return { date: date && !Number.isNaN(date.getTime()) ? date : undefined, time: timePart };
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Combined date + time popover for Open House scheduling — one trigger, calendar on top,
 * quick time-slot picker below. Storage format 'yyyy-MM-dd HH:mm' (24hr), matching the
 * existing "HH:mm to HH:mm" convention already used for visiting_hours in this wizard.
 */
export function DateTimePicker({ label, value, onChange, placeholder = 'Select date & time', disablePast, required, className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { date, time } = splitValue(value);
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

  const displayLabel = useMemo(() => {
    if (!date) return '';
    return time ? `${dateFormatter.format(date)}, ${formatTime(time)}` : dateFormatter.format(date);
  }, [date, time]);

  const commit = (nextDate?: Date, nextTime?: string) => {
    const d = nextDate ?? date;
    const t = nextTime ?? time;
    if (!d) return;
    onChange(t ? `${toIsoDate(d)} ${t}` : toIsoDate(d));
  };

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
          <CalendarClock className="h-4 w-4 text-navy-400 shrink-0" />
          <span className={displayLabel ? '' : 'text-navy-300'}>{displayLabel || placeholder}</span>
          {displayLabel && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="ml-auto shrink-0 text-navy-300 hover:text-red-500 transition-colors"
              aria-label="Clear date & time"
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
              className="absolute z-50 mt-2 flex w-[19rem] flex-col rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-2xl shadow-navy-900/10"
              style={{ '--rdp-accent-color': '#b61f24', '--rdp-accent-background-color': '#fbe9ea' } as React.CSSProperties}
            >
              <DayPicker
                mode="single"
                autoFocus
                selected={date}
                onSelect={(d) => {
                  if (!d) return;
                  commit(d, time || '10:00');
                }}
                captionLayout="dropdown"
                startMonth={new Date(today.getFullYear() - 5, 0)}
                endMonth={new Date(today.getFullYear() + 10, 11)}
                disabled={disablePast ? { before: today } : undefined}
              />

              <div className="border-t border-navy-100 dark:border-navy-700 pt-2 mt-1">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-navy-400">Time</p>
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto custom-scrollbar pr-1">
                  {SLOTS.filter((_, i) => i % 2 === 0).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        commit(date ?? today, slot);
                        setOpen(false);
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                        slot === time
                          ? 'bg-red-600 text-white'
                          : 'bg-navy-50 text-navy-600 hover:bg-navy-100 dark:bg-navy-800 dark:text-navy-200'
                      }`}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
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
                    commit(today, time || '10:00');
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
