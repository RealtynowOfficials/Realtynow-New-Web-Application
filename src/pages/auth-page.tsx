import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLanguageContext } from '../lib/i18n/language-context';
import { Button, Input } from '../components/ui';
import { Logo, LogoLight } from '../components/logo';
import { z } from 'zod';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useLanguageContext();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: params.get('email') ?? '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loginSchema = z.object({
    email: z.string().email(t('auth.validEmail', 'Enter a valid email')),
    password: z.string().min(6, t('auth.min6Chars', 'Min 6 characters')),
  });

  const signupSchema = z.object({
    first_name: z.string().min(1, t('auth.firstNameReq', 'First name required')),
    last_name: z.string().min(1, t('auth.lastNameReq', 'Last name required')),
    email: z.string().email(t('auth.validEmail', 'Enter a valid email')),
    phone: z.string().min(10, t('auth.validPhone', 'Enter a valid phone')),
    password: z.string().min(6, t('auth.min6Chars', 'Min 6 characters')),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    const schema = mode === 'login' ? loginSchema : signupSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      setLoading(false);
      if (error) {
        setServerError(error);
        return;
      }
      navigate(params.get('redirect') ?? '/portal');
    } else {
      const { error, needsEmailConfirmation } = await signUp(form.email, form.password, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      setLoading(false);
      if (error) {
        setServerError(error);
        return;
      }
      if (needsEmailConfirmation) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-12 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
        <LogoLight to="/" className="relative" size={220} src="/2.png" />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight">
            {mode === 'login'
              ? t('auth.welcomeBack', 'Welcome back to RealtyNow')
              : t('auth.startJourney', 'Start your real estate journey')}
          </h2>
          <p className="mt-3 max-w-md text-navy-200">
            {mode === 'login'
              ? t('auth.loginSub', 'Sign in to manage your properties, enquiries, and saved listings.')
              : t(
                  'auth.signupSub',
                  'Create an account to list properties, save favorites, and connect with verified agents.',
                )}
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
          &copy; {new Date().getFullYear()} Realtynow Properties Private limited. {t('footer.rightsReserved', 'All rights reserved.')}
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

          <h1 className="font-display text-2xl font-bold text-navy-900">
            {mode === 'login' ? t('common.login', 'Sign in') : t('auth.createAccount', 'Create your account')}
          </h1>
          <p className="mt-1.5 text-sm text-navy-500">
            {mode === 'login'
              ? t('auth.loginDesc', 'Enter your credentials to access your account.')
              : t('auth.signupDesc', "Join RealtyNow as a customer — it's free.")}
          </p>



          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label={t('auth.firstName', 'First name')}
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    error={errors.first_name}
                  />
                </div>
                <Input
                  label={t('auth.lastName', 'Last name')}
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  error={errors.last_name}
                />
              </div>
            )}
            <div className="relative">
              <Input
                label={t('auth.email', 'Email')}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
                placeholder="you@email.com"
                className="pl-10"
              />
              <Mail className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-navy-400" />
            </div>
            {mode === 'signup' && (
              <Input
                label={t('auth.phone', 'Phone')}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                error={errors.phone}
                placeholder="+91 90000 00000"
              />
            )}
            <div className="relative">
              <Input
                label={t('auth.password', 'Password')}
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                error={errors.password}
                placeholder="••••••••"
                className="pl-10 pr-10"
              />
              <Lock className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-navy-400" />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-[34px] text-navy-400 hover:text-navy-700"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {serverError && (
              <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                {serverError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'login' ? t('common.login', 'Sign in') : t('auth.createAccountBtn', 'Create account')}{' '}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-navy-600">
            {mode === 'login' ? (
              <>
                {t('auth.noAccount', "Don't have an account?")}{' '}
                <Link to="/signup" className="font-semibold text-navy-800 hover:underline">
                  {t('common.register', 'Sign up')}
                </Link>
              </>
            ) : (
              <>
                {t('auth.hasAccount', 'Already have an account?')}{' '}
                <Link to="/login" className="font-semibold text-navy-800 hover:underline">
                  {t('common.login', 'Sign in')}
                </Link>
              </>
            )}
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-navy-400">
            <Link to="/forgot-password" className="hover:text-navy-700">
              {t('auth.forgotPassword', 'Forgot password?')}
            </Link>
            <span>·</span>
            <Link to="/agent/login" className="hover:text-navy-700">
              {t('auth.agentLogin', 'Agent login')}
            </Link>
            <span>·</span>
            <Link to="/admin/login" className="hover:text-navy-700">
              {t('auth.adminLogin', 'Admin login')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { t } = useLanguageContext();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50/40 px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Logo to="/" className="mb-8 justify-center" size={220} src="/2.png" />
        <div className="card p-6">
          <h1 className="font-display text-2xl font-bold text-navy-900">
            {t('auth.resetPasswordTitle', 'Reset password')}
          </h1>
          {sent ? (
            <p className="mt-3 text-sm text-navy-600">
              {t('auth.resetSentDesc', 'If an account exists for')} <span className="font-medium">{email}</span>,{' '}
              {t('auth.resetSentDesc2', "you'll receive a reset link shortly.")}
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-sm text-navy-500">
                {t('auth.resetSubtitle', "Enter your email and we'll send you a reset link.")}
              </p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <Input
                  label={t('auth.email', 'Email')}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
                {error && (
                  <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
                    {error}
                  </div>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  {t('auth.sendResetLink', 'Send reset link')}
                </Button>
              </form>
            </>
          )}
          <p className="mt-5 text-center text-sm text-navy-600">
            <Link to="/login" className="font-semibold text-navy-800 hover:underline">
              {t('auth.backToSignIn', 'Back to sign in')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function StaffLoginPage({ role }: { role: 'agent' | 'admin' | 'builder' }) {
  const { t } = useLanguageContext();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    role === 'agent' ? 'agent@realtynow.demo' : role === 'builder' ? 'builder@realtynow.demo' : 'admin@realtynow.demo',
  );
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate(role === 'agent' ? '/agent' : role === 'builder' ? '/builder' : '/admin');
  };

  const roleTitle =
    role === 'agent'
      ? t('auth.agentLogin', 'Agent Portal')
      : role === 'builder'
        ? t('auth.builderLogin', 'Builder Portal')
        : t('auth.adminLogin', 'Admin Portal');

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-6">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg)',
          backgroundSize: 'cover',
        }}
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <LogoLight to="/" className="mb-8 justify-center" size={220} src="/2.png" />
        <div className="glass-dark rounded-2xl border border-white/10 p-6 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold-400" />
            <h1 className="font-display text-2xl font-bold capitalize">{roleTitle}</h1>
          </div>
          <p className="mt-1.5 text-sm text-navy-200">
            {t('auth.secureAccess', 'Secure access for authorized personnel only.')}
          </p>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-navy-200">
            <p className="font-semibold text-white">Demo {role} login:</p>
            <p>{role}@realtynow.demo / Demo1234!</p>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">{t('auth.email', 'Email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-navy-300 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">{t('auth.password', 'Password')}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-navy-300 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-error-300/40 bg-error-500/20 px-3 py-2 text-sm text-error-200">
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} variant="gold" className="w-full" size="lg">
              {t('auth.secureSignIn', 'Secure sign in')}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-center text-sm text-navy-300">
          <Link to="/login" className="hover:text-white">
            {t('auth.customerSignIn', 'Customer sign in')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
