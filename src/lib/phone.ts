// Client-side counterpart to supabase/functions/_shared/phone.ts — same
// canonical algorithm, duplicated because Deno edge functions and the Vite
// client can't share a literal module across runtimes. Keep both in sync.

/**
 * Normalizes an Indian mobile number to "91XXXXXXXXXX" (no leading "+"),
 * matching how Supabase Auth stores auth.users.phone. Returns null if the
 * input isn't a valid 10-digit Indian mobile number.
 */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return null;
}

/** Display form ("+91XXXXXXXXXX") for showing a normalized number back to the user. */
export function formatIndianMobileForDisplay(raw: string): string {
  const normalized = normalizeIndianMobile(raw);
  return normalized ? `+${normalized}` : raw;
}
