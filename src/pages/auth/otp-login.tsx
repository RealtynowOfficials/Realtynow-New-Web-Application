import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Home,
  Briefcase,
  HardHat,
  Star,
  Sparkles,
  Users,
  Loader2,
  Lock,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useToast } from '../../components/toast';
import { Input } from '../../components/ui';
import { Logo, LogoLight } from '../../components/logo';
import { cn } from '../../lib/utils';
import { initMsg91Widget, sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp, MSG91_CAPTCHA_CONTAINER_ID } from '../../lib/msg91';

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 10;
const PRIMARY_RED = '#D8232A';

type LoginTab = 'customer' | 'agent';

// Purely presentational — four segments map onto the same two functional login intents
// (LoginTab) that already exist. Buyer/Owner both drive the 'customer' OTP flow, Agent/
// Builder both drive the 'agent' flow, exactly as the previous 2-tab UI did.
type Segment = 'buyer' | 'owner' | 'agent' | 'builder';
const SEGMENTS: { id: Segment; label: string; tab: LoginTab; icon: typeof Search }[] = [
  { id: 'buyer', label: 'Buyer', tab: 'customer', icon: Search },
  { id: 'owner', label: 'Owner', tab: 'customer', icon: Home },
  { id: 'agent', label: 'Agent', tab: 'agent', icon: Briefcase },
  { id: 'builder', label: 'Builder', tab: 'agent', icon: HardHat },
];

// Fixed (not random-per-render) positions/timings for the left panel's floating particles —
// deterministic so the animation doesn't jump on re-renders.
const PARTICLES = [
  { x: 8, y: 18, duration: 6, delay: 0 },
  { x: 22, y: 62, duration: 7.5, delay: 0.6 },
  { x: 38, y: 30, duration: 5.5, delay: 1.2 },
  { x: 55, y: 75, duration: 8, delay: 0.3 },
  { x: 68, y: 22, duration: 6.5, delay: 1.8 },
  { x: 80, y: 55, duration: 7, delay: 0.9 },
  { x: 90, y: 15, duration: 6.8, delay: 1.5 },
  { x: 15, y: 85, duration: 7.2, delay: 2.1 },
  { x: 48, y: 12, duration: 5.8, delay: 0.4 },
  { x: 72, y: 88, duration: 6.3, delay: 1.1 },
];

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

/** Role destinations mirror the existing ternary in App.tsx / public-layout.tsx. */
function dashboardHomeForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'agent') return '/agent';
  if (role === 'builder') return '/builder';
  return '/portal';
}

export function OtpLoginPage() {
  const { t } = useLanguageContext();
  const { verifyOtpAndSignIn, requestAgentAccess, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToast } = useToast();

  const [tab, setTab] = useState<LoginTab>('customer');
  const [segment, setSegment] = useState<Segment>('buyer');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [mobileFocused, setMobileFocused] = useState(false);
  const [sending, setSending] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [reqId, setReqId] = useState<string | undefined>(undefined);
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Set once the verified accessToken comes back AGENT_NOT_FOUND, so the
  // "request access" follow-up can reuse the same already-verified OTP
  // instead of asking the user to verify again.
  const [verifiedAccessToken, setVerifiedAccessToken] = useState<string | null>(null);
  const [agentNotFound, setAgentNotFound] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  useEffect(() => {
    // Pre-warm the widget so the H-Captcha checkbox is already rendered and
    // solvable before the user clicks "Send OTP", rather than only starting
    // init on click (which would leave sendOtp waiting on an unsolved captcha).
    initMsg91Widget().catch((err) => {
      console.error('[MSG91] pre-init failed', err);
    });
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

  useEffect(() => {
    // Redirect away if the user completes login while already on this page.
    if (profile) navigate(params.get('redirect') ?? dashboardHomeForRole(profile.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const selectTab = useCallback((next: LoginTab) => {
    setTab(next);
    setStep('mobile');
    setMobile('');
    setMobileError(null);
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError(null);
    setAgentNotFound(false);
    setVerifiedAccessToken(null);
    setRequestName('');
    setRequestSubmitted(false);
  }, []);

  const selectSegment = useCallback(
    (seg: Segment) => {
      setSegment(seg);
      selectTab(SEGMENTS.find((s) => s.id === seg)!.tab);
    },
    [selectTab],
  );

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
      setAgentNotFound(false);
      setRequestSubmitted(false);
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
      setAgentNotFound(false);
      try {
        const accessToken = await verifyMsg91Otp(code, reqId);
        const { error, isNewUser, code: errCode } = await verifyOtpAndSignIn(accessToken, tab);
        if (error) {
          if (tab === 'agent' && errCode === 'AGENT_NOT_FOUND') {
            setVerifiedAccessToken(accessToken);
            setAgentNotFound(true);
          } else {
            setOtpError(error);
          }
          return;
        }
        addToast('success', isNewUser ? 'Account created!' : 'Welcome back!');
        // Actual navigation happens in the profile-watching effect above,
        // once the profile finishes loading.
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : 'Invalid or expired OTP');
      } finally {
        setVerifying(false);
      }
    },
    [expirySeconds, reqId, tab, verifyOtpAndSignIn, addToast],
  );

  const submitAgentRequest = useCallback(async () => {
    if (!verifiedAccessToken || !requestName.trim()) return;
    setRequestSubmitting(true);
    try {
      const { error } = await requestAgentAccess(verifiedAccessToken, requestName.trim());
      if (error) {
        addToast('error', error);
        return;
      }
      setRequestSubmitted(true);
    } finally {
      setRequestSubmitting(false);
    }
  }, [verifiedAccessToken, requestName, requestAgentAccess, addToast]);

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

  const primaryBtnClass =
    'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_100%] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-red-600/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 lg:grid lg:grid-cols-2">
      {/* ───────────── Left — cinematic panel ───────────── */}
      <div className="relative hidden overflow-hidden lg:block">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: 'easeOut' }}
        >
          <img
            src="https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg"
            alt=""
            className="h-full w-full object-cover"
          />
        </motion.div>

        {/* Cinematic dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/75 to-navy-950/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/70 via-transparent to-navy-950/50" />

        {/* Animated glow */}
        <motion.div
          className="pointer-events-none absolute -left-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-red-600/30 blur-[120px]"
          animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-gold-400/20 blur-[100px]"
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0">
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white/50"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              animate={{ y: [0, -18, 0], opacity: [0.15, 0.8, 0.15] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <LogoLight to="/" size={200} src="/2.png" />

          <div className="max-w-md">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold-400" /> AI-Powered Real Estate
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-4 font-display text-4xl font-bold leading-[1.15] tracking-tight"
            >
              {t('auth.welcomeBack', 'Find Your Perfect')}{' '}
              <span className="bg-gradient-to-r from-red-400 to-gold-400 bg-clip-text text-transparent">
                Place to Call Home
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-3 text-sm leading-relaxed text-navy-200"
            >
              {t('auth.otpSub', 'Sign in instantly with your mobile number — no password needed.')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6 flex flex-wrap gap-2"
            >
              {[
                { icon: ShieldCheck, label: t('auth.feat2', 'Verified listings & trusted agents') },
                { icon: Sparkles, label: t('auth.feat1', 'AI-powered property recommendations') },
                { icon: Users, label: t('auth.feat3', 'Real-time notifications') },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-navy-100 backdrop-blur-md"
                >
                  <Icon className="h-3.5 w-3.5 text-gold-400" /> {label}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-6 flex items-center gap-4 text-xs text-navy-300"
            >
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" /> 4.9/5 rated
              </span>
              <span className="h-3 w-px bg-white/15" />
              <span>10,000+ verified listings</span>
            </motion.div>
          </div>

          <p className="relative text-xs text-navy-400">
            &copy; {new Date().getFullYear()} Realtynow Properties Private limited.{' '}
            {t('footer.rightsReserved', 'All rights reserved.')}
          </p>
        </div>
      </div>

      {/* ───────────── Right — glass login card ───────────── */}
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-50 px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-gold-50 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-[24px] border border-white/60 bg-white/90 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-9"
        >
          <div className="mb-7 flex justify-center lg:hidden">
            <Logo to="/" size={180} src="/2.png" />
          </div>

          {step === 'mobile' && (
            <div className="relative mb-7 grid grid-cols-4 gap-1 rounded-2xl bg-navy-100/70 p-1.5">
              {SEGMENTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectSegment(id)}
                  className="relative rounded-xl py-2.5 text-[11px] font-bold transition-colors"
                >
                  {segment === id && (
                    <motion.span
                      layoutId="segment-pill"
                      className="absolute inset-0 rounded-xl shadow"
                      style={{ backgroundColor: PRIMARY_RED }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex flex-col items-center gap-1',
                      segment === id ? 'text-white' : 'text-navy-500',
                    )}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'mobile' ? (
              <motion.div
                key="mobile"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="font-display text-2xl font-bold text-navy-900">{t('common.login', 'Sign in')}</h1>
                <p className="mt-1.5 text-sm text-navy-500">
                  {tab === 'agent'
                    ? t('auth.otpDescAgent', "Sign in with your registered mobile number.")
                    : t('auth.otpDesc', "We'll send a one-time code to verify your mobile number.")}
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendOtp();
                  }}
                  className="mt-7 space-y-5"
                >
                  <div className="relative">
                    <div
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl border-2 bg-white px-4 pb-2.5 pt-5 transition-all duration-200',
                        mobileError
                          ? 'border-error-400 ring-4 ring-error-100'
                          : mobileFocused
                            ? 'border-red-400 ring-4 ring-red-400/10'
                            : 'border-navy-150',
                      )}
                    >
                      <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-navy-700">
                        <span className="text-base leading-none">🇮🇳</span> +91
                      </span>
                      <span className="h-5 w-px shrink-0 bg-navy-150" />
                      <input
                        id="mobile-input"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        onFocus={() => setMobileFocused(true)}
                        onBlur={() => setMobileFocused(false)}
                        autoFocus
                        inputMode="tel"
                        maxLength={10}
                        className="w-full bg-transparent text-sm font-semibold text-navy-900 outline-none"
                      />
                    </div>
                    <label
                      htmlFor="mobile-input"
                      className={cn(
                        'pointer-events-none absolute left-[4.9rem] transition-all duration-200',
                        mobileFocused || mobile
                          ? 'top-2 text-[10px] font-bold uppercase tracking-wide text-red-500'
                          : 'top-1/2 -translate-y-1/2 text-sm text-navy-400',
                      )}
                    >
                      {t('auth.mobileNumber', 'Mobile Number')}
                    </label>
                    {mobileError && (
                      <p className="mt-1.5 text-xs font-semibold text-error-600">{mobileError}</p>
                    )}
                  </div>

                  {/* MSG91 renders its H-Captcha challenge into this element (captchaRenderId in src/lib/msg91.ts) */}
                  <div className="rounded-2xl border border-navy-100 bg-navy-50/60 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-navy-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Quick human verification
                    </p>
                    <div id={MSG91_CAPTCHA_CONTAINER_ID} className="flex justify-center" />
                  </div>

                  <button type="submit" disabled={sending} className={primaryBtnClass}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> {t('auth.sendingOtp', 'Sending OTP…')}
                      </>
                    ) : (
                      <>
                        {t('auth.sendOtp', 'Send OTP')}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-navy-400">
                  <Lock className="h-3 w-3" />
                  {t('auth.privacyNote', 'Protected by industry-standard encryption.')}{' '}
                  <a href="/privacy" className="font-semibold text-navy-500 hover:text-red-600">
                    Privacy Policy
                  </a>
                  {' & '}
                  <a href="/terms" className="font-semibold text-navy-500 hover:text-red-600">
                    Terms
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
                  onClick={() => {
                    setStep('mobile');
                    setAgentNotFound(false);
                    setVerifiedAccessToken(null);
                    setRequestName('');
                    setRequestSubmitted(false);
                  }}
                  className="mb-4 flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-800"
                >
                  <ArrowLeft className="h-4 w-4" /> {t('auth.changeNumber', 'Change number')}
                </button>

                {agentNotFound ? (
                  requestSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5 text-center shadow-sm"
                    >
                      <ShieldCheck className="mx-auto h-8 w-8 text-success-600" />
                      <p className="mt-2 font-bold text-navy-900">Request submitted</p>
                      <p className="mt-1 text-sm text-navy-500">
                        An administrator will review your request and create your account shortly.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-error-600">
                        Your account has not been created yet. Please contact the administrator.
                      </p>
                      <p className="mt-1 text-sm text-navy-500">
                        Or submit your name below and an admin will set up your account.
                      </p>
                      <div className="mt-4 space-y-3">
                        <Input
                          label="Full name"
                          value={requestName}
                          onChange={(e) => setRequestName(e.target.value)}
                          placeholder="Your full name"
                        />
                        <button
                          onClick={submitAgentRequest}
                          disabled={requestSubmitting || !requestName.trim()}
                          className={primaryBtnClass}
                        >
                          {requestSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Request account access'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )
                ) : (
                  <>
                    <h1 className="font-display text-2xl font-bold text-navy-900">{t('auth.verifyOtp', 'Verify OTP')}</h1>
                    <p className="mt-1.5 text-sm text-navy-500">
                      {t('auth.otpSentTo', `Enter the ${OTP_LENGTH}-digit code sent to`)}{' '}
                      <span className="font-semibold text-navy-700">{normalizeMobile(mobile)}</span>
                    </p>

                    <div className="mt-7 flex justify-center gap-3">
                      {otp.map((digit, i) => (
                        <motion.input
                          key={i}
                          ref={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          disabled={verifying || expirySeconds <= 0}
                          className={cn(
                            'h-14 w-14 rounded-2xl border-2 bg-white text-center text-2xl font-bold text-navy-900 outline-none transition-all duration-200',
                            digit
                              ? 'border-red-400 shadow-[0_0_0_4px_rgba(214,38,52,0.08)]'
                              : 'border-navy-150 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(214,38,52,0.08)]',
                            'disabled:bg-navy-50',
                          )}
                        />
                      ))}
                    </div>

                    {otpError && <p className="mt-3 text-center text-sm text-error-600">{otpError}</p>}
                    {expirySeconds <= 0 && !otpError && (
                      <p className="mt-3 text-center text-sm text-error-600">
                        {t('auth.otpExpired', 'OTP expired. Please resend.')}
                      </p>
                    )}

                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className="text-navy-500">
                        {expirySeconds > 0 ? `${t('auth.expiresIn', 'Expires in')} ${formatTimer(expirySeconds)}` : null}
                      </span>
                      <button
                        onClick={resendOtp}
                        disabled={resendCooldown > 0 || resending}
                        className="flex items-center gap-1 font-semibold text-red-600 disabled:text-navy-400"
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0
                          ? `${t('auth.resendIn', 'Resend in')} ${resendCooldown}s`
                          : t('auth.resendOtp', 'Resend OTP')}
                      </button>
                    </div>

                    {verifying && (
                      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-navy-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('auth.verifying', 'Verifying…')}
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
