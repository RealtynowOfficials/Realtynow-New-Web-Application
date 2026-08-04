import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RotateCw, Loader2, LockKeyhole } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/toast';
import { LogoLight } from '../../components/logo';
import { cn } from '../../lib/utils';
import { initMsg91Widget, sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp, MSG91_CAPTCHA_CONTAINER_ID } from '../../lib/msg91';
import { isAdmin2faVerified } from '../../lib/admin-security';
import { AdminSecretGate } from '../../components/admin-secret-gate';

// Dedicated admin entry point — deliberately separate page/route/UI from src/pages/auth/
// otp-login.tsx (the Buyer/Owner/Agent/Builder login). Under the hood it still uses the same
// Supabase Auth session (verifyOtpAndSignIn) because every RLS policy in the database trusts
// that session — a truly separate session would mean either shipping a service-role key to
// the browser or rewriting every admin page's data access, both far riskier than what this
// page actually needs to guarantee: a non-admin can NEVER reach the admin dashboard, no
// matter which login page they use, and admins never see or share UI with any other role.
// After OTP verification, non-admin accounts are immediately signed back out here.

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 10;

const mobileSchema = z
  .string()
  .trim()
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v.replace(/\s/g, '')), 'Enter a valid 10-digit Indian mobile number');

function normalizeMobile(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  const last10 = digits.slice(-10);
  return `+91${last10}`;
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AdminLoginPage() {
  const { verifyOtpAndSignIn, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [reqId, setReqId] = useState<string | undefined>(undefined);
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    initMsg91Widget().catch((err) => console.error('[MSG91] pre-init failed', err));
  }, []);

  useEffect(() => {
    if (step !== 'otp') return;
    setExpirySeconds(OTP_EXPIRY_SECONDS);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setExpirySeconds((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Single gate for the whole page: whenever a Supabase session resolves (fresh OTP sign-in
  // here, or an existing session from elsewhere), non-admins are rejected and signed out on
  // the spot; admins skip straight past this page if already 2FA-verified this browser
  // session, otherwise they fall through to the AdminSecretGate render below.
  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') {
      setDeniedMessage('This portal is for administrators only. Your account does not have admin access.');
      signOut();
      return;
    }
    setDeniedMessage(null);
    if (isAdmin2faVerified()) {
      navigate('/admin', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const sendOtp = useCallback(async () => {
    const parsed = mobileSchema.safeParse(mobile);
    if (!parsed.success) {
      setMobileError(parsed.error.issues[0]?.message ?? 'Enter a valid mobile number');
      return;
    }
    setMobileError(null);
    setSending(true);
    try {
      const id = await sendMsg91Otp(normalizeMobile(mobile));
      setReqId(id);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError(null);
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  }, [mobile, addToast]);

  const resendOtp = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await retryMsg91Otp(reqId);
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError(null);
      setExpirySeconds(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      addToast('success', 'OTP resent');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not resend OTP');
    } finally {
      setResending(false);
    }
  }, [reqId, resendCooldown, resending, addToast]);

  const submitOtp = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH || expirySeconds <= 0) return;
      setVerifying(true);
      setOtpError(null);
      try {
        const accessToken = await verifyMsg91Otp(code, reqId);
        // Always the 'customer' intent — it's the only OTP-auth path with no role
        // restriction. The role check happens right here, after sign-in, not before.
        const { error } = await verifyOtpAndSignIn(accessToken, 'customer');
        if (error) {
          setOtpError(error);
          return;
        }
        // Success falls through to the profile-watching effect above, which checks
        // profile.role and either rejects the session or moves on to the secret code.
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : 'Invalid or expired OTP');
      } finally {
        setVerifying(false);
      }
    },
    [expirySeconds, reqId, verifyOtpAndSignIn],
  );

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^\d]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    const joined = next.join('');
    if (joined.length === OTP_LENGTH) submitOtp(joined);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/[^\d]/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((d, i) => (next[i] = d));
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) submitOtp(pasted);
  };

  // Already signed in as a verified admin — hand off entirely to the secret-code gate
  // (same component ProtectedRoute uses for anyone landing on /admin/* directly).
  if (profile?.role === 'admin' && !isAdmin2faVerified()) {
    return <AdminSecretGate onVerified={() => navigate('/admin', { replace: true })} />;
  }

  if (deniedMessage) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy-950 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/95 p-7 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-error-50 text-error-600">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-navy-900">Access Denied</h1>
          <p className="mt-1.5 text-sm text-navy-500">{deniedMessage}</p>
          <button
            type="button"
            onClick={() => {
              setDeniedMessage(null);
              setStep('mobile');
              setMobile('');
              setOtp(Array(OTP_LENGTH).fill(''));
            }}
            className="mt-5 w-full rounded-2xl bg-navy-900 py-3 text-sm font-bold text-white transition hover:bg-navy-800"
          >
            Try a different account
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy-950 px-4 py-10">
      {/* Restrained security-themed backdrop — deliberately not the cinematic property imagery
          used on the consumer login, so this reads as a distinct, more serious portal. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-red-900/25 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-2xl sm:p-9"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoLight to="/" size={170} src="/2.png" />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Portal
          </span>
        </div>

        <AnimatePresence mode="wait">
          {step === 'mobile' ? (
            <motion.div
              key="mobile"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-center font-display text-2xl font-bold text-white">Administrator Sign In</h1>
              <p className="mt-1.5 text-center text-sm text-navy-300">
                Restricted to authorized RealtyNow staff. Verify your registered mobile number to continue.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendOtp();
                }}
                className="mt-7 space-y-4"
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-navy-300">
                    +91
                  </span>
                  <input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Registered admin mobile number"
                    autoFocus
                    inputMode="tel"
                    maxLength={10}
                    className={cn(
                      'w-full rounded-2xl border-2 bg-white/[0.06] py-3.5 pl-12 pr-4 text-sm font-semibold text-white placeholder:text-navy-400 outline-none transition-all',
                      mobileError ? 'border-error-500/70 ring-4 ring-error-500/10' : 'border-white/10 focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10',
                    )}
                  />
                </div>
                {mobileError && <p className="text-xs font-semibold text-error-400">{mobileError}</p>}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-navy-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Human verification
                  </p>
                  <div id={MSG91_CAPTCHA_CONTAINER_ID} className="flex justify-center" />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-all hover:shadow-red-900/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] text-navy-400">
                Not an administrator?{' '}
                <a href="/login" className="font-semibold text-navy-200 hover:text-red-400">
                  Go to the main login
                </a>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setStep('mobile')}
                className="mb-4 flex items-center gap-1 text-sm font-semibold text-navy-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Change number
              </button>

              <h1 className="text-center font-display text-2xl font-bold text-white">Verify OTP</h1>
              <p className="mt-1.5 text-center text-sm text-navy-300">
                Enter the {OTP_LENGTH}-digit code sent to{' '}
                <span className="font-semibold text-white">{normalizeMobile(mobile)}</span>
              </p>

              <div className="mt-7 flex justify-center gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    disabled={verifying || expirySeconds <= 0}
                    className={cn(
                      'h-14 w-14 rounded-2xl border-2 bg-white/[0.06] text-center text-2xl font-bold text-white outline-none transition-all',
                      digit ? 'border-red-500/70 shadow-[0_0_0_4px_rgba(220,38,38,0.12)]' : 'border-white/10 focus:border-red-500/70',
                      'disabled:opacity-50',
                    )}
                  />
                ))}
              </div>

              {otpError && <p className="mt-3 text-center text-sm text-error-400">{otpError}</p>}
              {expirySeconds <= 0 && !otpError && (
                <p className="mt-3 text-center text-sm text-error-400">OTP expired. Please resend.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-navy-400">
                  {expirySeconds > 0 ? `Expires in ${formatTimer(expirySeconds)}` : null}
                </span>
                <button
                  onClick={resendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className="flex items-center gap-1 font-semibold text-red-400 disabled:text-navy-500"
                >
                  <RotateCw className={cn('h-3.5 w-3.5', resending && 'animate-spin')} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              {verifying && (
                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-navy-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
