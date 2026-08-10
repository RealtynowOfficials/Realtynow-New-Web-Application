import React from 'react';
import type { StorageBucket } from '../../lib/storage';

// Shared between the List Property wizard and the Edit Property modal so both
// write/read the exact same media shape, amenities vocabulary, and field
// styling instead of drifting apart.

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  isCover: boolean;
  order: number;
  // Present only for items uploaded to Supabase Storage (not pasted URLs) —
  // needed to delete the underlying file, not just the reference.
  bucket?: StorageBucket;
  path?: string;
  uploading?: boolean;
  error?: string;
}

export const MAX_MEDIA_FILES = 20;
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
];
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_DIMENSION = 1920;

/**
 * Client-side resize + re-encode (canvas → WEBP, quality 0.82) so large phone-camera
 * photos don't eat the 5MB cap or user bandwidth. Skips HEIC (most browsers' canvas
 * can't decode it) and anything canvas fails on — caller just uploads the original
 * in that case rather than blocking the listing on a compression failure.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= file.size) return file; // compression didn't actually help — keep original
    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch {
    return file; // e.g. HEIC the browser can't decode — fall through to uploading the original
  }
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function isValidMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;
  } catch {
    return false;
  }
  return /\.(jpe?g|png|webp|gif|mp4|webm|mov)(\?|$)/i.test(url);
}

export const PURPOSE_OPTIONS = [
  { id: 'Sale', label: 'Sale', icon: '/icons/icon_sale_3d.png', desc: 'Sell your property' },
  { id: 'Rent', label: 'Rent', icon: '/icons/icon_rent_3d.png', desc: 'Find a tenant' },
  { id: 'Lease', label: 'Lease', icon: '/icons/icon_lease_3d.png', desc: 'Commercial lease' },
  { id: 'PG', label: 'PG', icon: '/icons/icon_pg_3d.png', desc: 'Paying Guest' },
  { id: 'CoLiving', label: 'CoLiving', icon: '/icons/icon_coliving_3d.png', desc: 'Shared spaces' },
  { id: 'Hostel', label: 'Hostel', icon: '/icons/icon_hostel_3d.png', desc: 'Student hostels' },
  { id: 'Vacation Rental', label: 'Vacation', icon: '🏖️', desc: 'Short stays' },
];

export const AMENITIES_LIST = [
  { id: 'parking', label: 'Parking', icon: '🚗' },
  { id: 'gym', label: 'Gym', icon: '💪' },
  { id: 'pool', label: 'Swimming Pool', icon: '🏊' },
  { id: 'security', label: '24/7 Security', icon: '🔒' },
  { id: 'lift', label: 'Lift / Elevator', icon: '🛗' },
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'power_backup', label: 'Power Backup', icon: '🔋' },
  { id: 'garden', label: 'Garden', icon: '🌿' },
  { id: 'clubhouse', label: 'Club House', icon: '🏛️' },
  { id: 'cctv', label: 'CCTV', icon: '📷' },
  { id: 'gas', label: 'Piped Gas', icon: '🔥' },
  { id: 'intercom', label: 'Intercom', icon: '📞' },
  { id: 'play_area', label: 'Play Area', icon: '🎠' },
  { id: 'rainwater', label: 'Rainwater Harvesting', icon: '🌧️' },
  { id: 'ev_charging', label: 'EV Charging', icon: '⚡' },
  { id: 'servant', label: 'Servant Room', icon: '🛏️' },
];

// ── tiny reusable field wrapper ──
export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-navy-500 uppercase tracking-widest mb-1.5 whitespace-nowrap truncate">{children}</label>
);
// forwardRef is not optional here — react-hook-form's register() returns a
// `ref` that it uses to read each uncontrolled field's live DOM value at
// validation/getValues() time. A plain function component silently drops
// that ref (React strips it before the component body ever runs), so RHF
// never actually attaches to the real <input>: the field looks populated
// (the browser's native uncontrolled input shows exactly what was typed)
// while getValues()/validation keeps reading the untouched defaultValue.
// That mismatch is what causes "Title is required" despite a visibly filled
// field — and since every step's fields go through these three components,
// the same disconnect silently affected every registered field, not just Title.
export const InputField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ placeholder, type = 'text', onClick, ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      onClick={(e) => {
        if ((type === 'date' || type === 'time') && e.currentTarget.showPicker) {
          try {
            e.currentTarget.showPicker();
          } catch {
            // Ignored: already open or not supported
          }
        }
        if (onClick) onClick(e);
      }}
      {...rest}
      className={`w-full bg-white border border-navy-150 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all placeholder:text-navy-300 shadow-sm cursor-text ${rest.className ?? ''}`}
    />
  ),
);
InputField.displayName = 'InputField';

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ placeholder, rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      placeholder={placeholder}
      rows={rows}
      {...rest}
      className={`w-full bg-white border border-navy-150 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all placeholder:text-navy-300 shadow-sm resize-none ${rest.className ?? ''}`}
    />
  ),
);
TextAreaField.displayName = 'TextAreaField';

export const SelectField = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, ...rest }, ref) => (
    <select
      ref={ref}
      {...rest}
      className={`w-full bg-white border border-navy-150 rounded-xl px-4 py-2.5 text-sm font-medium text-navy-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all shadow-sm appearance-none ${rest.className ?? ''}`}
    >
      {children}
    </select>
  ),
);
SelectField.displayName = 'SelectField';
export const SectionTitle = ({ title, sub }: { title: string; sub: string }) => (
  <div className="text-center space-y-1.5 mb-6">
    <h3 className="text-2xl md:text-3xl font-display font-bold text-navy-900 tracking-tight">{title}</h3>
    <p className="text-navy-400 text-sm font-medium">{sub}</p>
  </div>
);
