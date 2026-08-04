import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import { Button, Input } from './ui';
import {
  getAdminSecurityStatus,
  setupAdminSecretCode,
  verifyAdminSecretCode,
  markAdmin2faVerified,
  logAdminOtpLogin,
} from '../lib/admin-security';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Second-factor gate rendered instead of the admin dashboard until the Secret Access Code
 * is verified for this browser session. First-time admins (no admin_security row yet) get
 * a "set up your code" form instead of "enter your code". Wired into App.tsx's
 * ProtectedRoute for allowRoles={['admin']} routes only.
 */
export function AdminSecretGate({ onVerified }: { onVerified: () => void }) {
  const { signOut } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getAdminSecurityStatus()
      .then((status) => {
        setNeedsSetup(!status.hasSecretCode);
        if (status.locked && status.lockedUntil) setLockedUntil(new Date(status.lockedUntil).getTime());
        // First successful landing on the gate after OTP sign-in — log the OTP factor
        // into the same audit trail as the secret-code events below.
        logAdminOtpLogin();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load security status'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = !!lockedUntil && lockedUntil > now;

  const submit = async () => {
    setError(null);
    if (needsSetup) {
      if (code.length < 6) return setError('Secret code must be at least 6 characters.');
      if (code !== confirmCode) return setError('Codes do not match.');
      setSubmitting(true);
      try {
        await setupAdminSecretCode(code);
        markAdmin2faVerified();
        addToast('success', 'Secret code set — welcome to the admin panel');
        onVerified();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not set up secret code');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!code) return setError('Enter your secret code.');
    setSubmitting(true);
    try {
      const res = await verifyAdminSecretCode(code);
      if (res.needsSetup) {
        setNeedsSetup(true);
        setCode('');
        return;
      }
      if (!res.success) {
        if (res.locked && res.lockedUntil) setLockedUntil(new Date(res.lockedUntil).getTime());
        setError(res.error ?? 'Incorrect secret code.');
        setCode('');
        return;
      }
      markAdmin2faVerified();
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-300 border-t-red-600" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/95 p-7 shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
          {needsSetup ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </div>
        <h1 className="mt-4 text-center font-display text-xl font-bold text-navy-900">
          {needsSetup ? 'Set up your Secret Access Code' : 'Enter Secret Access Code'}
        </h1>
        <p className="mt-1.5 text-center text-sm text-navy-500">
          {needsSetup
            ? 'This second factor protects the admin panel. Choose a code only you know.'
            : 'Required every admin session, in addition to your mobile OTP login.'}
        </p>

        {isLocked ? (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-red-500" />
            <p className="mt-2 text-sm font-semibold text-red-700">Too many failed attempts</p>
            <p className="mt-1 text-xs text-red-500">Try again in {formatCountdown(lockedUntil! - now)}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <Input
              type="password"
              label={needsSetup ? 'New secret code (min 6 chars)' : 'Secret code'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !needsSetup && submit()}
              autoFocus
              autoComplete="off"
            />
            {needsSetup && (
              <Input
                type="password"
                label="Confirm secret code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoComplete="off"
              />
            )}
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            <Button className="w-full" loading={submitting} onClick={submit}>
              {needsSetup ? 'Set Secret Code & Continue' : 'Unlock Admin Panel'}
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut()}
          className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-semibold text-navy-400 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out instead
        </button>
      </motion.div>
    </div>
  );
}
