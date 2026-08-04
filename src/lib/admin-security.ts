import { supabase } from './supabase';

export interface AdminSecurityStatus {
  hasSecretCode: boolean;
  locked: boolean;
  lockedUntil: string | null;
  role: 'admin' | 'super_admin';
  status: 'active' | 'suspended';
}

export interface AdminListRow {
  id: string;
  mobile: string;
  role: 'admin' | 'super_admin';
  status: 'active' | 'suspended';
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
  security: { failed_attempts: number; locked_until: string | null; updated_at: string } | null;
}

export interface AdminLoginLog {
  id: string;
  admin_id: string | null;
  ip: string | null;
  device: string | null;
  action: 'otp_login' | 'secret_setup' | 'secret_verify' | 'secret_reset' | 'logout';
  status: 'success' | 'failed' | 'locked';
  created_at: string;
}

async function call<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-security', { body, headers: { 'x-action': action } });
  if (error) {
    let message = error.message;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const parsed = await context.clone().json();
        if (typeof parsed?.error === 'string') message = parsed.error;
      } catch {
        /* not JSON, keep generic message */
      }
    }
    throw new Error(message);
  }
  if (data?.success === false && data?.error) throw new Error(data.error);
  return data as T;
}

export const getAdminSecurityStatus = () => call<{ success: true } & AdminSecurityStatus>('get-status');

export const setupAdminSecretCode = (code: string) => call<{ success: boolean }>('setup-secret-code', { code });

export const verifyAdminSecretCode = (code: string) =>
  call<{ success: boolean; needsSetup?: boolean; locked?: boolean; lockedUntil?: string; attemptsRemaining?: number; error?: string }>(
    'verify-secret-code',
    { code },
  );

export const resetAdminSecretCode = (currentCode: string, newCode: string) =>
  call<{ success: boolean }>('reset-secret-code', { currentCode, newCode });

export const superResetAdminSecretCode = (targetAdminId: string, newCode: string) =>
  call<{ success: boolean }>('super-reset-secret-code', { targetAdminId, newCode });

export const createAdmin = (mobile: string, role: 'admin' | 'super_admin', firstName?: string, lastName?: string) =>
  call<{ success: boolean; adminId: string }>('create-admin', { mobile, role, first_name: firstName, last_name: lastName });

export const updateAdminStatus = (targetAdminId: string, status: 'active' | 'suspended') =>
  call<{ success: boolean }>('update-admin-status', { targetAdminId, status });

export const listAdmins = () => call<{ success: true; admins: AdminListRow[] }>('list-admins');

export const listAdminLoginLogs = (adminId?: string) =>
  call<{ success: true; logs: AdminLoginLog[] }>('list-login-logs', adminId ? { adminId } : {});

export const logAdminOtpLogin = () => call<{ success: boolean }>('log-otp-login').catch(() => undefined);

export const logAdminLogout = () => call<{ success: boolean }>('logout').catch(() => undefined);

// Session-scoped 2FA gate — clears on tab close, and independently expires after the same
// idle window as the admin route's own inactivity timeout (App.tsx ADMIN_IDLE_TIMEOUT_MS).
const SESSION_KEY = 'admin2faVerifiedAt';
const SESSION_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 hours

export function isAdmin2faVerified(): boolean {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  const verifiedAt = parseInt(raw, 10);
  if (!verifiedAt || Date.now() - verifiedAt > SESSION_MAX_AGE_MS) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function markAdmin2faVerified() {
  sessionStorage.setItem(SESSION_KEY, Date.now().toString());
}

export function clearAdmin2faVerified() {
  sessionStorage.removeItem(SESSION_KEY);
}
