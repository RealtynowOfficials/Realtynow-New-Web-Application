import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowLeft,
  RotateCw,
  Loader2,
  LockKeyhole,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/admin-auth-context';
import { useToast } from '../../components/toast';
import { LogoLight } from '../../components/logo';
import { cn } from '../../lib/utils';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AdminLoginPage() {
  const {
    admin,
    loginStep,
    pendingAuth,
    loginWithCredentials,
    verifyOtp,
    resendOtp,
    forgotPasswordOtp,
    resetPasswordWithOtp,
  } = useAdminAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';
  const isExpiredSession = searchParams.get('expired') === 'true';
  const { addToast } = useToast();

  // Step 1 State: Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);

  // Step 2 State: 2FA Mobile SMS OTP
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'input' | 'verify'>('input');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotAdminId, setForgotAdminId] = useState('');
  const [forgotMaskedMobile, setForgotMaskedMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Auto redirect if already authenticated
  useEffect(() => {
    if (admin && loginStep === 'authenticated') {
      navigate(redirectPath, { replace: true });
    }
  }, [admin, loginStep, navigate, redirectPath]);

  // Timer for Step 2 OTP Expiration
  useEffect(() => {
    if (loginStep !== 'otp') return;
    setExpirySeconds(OTP_EXPIRY_SECONDS);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setExpirySeconds((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [loginStep]);

  // Handle Step 1: Email + Password Submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setCredentialsError('Please enter both admin email and password.');
      return;
    }
    setCredentialsError(null);
    setIsSubmittingCredentials(true);

    try {
      await loginWithCredentials(email, password);
      addToast('success', 'Credentials verified. Complete 2FA OTP step to sign in.');
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setCredentialsError(err instanceof Error ? err.message : 'Invalid login credentials');
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  // Handle Step 2: OTP Submit
  const handleOtpSubmit = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH || expirySeconds <= 0) return;
      setIsVerifyingOtp(true);
      setOtpError(null);

      try {
        await verifyOtp(code);
        addToast('success', '2FA Authentication successful! Welcome to Admin Portal.');
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : 'Invalid OTP code');
      } finally {
        setIsVerifyingOtp(false);
      }
    },
    [expirySeconds, verifyOtp, navigate, redirectPath, addToast]
  );

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await resendOtp();
      setOtp(Array(OTP_LENGTH).fill(''));
      setOtpError(null);
      setExpirySeconds(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      addToast('success', 'A new 2FA OTP has been sent to your mobile');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Could not resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/[^\d]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    const joined = next.join('');
    if (joined.length === OTP_LENGTH) handleOtpSubmit(joined);
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
    if (pasted.length === OTP_LENGTH) handleOtpSubmit(pasted);
  };

  // Handle Forgot Password Flow
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Enter your registered admin email or mobile number.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);

    try {
      const res = await forgotPasswordOtp(forgotIdentifier);
      setForgotAdminId(res.adminId);
      setForgotMaskedMobile(res.maskedMobile);
      setForgotStep('verify');
      addToast('success', `Reset OTP sent to ${res.maskedMobile}`);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Account not found');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword) {
      setForgotError('Enter OTP code and new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);

    try {
      await resetPasswordWithOtp(forgotAdminId, forgotOtp, forgotNewPassword);
      addToast('success', 'Password reset successfully! Please log in with your new password.');
      setShowForgotModal(false);
      setForgotStep('input');
      setForgotIdentifier('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy-950 px-4 py-10">
      {/* Background Grid Accent */}
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
        {/* Header Logo & Title */}
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoLight to="/" size={160} src="/2.png" />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-red-300 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" /> Separate Admin Portal
          </span>
        </div>

        {isExpiredSession && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Session expired due to 30 minutes of inactivity. Please sign in again.
          </div>
        )}

        <AnimatePresence mode="wait">
          {loginStep === 'credentials' ? (
            /* STEP 1: EMAIL & PASSWORD FORM */
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-center font-display text-2xl font-bold text-white">Administrator Sign In</h1>
              <p className="mt-1.5 text-center text-xs text-navy-300">
                Independent authentication with mandatory 2FA OTP verification.
              </p>

              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1.5">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@realtynow.in"
                      autoFocus
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-sm font-medium text-white placeholder:text-navy-500 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotStep('input');
                        setForgotError(null);
                      }}
                      className="text-xs font-medium text-red-400 hover:text-red-300 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-11 text-sm font-medium text-white placeholder:text-navy-500 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-navy-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-white/20 bg-white/10 text-red-600 focus:ring-0"
                    />
                    Remember credentials
                  </label>
                  <span className="text-[11px] font-semibold text-red-400/90">2FA Mandatory</span>
                </div>

                {credentialsError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{credentialsError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingCredentials}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:shadow-red-900/50 active:scale-[0.99] disabled:opacity-60"
                >
                  {isSubmittingCredentials ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Credentials…
                    </>
                  ) : (
                    'Verify & Send 2FA OTP'
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-navy-400">
                Not an admin?{' '}
                <a href="/login" className="font-semibold text-navy-200 hover:text-red-400">
                  Consumer Sign In
                </a>
              </p>
            </motion.div>
          ) : (
            /* STEP 2: MANDATORY 2FA MOBILE OTP VERIFICATION */
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => window.location.reload()}
                className="mb-4 flex items-center gap-1 text-xs font-semibold text-navy-300 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change Credentials
              </button>

              <h1 className="text-center font-display text-2xl font-bold text-white">2FA Mobile Verification</h1>
              <p className="mt-1 text-center text-xs text-navy-300">
                Enter the {OTP_LENGTH}-digit 2FA SMS code sent to{' '}
                <span className="font-semibold text-white">{pendingAuth?.maskedMobile}</span>
              </p>

              <div className="mt-6 flex justify-center gap-2 sm:gap-2.5">
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
                    onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    disabled={isVerifyingOtp || expirySeconds <= 0}
                    className={cn(
                      'h-12 w-11 sm:h-13 sm:w-12 rounded-xl border-2 bg-white/[0.06] text-center text-xl font-bold text-white outline-none transition',
                      digit ? 'border-red-500/70 shadow-[0_0_0_3px_rgba(220,38,38,0.15)]' : 'border-white/10 focus:border-red-500/70',
                      'disabled:opacity-50'
                    )}
                  />
                ))}
              </div>

              {otpError && <p className="mt-3 text-center text-xs font-medium text-red-400">{otpError}</p>}
              {expirySeconds <= 0 && !otpError && (
                <p className="mt-3 text-center text-xs font-medium text-red-400">OTP code expired. Click Resend OTP below.</p>
              )}

              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="text-navy-400">
                  {expirySeconds > 0 ? `Expires in ${formatTimer(expirySeconds)}` : 'Expired'}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="flex items-center gap-1 font-semibold text-red-400 disabled:text-navy-500 hover:text-red-300"
                >
                  <RotateCw className={cn('h-3.5 w-3.5', isResending && 'animate-spin')} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend 2FA OTP'}
                </button>
              </div>

              {isVerifyingOtp && (
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-navy-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying 2FA Security Token…
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* FORGOT PASSWORD MODAL */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-navy-900 p-6 shadow-2xl text-white"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute right-4 top-4 text-navy-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="font-display text-xl font-bold">Admin Password Reset</h2>
              <p className="mt-1 text-xs text-navy-300">
                Verify mobile SMS OTP to configure a new administrator password.
              </p>

              {forgotStep === 'input' ? (
                <form onSubmit={handleForgotSendOtp} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1">
                      Admin Email or Mobile
                    </label>
                    <div className="relative">
                      <Smartphone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="admin@realtynow.in or +919876543210"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm font-medium text-white placeholder:text-navy-500 outline-none focus:border-red-500/70"
                      />
                    </div>
                  </div>

                  {forgotError && <p className="text-xs text-red-400 font-medium">{forgotError}</p>}

                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isForgotLoading ? 'Sending OTP…' : 'Send Reset OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotResetPassword} className="mt-5 space-y-4">
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> OTP sent to registered mobile ({forgotMaskedMobile})
                  </p>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1">
                      6-Digit OTP
                    </label>
                    <input
                      type="text"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-3 text-sm font-mono text-white outline-none focus:border-red-500/70"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-navy-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                      <input
                        type="password"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm font-medium text-white outline-none focus:border-red-500/70"
                      />
                    </div>
                  </div>

                  {forgotError && <p className="text-xs text-red-400 font-medium">{forgotError}</p>}

                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isForgotLoading ? 'Resetting Password…' : 'Update Password & Return'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
