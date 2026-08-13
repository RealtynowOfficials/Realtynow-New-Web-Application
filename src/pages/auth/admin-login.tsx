import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/toast';
import { LogoLight } from '../../components/logo';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  getAdminSecurityStatus,
  setupAdminSecretCode,
  verifyAdminSecretCode,
  isAdmin2faVerified,
  markAdmin2faVerified,
} from '../../lib/admin-security';

export function AdminLoginPage() {
  const { t } = useLanguageContext();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';
  const isExpiredSession = searchParams.get('expired') === 'true';
  const { addToast } = useToast();

  const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [statusLoading, setStatusLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Already fully authenticated (real session + admin role + 2FA verified) — bounce onward.
  useEffect(() => {
    if (!authLoading && user && isAdminRole && isAdmin2faVerified()) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, isAdminRole, navigate, redirectPath]);

  // Fetch whether this admin already has a secret code configured.
  useEffect(() => {
    if (authLoading || !user || !isAdminRole || isAdmin2faVerified()) {
      setStatusLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const status = await getAdminSecurityStatus();
        if (cancelled) return;
        setNeedsSetup(!status.hasSecretCode);
        if (status.locked) {
          setLocked(true);
          setStatusError(t('auth.tooManyAttempts', 'Too many failed attempts. Try again after {{time}}.').replace('{{time}}', status.lockedUntil ? new Date(status.lockedUntil).toLocaleTimeString() : t('auth.aShortWait', 'a short wait')));
        }
      } catch (err) {
        if (!cancelled) setStatusError(err instanceof Error ? err.message : t('auth.couldNotLoadSecurityStatus', 'Could not load security status.'));
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isAdminRole]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    if (code.length < 6 || code.length > 12) {
      setCodeError(t('auth.secretCodeLength', 'Secret code must be 6-12 characters.'));
      return;
    }
    if (code !== confirmCode) {
      setCodeError(t('auth.secretCodesMismatch', 'Secret codes do not match.'));
      return;
    }
    setSubmitting(true);
    try {
      await setupAdminSecretCode(code);
      markAdmin2faVerified();
      addToast('success', t('auth.secretCodeConfiguredToast', 'Secret code configured. Welcome to the Admin Portal.'));
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : t('auth.couldNotSetupSecretCode', 'Could not set up secret code.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    if (!code) {
      setCodeError(t('auth.enterSecretCode', 'Enter your secret code.'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await verifyAdminSecretCode(code);
      if (res.needsSetup) {
        setNeedsSetup(true);
        return;
      }
      if (!res.success) {
        if (res.locked) setLocked(true);
        if (typeof res.attemptsRemaining === 'number') setAttemptsRemaining(res.attemptsRemaining);
        setCodeError(res.error ?? t('auth.incorrectSecretCode', 'Incorrect secret code.'));
        return;
      }
      markAdmin2faVerified();
      addToast('success', t('auth.verifiedWelcomeToast', 'Verified. Welcome to the Admin Portal.'));
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : t('auth.couldNotVerifySecretCode', 'Could not verify secret code.'));
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy-950 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-red-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-rose-900/30 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-2xl sm:p-9"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoLight to="/" size={160} src="/2.png" />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-red-300 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" /> {t('auth.adminPortalBadge', 'Admin Portal')}
          </span>
        </div>

        {isExpiredSession && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('auth.sessionExpiredMessage', 'Session expired due to inactivity. Please sign in again.')}
          </div>
        )}

        {children}
      </motion.div>
    </div>
  );

  // ── Not signed in at all: point at the standard mobile-OTP login ──
  if (!authLoading && !user) {
    return shell(
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-white">{t('auth.administratorSignIn', 'Administrator Sign In')}</h1>
        <p className="mt-2 text-sm text-navy-300">
          {t('auth.adminSignInHint', 'Sign in with your registered mobile number, then complete the secret-code step here.')}
        </p>
        <Link
          to={`/login?redirect=${encodeURIComponent(`/admin/login?redirect=${redirectPath}`)}`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:shadow-red-900/50"
        >
          {t('auth.continueToMobileSignIn', 'Continue to Mobile Sign In')}
        </Link>
      </div>,
    );
  }

  // ── Signed in, but not an admin account ──
  if (!authLoading && user && !isAdminRole) {
    return shell(
      <div className="text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
        <h1 className="mt-3 font-display text-xl font-bold text-white">{t('auth.notAnAdministratorAccount', 'Not an Administrator Account')}</h1>
        <p className="mt-2 text-sm text-navy-300">
          {t('auth.mobileNotRegisteredAsAdmin', 'This mobile number is not registered as an administrator.')}
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 text-sm font-semibold text-red-400 hover:text-red-300"
        >
          {t('auth.signOutUseDifferentNumber', 'Sign out and use a different number')}
        </button>
      </div>,
    );
  }

  // ── Admin role confirmed, already 2FA-verified: the redirect effect above will fire; show a loader meanwhile ──
  if (!authLoading && user && isAdminRole && isAdmin2faVerified()) {
    return shell(
      <div className="flex flex-col items-center gap-3 py-6 text-navy-300">
        <Loader2 className="h-6 w-6 animate-spin" /> {t('auth.redirecting', 'Redirecting…')}
      </div>,
    );
  }

  if (authLoading || statusLoading) {
    return shell(
      <div className="flex flex-col items-center gap-3 py-6 text-navy-300">
        <Loader2 className="h-6 w-6 animate-spin" /> {t('auth.loadingEllipsis', 'Loading…')}
      </div>,
    );
  }

  // ── Admin role confirmed, needs the secret-code step ──
  return shell(
    <AnimatePresence mode="wait">
      <motion.div key={needsSetup ? 'setup' : 'verify'} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
        <h1 className="text-center font-display text-2xl font-bold text-white">
          {needsSetup ? t('auth.setUpSecretCodeTitle', 'Set Up Your Secret Code') : t('auth.enterSecretCodeTitle', 'Enter Your Secret Code')}
        </h1>
        <p className="mt-1.5 text-center text-xs text-navy-300">
          {needsSetup
            ? t('auth.secretCodeSetupHint', 'This code is your second factor for every future admin sign-in — choose 6-12 characters.')
            : t('auth.enterSecretCodeHint', 'Enter your admin secret code to continue.')}
        </p>

        {statusError && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300">{statusError}</div>
        )}

        <form onSubmit={needsSetup ? handleSetup : handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1.5">
              {t('auth.secretCodeLabel', 'Secret Code')}
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••••"
                autoFocus
                disabled={locked || submitting}
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-11 text-sm font-medium text-white placeholder:text-navy-500 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {needsSetup && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1.5">
                {t('auth.confirmSecretCodeLabel', 'Confirm Secret Code')}
              </label>
              <input
                type={showCode ? 'text' : 'password'}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 px-4 text-sm font-medium text-white placeholder:text-navy-500 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10 disabled:opacity-50"
              />
            </div>
          )}

          {codeError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>
                {codeError}
                {attemptsRemaining != null && attemptsRemaining > 0 && ` ${t('auth.attemptsRemaining', '({{count}} attempt(s) remaining)').replace('{{count}}', String(attemptsRemaining))}`}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || locked}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:shadow-red-900/50 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t('auth.verifyingEllipsis', 'Verifying…')}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> {needsSetup ? t('auth.saveAndContinue', 'Save & Continue') : t('auth.verifyAndContinue', 'Verify & Continue')}
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => signOut()}
          className="mt-5 mx-auto flex items-center gap-1 text-xs font-semibold text-navy-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t('auth.signOut', 'Sign out')}
        </button>
      </motion.div>
    </AnimatePresence>,
  );
}
