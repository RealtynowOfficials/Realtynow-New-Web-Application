import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, Smartphone, ArrowLeft, RotateCw, Building2, UserCircle2 } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useToast } from '../../components/toast';
import { Button, Input } from '../../components/ui';
import { Logo, LogoLight } from '../../components/logo';
import { cn } from '../../lib/utils';
import { initMsg91Widget, sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp, MSG91_CAPTCHA_CONTAINER_ID } from '../../lib/msg91';

const OTP_LENGTH = 4;
const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 10;
const PRIMARY_RED = '#D8232A';

type LoginTab = 'customer' | 'agent';

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

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-12 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
        <LogoLight to="/" className="relative" size={220} src="/2.png" />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight">
            {t('auth.welcomeBack', 'Welcome to RealtyNow')}
          </h2>
          <p className="mt-3 max-w-md text-navy-200">
            {t('auth.otpSub', 'Sign in instantly with your mobile number — no password needed.')}
          </p>
          <ul className="mt-6 space-y-3 text-sm text-navy-200">
            {[
              t('auth.feat1', 'AI-powered property recommendations'),
              t('auth.feat2', 'Verified listings & trusted agents'),
              t('auth.feat3', 'Real-time notifications'),
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold-400" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-400">
          &copy; {new Date().getFullYear()} Realtynow Properties Private limited.{' '}
          {t('footer.rightsReserved', 'All rights reserved.')}
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-navy-50/40 px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo to="/" size={220} src="/2.png" />
          </div>

          {step === 'mobile' && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-navy-100/70 p-1.5">
              <button
                type="button"
                onClick={() => selectTab('customer')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors',
                  tab === 'customer' ? 'text-white shadow' : 'text-navy-500 hover:text-navy-800',
                )}
                style={tab === 'customer' ? { backgroundColor: PRIMARY_RED } : undefined}
              >
                <UserCircle2 className="h-4 w-4" /> {t('auth.tabCustomer', 'Buyer / Owner')}
              </button>
              <button
                type="button"
                onClick={() => selectTab('agent')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-colors',
                  tab === 'agent' ? 'text-white shadow' : 'text-navy-500 hover:text-navy-800',
                )}
                style={tab === 'agent' ? { backgroundColor: PRIMARY_RED } : undefined}
              >
                <Building2 className="h-4 w-4" /> {t('auth.tabAgent', 'Agent / Builder')}
              </button>
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
                  className="mt-6 space-y-4"
                >
                  <div className="relative">
                    <Smartphone className="pointer-events-none absolute left-[52px] top-[38px] h-4 w-4 text-navy-400" />
                    <span className="pointer-events-none absolute left-3 top-[34px] text-sm font-semibold text-navy-500">
                      +91
                    </span>
                    <Input
                      label={t('auth.mobileNumber', 'Mobile Number')}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="98765 43210"
                      className="pl-[76px]"
                      error={mobileError ?? undefined}
                      autoFocus
                      inputMode="tel"
                      maxLength={10}
                    />
                  </div>
                  {/* MSG91 renders its H-Captcha challenge into this element (captchaRenderId in src/lib/msg91.ts) */}
                  <div id={MSG91_CAPTCHA_CONTAINER_ID} className="flex justify-center" />
                  <Button type="submit" className="w-full" loading={sending}>
                    {t('auth.sendOtp', 'Send OTP')}
                  </Button>
                </form>
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
                    <div className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5 text-center shadow-sm">
                      <ShieldCheck className="mx-auto h-8 w-8 text-success-600" />
                      <p className="mt-2 font-bold text-navy-900">Request submitted</p>
                      <p className="mt-1 text-sm text-navy-500">
                        An administrator will review your request and create your account shortly.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-navy-100 bg-navy-50/70 p-5 shadow-sm">
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
                        <Button
                          className="w-full"
                          onClick={submitAgentRequest}
                          loading={requestSubmitting}
                          disabled={!requestName.trim()}
                        >
                          Request account access
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <h1 className="font-display text-2xl font-bold text-navy-900">{t('auth.verifyOtp', 'Verify OTP')}</h1>
                    <p className="mt-1.5 text-sm text-navy-500">
                      {t('auth.otpSentTo', `Enter the ${OTP_LENGTH}-digit code sent to`)}{' '}
                      <span className="font-semibold text-navy-700">{normalizeMobile(mobile)}</span>
                    </p>

                    <div className="mt-6 flex justify-center gap-3">
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
                          className="h-14 w-14 rounded-xl border border-navy-200 text-center text-2xl font-bold text-navy-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:bg-navy-50"
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
                        className="flex items-center gap-1 font-semibold text-primary-600 disabled:text-navy-400"
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0
                          ? `${t('auth.resendIn', 'Resend in')} ${resendCooldown}s`
                          : t('auth.resendOtp', 'Resend OTP')}
                      </button>
                    </div>

                    {verifying && (
                      <p className="mt-4 text-center text-sm text-navy-500">{t('auth.verifying', 'Verifying…')}</p>
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
