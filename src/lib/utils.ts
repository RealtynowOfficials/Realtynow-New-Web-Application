import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(value: number | null | undefined, purpose?: string): string {
  if (value == null) return '—';
  const isRent = purpose === 'Rent';
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
  const formatted = formatter.format(value);
  return isRent ? `${formatted}/mo` : formatted;
}

export function formatCompactPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(first: string | null, last: string | null, email?: string | null): string {
  const f = (first?.[0] ?? '').toUpperCase();
  const l = (last?.[0] ?? '').toUpperCase();
  if (f || l) return `${f}${l}`;
  return email?.[0]?.toUpperCase() ?? 'U';
}

export function truncate(text: string | null | undefined, len = 120): string {
  if (!text) return '';
  return text.length > len ? `${text.slice(0, len).trim()}…` : text;
}

/** Serialize any value to a safe CSV cell string. */
function serializeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function exportToCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
) {
  const cols = columns.length > 0 ? columns : Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const header = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((r) => cols.map((c) => `"${serializeCell(r[c.key]).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  // UTF-8 BOM ensures Excel opens the file with correct encoding
  const BOM = '\uFEFF';
  const csv = `${BOM}${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
) {
  const XLSX = await import('xlsx');
  const cols = columns.length > 0 ? columns : Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const data = rows.map((r) =>
    Object.fromEntries(cols.map((c) => [c.label, serializeCell(r[c.key])]))
  );
  const worksheet = XLSX.utils.json_to_sheet(data);
  // Auto-size columns to fit content
  const colWidths = cols.map((c) => ({
    wch: Math.min(60, Math.max(c.label.length + 2, ...data.map((row) => String(row[c.label] ?? '').length))),
  }));
  worksheet['!cols'] = colWidths;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export async function exportToPdf(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
) {
  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.style.padding = '16px';
  container.innerHTML = `
    <h2 style="font-family: sans-serif; margin-bottom: 12px; font-size: 16px;">${escapeHtml(filename)}</h2>
    <table style="width:100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;">
      <thead>
        <tr>${columns.map((c) => `<th style="border:1px solid #ddd; padding:6px; text-align:left; background:#f5f5f5;">${escapeHtml(c.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((r) => `<tr>${columns.map((c) => `<td style="border:1px solid #ddd; padding:6px;">${escapeHtml(r[c.key])}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
  await html2pdf()
    .set({ margin: 10, filename: `${filename}.pdf`, jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' } })
    .from(container)
    .save();
}

export function generatePropertyUrl(p?: { id?: string | null; title?: string | null } | null): string {
  if (!p || !p.id) return '#';
  if (!p.title) return `/property/${p.id}`;
  const slug = p.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 60)
    .replace(/-$/, '');
  
  return `/property/${slug}-${p.id}`;
}
