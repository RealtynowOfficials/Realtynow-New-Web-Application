import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';
import { Logo } from '../../components/logo';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) {
      setError('No email found. Please sign up again.');
      return;
    }
    setResending(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal` },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-navy-600/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Logo to="/" size={220} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-white shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gold-400/20 flex items-center justify-center">
                <MailCheck className="h-10 w-10 text-gold-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-success-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-center font-display text-2xl font-bold text-white mb-2">Check your inbox</h1>
          <p className="text-center text-navy-200 text-sm leading-relaxed">
            We've sent a verification link to
            {email && <span className="block font-semibold text-gold-300 mt-1 break-all">{email}</span>}
          </p>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-xs text-navy-300">
            <p className="font-semibold text-white text-sm">What to do next:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open your email inbox</li>
              <li>
                Click the <span className="text-gold-300">"Confirm your email"</span> button
              </li>
              <li>You'll be redirected to your dashboard automatically</li>
            </ol>
            <p className="mt-2 text-navy-400">Can't find it? Check your spam / promotions folder.</p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-300">
              {error}
            </div>
          )}

          {resent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 rounded-lg border border-success-500/30 bg-success-500/10 px-3 py-2 text-sm text-success-300 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Verification email resent successfully!
            </motion.div>
          )}

          <Button
            variant="gold"
            className="mt-6 w-full"
            loading={resending}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={resend}
          >
            Resend verification email
          </Button>

          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <Link to="/login" className="flex items-center gap-1.5 text-navy-300 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
            <span className="text-navy-600">·</span>
            <Link to="/signup" className="text-navy-300 hover:text-white transition-colors">
              Use different email
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-navy-500">
          Having trouble?{' '}
          <Link to="/contact" className="text-navy-400 hover:text-white transition-colors">
            Contact support
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
