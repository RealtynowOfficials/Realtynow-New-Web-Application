import { useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { exportToCsv, exportToExcel, exportToPdf } from '../lib/utils';
import { useToast } from './toast';

/**
 * Reusable CSV/Excel/PDF export dropdown — drop-in replacement for the various one-off
 * "Export CSV" buttons across admin/agent/portal list pages. Exports exactly the rows
 * handed to it (callers pass whatever's currently visible/filtered so the export always
 * matches what's on screen).
 */
export function ExportMenu({
  filename,
  rows,
  columns,
  disabled,
}: {
  filename: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const run = async (format: 'csv' | 'excel' | 'pdf') => {
    setOpen(false);
    if (rows.length === 0) {
      toast.addToast('error', 'No rows to export');
      return;
    }
    setExporting(true);
    try {
      if (format === 'csv') exportToCsv(filename, rows, columns);
      else if (format === 'excel') await exportToExcel(filename, rows, columns);
      else await exportToPdf(filename, rows, columns);
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || exporting}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-navy-150 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-sm transition hover:bg-navy-50 disabled:opacity-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-30 mt-1.5 w-40 rounded-xl border border-navy-100 bg-white p-1 shadow-xl dark:border-navy-700 dark:bg-navy-900"
          >
            <button
              onClick={() => run('csv')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileText className="h-3.5 w-3.5 text-navy-400" /> CSV
            </button>
            <button
              onClick={() => run('excel')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-navy-400" /> Excel
            </button>
            <button
              onClick={() => run('pdf')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileType className="h-3.5 w-3.5 text-navy-400" /> PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Async variant — fetches ALL rows on demand (e.g. bypasses pagination) before exporting.
 * Pass a `fetchRows` function that returns the complete dataset.
 */
export function ExportMenuAsync({
  filename,
  columns,
  fetchRows,
  disabled,
}: {
  filename: string;
  columns: { key: string; label: string }[];
  fetchRows: () => Promise<Record<string, unknown>[]>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const run = async (format: 'csv' | 'excel' | 'pdf') => {
    setOpen(false);
    setExporting(true);
    try {
      toast.addToast('info', 'Fetching all records for export…');
      const rows = await fetchRows();
      if (rows.length === 0) {
        toast.addToast('error', 'No data to export');
        return;
      }
      if (format === 'csv') exportToCsv(filename, rows, columns);
      else if (format === 'excel') await exportToExcel(filename, rows, columns);
      else await exportToPdf(filename, rows, columns);
      toast.addToast('success', `Exported ${rows.length} records as ${format.toUpperCase()}`);
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || exporting}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-navy-150 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-sm transition hover:bg-navy-50 disabled:opacity-50 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-200 dark:hover:bg-navy-800"
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? 'Fetching…' : 'Export All'}
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-navy-100 bg-white p-1 shadow-xl dark:border-navy-700 dark:bg-navy-900"
          >
            <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-navy-400">
              All Records
            </p>
            <button
              onClick={() => run('csv')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileText className="h-3.5 w-3.5 text-navy-400" /> CSV (.csv)
            </button>
            <button
              onClick={() => run('excel')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-navy-400" /> Excel (.xlsx)
            </button>
            <button
              onClick={() => run('pdf')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800"
            >
              <FileType className="h-3.5 w-3.5 text-navy-400" /> PDF (.pdf)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
