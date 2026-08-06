import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AdminUser,
  AdminSession,
  AdminRole,
  hasPermission as checkHasPermission,
  verifyAdminCredentials,
  verifyAdminOtp,
  resendAdminOtp,
  forgotPasswordSendOtp,
  forgotPasswordReset,
  logoutAdminSession,
  logoutAllAdminDevices,
} from '../lib/admin-auth';

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const ADMIN_SESSION_STORAGE_KEY = 'realtynow_admin_session_v1';
const ADMIN_ACTIVITY_STORAGE_KEY = 'realtynow_admin_activity_v1';

interface PendingAuth {
  adminId: string;
  email: string;
  mobile: string;
  maskedMobile: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  session: AdminSession | null;
  loading: boolean;
  loginStep: 'credentials' | 'otp' | 'authenticated';
  pendingAuth: PendingAuth | null;
  loginWithCredentials: (email: string, pass: string) => Promise<PendingAuth>;
  verifyOtp: (code: string) => Promise<AdminUser>;
  resendOtp: () => Promise<void>;
  forgotPasswordOtp: (emailOrMobile: string) => Promise<{ adminId: string; maskedMobile: string }>;
  resetPasswordWithOtp: (adminId: string, code: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: AdminRole[]) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'authenticated'>('credentials');
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);

  // Restore Session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
      const lastActivityStr = localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);

      if (stored && lastActivityStr) {
        const parsedSession: AdminSession = JSON.parse(stored);
        const lastActivity = parseInt(lastActivityStr, 10);

        if (Date.now() - lastActivity < ADMIN_IDLE_TIMEOUT_MS) {
          setAdmin(parsedSession.admin);
          setSession(parsedSession);
          setLoginStep('authenticated');
          localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, Date.now().toString());
        } else {
          // Expired due to 30 min idle
          localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
          localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('[AdminAuthContext] Session restore error:', err);
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // 30-Minute Idle Timeout Tracker
  useEffect(() => {
    if (!admin) return;

    const forceLogout = () => {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
      setAdmin(null);
      setSession(null);
      setLoginStep('credentials');
      window.location.href = '/admin/login?expired=true';
    };

    const touchActivity = () => {
      const now = Date.now();
      const last = localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);
      if (!last || now - parseInt(last, 10) > 15_000) {
        localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, now.toString());
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, touchActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);
      if (last && Date.now() - parseInt(last, 10) > ADMIN_IDLE_TIMEOUT_MS) {
        forceLogout();
      }
    }, 30_000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, touchActivity));
      clearInterval(interval);
    };
  }, [admin]);

  const loginWithCredentials = useCallback(async (email: string, pass: string): Promise<PendingAuth | null> => {
    setLoading(true);
    try {
      const deviceToken = localStorage.getItem('realtynow_admin_device_token');
      const res = await verifyAdminCredentials(email, pass, deviceToken);
      
      if (res.skipOtp && res.session) {
        setAdmin(res.session.admin);
        setSession(res.session);
        setLoginStep('authenticated');
        setPendingAuth(null);

        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(res.session));
        localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, Date.now().toString());
        return null;
      }
      
      const pending: PendingAuth = {
        adminId: res.adminId,
        email: res.email,
        mobile: res.mobile,
        maskedMobile: res.maskedMobile,
      };
      setPendingAuth(pending);
      setLoginStep('otp');
      return pending;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (code: string, rememberDevice: boolean = false): Promise<AdminUser> => {
    if (!pendingAuth) {
      throw new Error('No pending login authorization found');
    }
    setLoading(true);
    try {
      const { token, admin: authenticatedAdmin, deviceToken } = await verifyAdminOtp(pendingAuth.adminId, code, rememberDevice);

      if (deviceToken) {
        localStorage.setItem('realtynow_admin_device_token', deviceToken);
      }

      const newSession: AdminSession = {
        token,
        admin: authenticatedAdmin,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      setAdmin(authenticatedAdmin);
      setSession(newSession);
      setLoginStep('authenticated');
      setPendingAuth(null);

      localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(newSession));
      localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, Date.now().toString());

      return authenticatedAdmin;
    } finally {
      setLoading(false);
    }
  }, [pendingAuth]);

  const resendOtp = useCallback(async (): Promise<void> => {
    if (!pendingAuth) return;
    await resendAdminOtp(pendingAuth.adminId);
  }, [pendingAuth]);

  const forgotPasswordOtp = useCallback(async (emailOrMobile: string) => {
    return await forgotPasswordSendOtp(emailOrMobile);
  }, []);

  const resetPasswordWithOtp = useCallback(async (adminId: string, code: string, newPass: string) => {
    await forgotPasswordReset(adminId, code, newPass);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    if (session) {
      await logoutAdminSession(session.token, admin?.id);
    }
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
    setAdmin(null);
    setSession(null);
    setPendingAuth(null);
    setLoginStep('credentials');
  }, [session, admin]);

  const logoutAllDevices = useCallback(async (): Promise<void> => {
    if (admin) {
      await logoutAllAdminDevices(admin.id);
    }
    await logout();
  }, [admin, logout]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!admin) return false;
    return checkHasPermission(admin.role, permission);
  }, [admin]);

  const hasRole = useCallback((...roles: AdminRole[]): boolean => {
    if (!admin) return false;
    return roles.includes(admin.role);
  }, [admin]);

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        session,
        loading,
        loginStep,
        pendingAuth,
        loginWithCredentials,
        verifyOtp,
        resendOtp,
        forgotPasswordOtp,
        resetPasswordWithOtp,
        logout,
        logoutAllDevices,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
