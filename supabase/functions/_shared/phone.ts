// Canonical Indian mobile number normalization, shared by every edge function
// that stores or compares phone numbers (otp-auth, admin-security,
// process-application). Accepts "+91XXXXXXXXXX", "91XXXXXXXXXX", or a bare
// 10-digit number; returns "91XXXXXXXXXX" (no leading "+") — this is the form
// Supabase Auth actually stores in auth.users.phone and expects for
// signInWithPassword({ phone }), confirmed by inspecting an existing row.
// Returns null if the input can't be normalized to a valid 10-digit number.
export function normalizeIndianMobile(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  return null;
}
