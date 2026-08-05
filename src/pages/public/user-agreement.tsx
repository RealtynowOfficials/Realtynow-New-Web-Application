import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Ban,
  Lock,
  Scale,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function UserAgreementPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">User Agreement</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                End User Terms & Rules
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            User Agreement
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            This agreement governs account registration, platform usage, member obligations, and acceptable use guidelines across RealtyNow.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section id="ua-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Acceptance</span>
            </h2>
            <p className="mb-3">
              By creating an account or using <strong>RealtyNow</strong>, you agree to this User Agreement and all related policies.
            </p>
          </section>

          {/* Section 2 */}
          <section id="ua-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>User Responsibilities</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Users agree to:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-800">
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Provide accurate information</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Maintain account security</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Keep OTPs and login credentials confidential</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Use the platform lawfully</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 sm:col-span-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Respect the rights of other users</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="ua-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>Prohibited Activities</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Users must not:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Publish false property information</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Upload copyrighted content without permission</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Use automated bots or scraping tools</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Attempt unauthorized access</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Spread malware or harmful code</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Harass or abuse other users</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2 sm:col-span-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Engage in fraudulent activities</span>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="ua-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">4</span>
              <span>Account Suspension</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">RealtyNow may suspend or terminate accounts involved in:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>Fraud</li>
              <li>Fake listings</li>
              <li>Identity impersonation</li>
              <li>Repeated policy violations</li>
              <li>Illegal activities</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="ua-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">5</span>
              <span>Intellectual Property</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              All content, software, branding, logos, graphics, and databases on RealtyNow are the intellectual property of RealtyNow or its licensors.
            </p>
            <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Users may not reproduce, copy, distribute, or modify platform content without prior written permission.
            </p>
          </section>

          {/* Section 6 */}
          <section id="ua-6" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">6</span>
              <span>Disclaimer</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              RealtyNow provides a platform for property discovery and listing. We do not guarantee:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm mb-3">
              <li>Property ownership</li>
              <li>Legal title</li>
              <li>Transaction completion</li>
              <li>Investment returns</li>
              <li>Property condition</li>
            </ul>
            <p className="text-xs font-bold text-slate-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ Users should independently verify all property details and documents before making any transaction.
            </p>
          </section>

          {/* Section 7 */}
          <section id="ua-7" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">7</span>
              <span>Limitation of Liability</span>
            </h2>
            <p className="text-xs sm:text-sm">
              To the fullest extent permitted by law, RealtyNow shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of the platform.
            </p>
          </section>

          {/* Section 8: Governing Law */}
          <section id="ua-8" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-400" />
              8. Governing Law
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              This agreement shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of the competent courts where RealtyNow&apos;s registered office is located (Hyderabad, Telangana, India).
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-white/10 pt-4">
              <span>Contact: info@realtynow.in / support@realtynow.in</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
