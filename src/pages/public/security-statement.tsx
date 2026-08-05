import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  CreditCard,
  Server,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Mail,
  Smartphone,
  Globe,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function SecurityStatementPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Secure HTTPS & Security Statement</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Platform Security Standard
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Secure HTTPS & Security Statement
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            At RealtyNow, protecting your personal information, account security, and financial transactions is our top priority.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1: Our Security Measures */}
          <section id="sec-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <span>Our Security Measures</span>
            </h2>
            <p className="mb-4 text-xs sm:text-sm">We use industry-standard security practices across all systems, including:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-semibold text-slate-800">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>HTTPS (SSL/TLS 256-bit) end-to-end encryption for all communications.</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Secure authentication using Mobile OTP and Role-Based Access Control (RBAC).</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Encrypted storage of sensitive credentials, hashes, and secrets.</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Secure payment processing through certified payment gateways such as Razorpay.</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Continuous 24/7 monitoring for unauthorized access and suspicious activity.</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Regular vulnerability assessments, security updates, and software maintenance.</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5 sm:col-span-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Secure cloud infrastructure with multi-tenant isolation and restricted administrative access.</span>
              </div>
            </div>
          </section>

          {/* Section 2: User Responsibilities */}
          <section id="sec-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>User Responsibilities</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">To help keep your account secure, you should:</p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li><strong>Never share your OTP</strong>, verification codes, or passwords with anyone.</li>
              <li>Use only the official <strong>RealtyNow</strong> website or mobile application.</li>
              <li>Verify that the website URL begins with <strong>https://</strong> before entering personal or financial details.</li>
              <li>Report any suspicious activity or unauthorized account access immediately to our team.</li>
            </ul>
          </section>

          {/* Section 3: Payment Security */}
          <section id="sec-3" className="scroll-mt-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5 mb-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>Payment Security Guarantee</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              RealtyNow does <strong>NOT</strong> store your debit card, credit card, net banking credentials, or UPI PIN. 
              All payment information is processed securely by PCI-DSS Level 1 certified third-party payment providers (such as Razorpay).
            </p>
          </section>

          {/* Section 4: Contact Box */}
          <section id="sec-4" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Report Vulnerabilities & Security Concerns
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              For security concerns, security audit reports, or to responsibly disclose a vulnerability:
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs font-bold text-slate-200">
              <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Email: <a href="mailto:info@realtynow.in" className="text-blue-400 hover:underline">info@realtynow.in</a> / <a href="mailto:support@realtynow.in" className="text-blue-400 hover:underline">support@realtynow.in</a></span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
