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

export function exportToCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows
    .map((r) => columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
