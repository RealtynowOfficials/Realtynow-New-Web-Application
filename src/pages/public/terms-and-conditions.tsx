import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Scale,
  Ban,
  CreditCard,
  Mail,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function TermsAndConditionsPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Terms & Conditions</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold shadow-xs">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                User Agreement & Terms
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Terms & Conditions
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            Welcome to RealtyNow. Please read these Terms and Conditions carefully before using our website, 
            mobile platform, and real estate services.
          </p>
        </div>

        {/* Main Terms Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section id="term-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Acceptance of Terms</span>
            </h2>
            <p className="mb-3">
              By accessing or using the <strong>RealtyNow</strong> platform, mobile application, or services, you agree to be bound by these Terms and Conditions.
            </p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              If you disagree with any part of these terms, please discontinue use of the platform immediately.
            </p>
          </section>

          {/* Section 2 */}
          <section id="term-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>User Eligibility</span>
            </h2>
            <p className="mb-3">To register an account or use RealtyNow, users must:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-800">
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Be at least 18 years of age</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Provide accurate identity data</span>
              </li>
              <li className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Comply with Indian laws</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="term-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>Account Registration & Security</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Users are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Maintaining strict confidentiality of login credentials and passwords</li>
              <li>Securing One-Time Passwords (OTP) sent to registered mobile numbers</li>
              <li>All activities, transactions, and property submissions conducted through their account</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="term-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">4</span>
              <span>User Roles & Ecosystem</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">RealtyNow supports distinct portal roles tailored with specialized permissions:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold text-slate-800">
              <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">Buyers & Renters</span>
              <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">Sellers & Owners</span>
              <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">Builders & Developers</span>
              <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">Certified Agents</span>
              <span className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">System Administrators</span>
            </div>
          </section>

          {/* Section 5 */}
          <section id="term-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">5</span>
              <span>Property Listings Guidelines</span>
            </h2>
            <p className="mb-3">Users posting property listings agree that:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm mb-4">
              <li>Listings represent genuine, non-disputed real estate properties</li>
              <li>All information (area, location, specs) is truthful and current</li>
              <li>Uploaded images, videos, and documents belong to or are authorized for use by the uploader</li>
              <li>Pricing and financial terms are accurate without hidden charges</li>
              <li>No illegal, litigated, or non-permissible property will be listed</li>
            </ul>
            <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
              RealtyNow reserves the right to reject, flag, or permanently delete any non-compliant listings.
            </p>
          </section>

          {/* Section 6 */}
          <section id="term-6" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">6</span>
              <span>Verification Disclaimer</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              RealtyNow performs verification checks including mobile OTPs, email confirmation, agent RERA badges, and builder GST verification.
            </p>
            <p className="text-xs text-slate-500 font-semibold italic">
              Verification badges confirm profile authentication but do NOT constitute a legal guarantee of title ownership.
            </p>
          </section>

          {/* Section 7 & 8 */}
          <section id="term-7-8" className="scroll-mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                7. Payments
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paid services, premium listings, and subscriptions are securely processed through <strong>Razorpay</strong>. 
                All fees are displayed transparently before payment confirmation.
              </p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                8. Refunds
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Refunds are subject to the RealtyNow Refund Policy. Approved refunds are credited according to applicable payment gateway processing timelines.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="term-9" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">9</span>
              <span>Prohibited User Conduct</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Users shall NOT engage in:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Posting false or duplicate listings</span>
              </div>
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Misleading buyers or price manipulation</span>
              </div>
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Abusive content or spam messaging</span>
              </div>
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Using automated bots or web scraping</span>
              </div>
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Unauthorized server access attempts</span>
              </div>
              <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-2 text-red-900">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Distributing malware or breaking laws</span>
              </div>
            </div>
          </section>

          {/* Section 10 & 11 */}
          <section id="term-10-11" className="scroll-mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">10. Agent Obligations</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Agents must represent properties honestly, maintain professionalism, respect client confidentiality, and avoid deceptive practices.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">11. Builder Obligations</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Builders must ensure RERA compliance, statutory approvals, authentic floor plans, and transparent pricing schedules.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="term-12" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">12</span>
              <span>Intellectual Property</span>
            </h2>
            <p className="text-xs sm:text-sm">
              All website content, logos, branding, UI designs, software, graphics, and databases belong exclusively to <strong>RealtyNow</strong>. 
              Unauthorized copying or reproduction is strictly prohibited.
            </p>
          </section>

          {/* Section 13 */}
          <section id="term-13" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">13</span>
              <span>Limitation of Liability</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              RealtyNow operates as a technology marketplace connecting users. We do not guarantee:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm mb-3">
              <li>Absolute legal property ownership or title clearings</li>
              <li>Guaranteed completion or success of financial transactions</li>
              <li>Future property valuation or investment returns</li>
            </ul>
            <p className="text-xs font-bold text-slate-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ Users are advised to independently verify all property title deeds, legal paperwork, and physical conditions before making financial decisions.
            </p>
          </section>

          {/* Section 14, 15, 16 */}
          <section id="term-14-16" className="scroll-mt-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">14. Account Termination</h2>
              <p className="text-xs text-slate-600">
                RealtyNow reserves the right to suspend or terminate accounts for fraud, fake listings, abuse, or illegal activity.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">15. Disclaimer</h2>
              <p className="text-xs text-slate-600">
                Listings are submitted by users and partners. While we strive for accuracy, RealtyNow does not warrant that listings are completely current or error-free.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">16. Governing Law & Jurisdiction</h2>
              <p className="text-xs text-slate-600">
                These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of competent courts in Hyderabad, Telangana, India.
              </p>
            </div>
          </section>

          {/* Section 17: Contact Box */}
          <section id="term-17" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mt-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-500" />
              17. Contact Support & Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              For any terms-related inquiries, compliance questions, or support requests:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Email Us</span>
                <a href="mailto:info@realtynow.in" className="font-bold text-red-400 hover:underline">
                  info@realtynow.in
                </a>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Phone</span>
                <span className="font-bold text-white">+91 94942 30774 / +91 99635 09329</span>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Headquarters</span>
                <span className="font-medium text-slate-200">#19, Road No. 2B, LB Nagar, Hyderabad 500081</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
