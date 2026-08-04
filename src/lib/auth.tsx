import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { queryClient } from './queryClient';
import type { Profile, UserRole } from './types';

type OtpLoginIntent = 'customer' | 'agent';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  role: UserRole | null;
  verifyOtpAndSignIn: (
    accessToken: string,
    intent?: OtpLoginIntent,
  ) => Promise<{ error: string | null; isNewUser?: boolean; code?: string }>;
  requestAgentAccess: (accessToken: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevRole, setPrevRole] = useState<UserRole | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.warn('profile load error', error.message);
      return null;
    }
    const profileData = data as Profile | null;
    setProfile(profileData);
    return profileData;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (prevRole && profile?.role && prevRole !== profile.role) {
      queryClient.clear();
    }
    setPrevRole(profile?.role ?? null);
  }, [profile?.role, prevRole]);

  const verifyOtpAndSignIn = useCallback(async (accessToken: string, intent: OtpLoginIntent = 'customer') => {
    const { data, error } = await supabase.functions.invoke('otp-auth', {
      body: { accessToken, intent },
      headers: { 'x-action': 'verify' },
    });
    if (error) {
      // supabase-js leaves `data` empty on a non-2xx response and only sets
      // a generic error.message ("Edge Function returned a non-2xx status
      // code") — the real reason (and `code`, e.g. AGENT_NOT_FOUND) is in
      // the response body, on error.context.
      let message = error.message;
      let code: string | undefined;
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const body = await context.clone().json();
          if (typeof body?.error === 'string') message = body.error;
          if (typeof body?.code === 'string') code = body.code;
        } catch {
          /* response wasn't JSON, keep the generic message */
        }
      }
      console.error('[otp-auth] verify failed:', message);
      return { error: message, code };
    }
    if (!data?.access_token || !data?.refresh_token) {
      return { error: data?.error ?? 'OTP verification failed', code: data?.code };
    }
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (setSessionError) return { error: setSessionError.message };
    return { error: null, isNewUser: Boolean(data.isNewUser) };
  }, []);

  const requestAgentAccess = useCallback(async (accessToken: string, fullName: string) => {
    const { data, error } = await supabase.functions.invoke('otp-auth', {
      body: { accessToken, full_name: fullName },
      headers: { 'x-action': 'request-agent-access' },
    });
    if (error) {
      let message = error.message;
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const body = await context.clone().json();
          if (typeof body?.error === 'string') message = body.error;
        } catch {
          /* response wasn't JSON, keep the generic message */
        }
      }
      return { error: message };
    }
    if (!data?.success) return { error: data?.error ?? 'Could not submit request' };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Best-effort audit log + clear the admin 2FA session flag *before* the session is torn
    // down (the log call needs a valid bearer token) — otherwise a different admin signing
    // in on the same browser tab would inherit a stale "verified" flag from sessionStorage.
    if (profile?.role === 'admin') {
      const { logAdminLogout, clearAdmin2faVerified } = await import('./admin-security');
      await logAdminLogout();
      clearAdmin2faVerified();
    }
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    role: profile?.role ?? null,
    verifyOtpAndSignIn,
    requestAgentAccess,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
