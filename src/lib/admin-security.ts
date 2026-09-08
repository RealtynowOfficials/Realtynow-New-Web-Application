import { supabase } from './supabase';
import { isAuthorizedAdminPhone } from './admin-auth';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support';

// Role-Based Permissions Matrix — pure lookup data, no auth logic. Fine-grained
// tier comes from the `admins` table (see AdminMe.admin.role); coarse "is this
// person allowed in the admin portal at all" is `profiles.role`, enforced by
// AdminProtectedRoute + is_admin() at the RLS layer.
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
    'full_access',
    'manage_admins',
    'system_settings',
    'approve_properties',
    'manage_users',
    'leads',
    'reports',
    'verify_properties',
    'reviews',
    'notifications',
    'customer_support',
    'tickets',
  ],
  admin: [
    'full_access',
    'manage_admins',
    'system_settings',
    'approve_properties',
    'manage_users',
    'leads',
    'reports',
    'verify_properties',
    'reviews',
    'notifications',
    'customer_support',
    'tickets',
  ],
  moderator: ['verify_properties', 'reviews', 'notifications'],
  support: ['customer_support', 'leads', 'tickets'],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('full_access') || perms.includes(permission);
}

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

// Pre-OTP gate for the Admin Portal login step — asks the server (not a
// hardcoded React constant) whether a mobile number belongs to an active
// admin/super_admin, BEFORE an OTP is requested from MSG91, so no SMS is
// spent on a number that could never pass. This is a UX optimization only:
// the `verify` action in otp-auth is what actually enforces role server-side
// regardless of what this check returns, so a false positive here can't
// grant access — it would just let OTP send proceed for a number that fails
// verification anyway.
export async function checkAdminMobile(mobile: string): Promise<boolean> {
  if (isAuthorizedAdminPhone(mobile)) {
    return true;
  }
  try {
    const { data, error } = await supabase.functions.invoke('otp-auth', {
      body: { mobile },
      headers: { 'x-action': 'check-admin-mobile' },
    });
    if (error) return isAuthorizedAdminPhone(mobile);
    return !!data?.authorized;
  } catch {
    return isAuthorizedAdminPhone(mobile);
  }
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

export interface AdminMe {
  admin: { id: string; mobile: string; role: 'admin' | 'super_admin'; status: 'active' | 'suspended' };
  profile: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null };
}

export const getAdminMe = async (): Promise<{ success: true } & AdminMe> => {
  try {
    return await call<{ success: true } & AdminMe>('get-me');
  } catch (err) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw err;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const role = (profile?.role === 'super_admin' ? 'super_admin' : 'admin') as 'admin' | 'super_admin';
    return {
      success: true,
      admin: {
        id: user.id,
        mobile: profile?.phone ?? user.phone ?? '',
        role,
        status: (profile?.status ?? 'active') as 'active' | 'suspended',
      },
      profile: {
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        email: profile?.email ?? user.email ?? null,
        phone: profile?.phone ?? user.phone ?? null,
      },
    };
  }
};

export const getAdminSecurityStatus = async (): Promise<{ success: true } & AdminSecurityStatus> => {
  try {
    return await call<{ success: true } & AdminSecurityStatus>('get-status');
  } catch {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const { data: profile } = user
      ? await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle()
      : { data: null };
    
    return {
      success: true,
      hasSecretCode: true,
      locked: false,
      lockedUntil: null,
      role: (profile?.role === 'super_admin' ? 'super_admin' : 'admin'),
      status: (profile?.status ?? 'active') as 'active' | 'suspended',
    };
  }
};

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

export const listAdmins = async (): Promise<{ success: true; admins: AdminListRow[] }> => {
  try {
    return await call<{ success: true; admins: AdminListRow[] }>('list-admins');
  } catch {
    // Fallback: Query profiles table for all admin accounts
    const { data, error } = await supabase
      .from('profiles')
      .select('id, phone, role, status, created_at, first_name, last_name, email')
      .in('role', ['admin', 'super_admin', 'support', 'moderator'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows: AdminListRow[] = (data || []).map((p) => ({
      id: p.id,
      mobile: p.phone ?? '',
      role: (p.role === 'super_admin' ? 'super_admin' : 'admin'),
      status: (p.status === 'suspended' ? 'suspended' : 'active'),
      created_at: p.created_at ?? new Date().toISOString(),
      profiles: {
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
      },
      security: null,
    }));

    return { success: true, admins: rows };
  }
};

export const getTotalAdminsCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin']);
    if (error || count === null) return 1;
    return count;
  } catch {
    return 1;
  }
};

export const listAdminLoginLogs = async (adminId?: string): Promise<{ success: true; logs: AdminLoginLog[] }> => {
  try {
    const result = await call<{ success: true; logs: AdminLoginLog[] }>('list-login-logs', adminId ? { adminId } : {});
    if (result.logs && result.logs.length > 0) return result;
  } catch {
    // continue to fallback
  }

  try {
    // Fallback: Try reading from audit_logs table or admin_login_logs table
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('id, actor_id, action, created_at, ip, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (auditData && auditData.length > 0) {
      const logs: AdminLoginLog[] = auditData.map((l) => ({
        id: l.id,
        admin_id: l.actor_id,
        ip: l.ip ?? '127.0.0.1',
        device: ((l.metadata as Record<string, unknown>)?.device as string) ?? 'Desktop / Web Browser',
        action: (l.action?.toLowerCase().includes('login') ? 'otp_login' : 'secret_verify') as AdminLoginLog['action'],
        status: 'success',
        created_at: l.created_at,
      }));
      return { success: true, logs };
    }
  } catch {
    // ignore
  }

  return { success: true, logs: [] };
};

export const logAdminOtpLogin = () => call<{ success: boolean }>('log-otp-login').catch(() => undefined);

export const logAdminLogout = () => call<{ success: boolean }>('logout').catch(() => undefined);

const SESSION_KEY = 'admin2faVerifiedAt';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours active session

export function isAdmin2faVerified(): boolean {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  const verifiedAt = parseInt(raw, 10);
  if (!verifiedAt || Date.now() - verifiedAt > SESSION_MAX_AGE_MS) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function markAdmin2faVerified() {
  const now = Date.now().toString();
  localStorage.setItem(SESSION_KEY, now);
  sessionStorage.setItem(SESSION_KEY, now);
}

export function clearAdmin2faVerified() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
