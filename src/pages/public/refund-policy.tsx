import React from 'react';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Mail,
  Clock,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function RefundPolicyPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Refund & Cancellation Policy</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Payment & Billing Policy
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            Welcome to RealtyNow. This policy explains the terms governing cancellations, refunds, and payment disputes for digital services purchased through our platform.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section id="ref-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Scope of Policy</span>
            </h2>
            <p className="mb-3">This policy applies to all paid services offered by RealtyNow, including but not limited to:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-800">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ Premium Property Listings & Featured Promotions</div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ Agent & Builder Subscription Plans</div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ Advertising Packages & Banner Promotions</div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ Lead Generation & Property Boost Services</div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ AI Premium Property Features</div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">✓ Digital Add-on Real Estate Services</div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="ref-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>Nature of Digital Services</span>
            </h2>
            <p className="mb-3">
              RealtyNow provides online digital real estate services. No physical goods are sold or shipped through the platform.
            </p>
            <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
              All payment transactions are securely processed through authorized PCI-DSS compliant payment gateways (e.g. Razorpay).
            </p>
          </section>

          {/* Section 3 */}
          <section id="ref-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>Cancellation Policy</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li>Users may cancel a subscription or package before it becomes active, where cancellation is supported by the system.</li>
              <li>Once a digital service has been activated, delivered, or utilized, cancellation may not be possible.</li>
              <li>Published premium listings and active advertising campaigns cannot be cancelled retroactively.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="ref-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">4</span>
              <span>Refund Eligibility</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">A refund request will be considered in the following verified scenarios:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
              <li className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Duplicate payment made for the exact same order</span>
              </li>
              <li className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Money deducted but service failed to activate</span>
              </li>
              <li className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Technical platform failure on RealtyNow side</span>
              </li>
              <li className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Incorrect system billing calculation error</span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="ref-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">5</span>
              <span>Non-Refundable Services</span>
            </h2>
            <p className="mb-3 text-xs text-slate-500 font-semibold">The following services are non-refundable once activated:</p>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700">
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">Active Premium Listings</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">Active Property Boosts</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">Consumed Lead Credits</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">AI Premium Queries</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">Ad Campaigns Already Running</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-200">Statutory Govt GST Taxes</span>
            </div>
          </section>

          {/* Section 6 & 7 */}
          <section id="ref-6-7" className="scroll-mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">6. Duplicate Payments</h3>
              <p className="text-xs text-slate-600">
                If duplicate payments are charged for a single transaction, RealtyNow will verify and refund the excess amount after account audit.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">7. Failed Transactions</h3>
              <p className="text-xs text-slate-600">
                If funds are debited without activation, please wait 30 minutes for banking reconciliation or contact support for manual activation.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="ref-8" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">8</span>
              <span>Refund Processing Timelines</span>
            </h2>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <Clock className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-emerald-900">7 to 10 Business Days</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Approved refunds are credited back to your original payment source (bank, card, or UPI) within 7-10 working days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9 to 12 */}
          <section id="ref-9-12" className="scroll-mt-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">9. Payment Disputes & Chargebacks</h3>
              <p className="text-xs text-slate-600">
                Please contact RealtyNow support prior to filing bank chargebacks. Abusive or fraudulent chargebacks may result in account termination.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">10. Subscription Cancellation</h3>
              <p className="text-xs text-slate-600">
                Cancelling auto-renewal stops future billing cycles. Current active billing periods remain non-refundable.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">12. Refund Method</h3>
              <p className="text-xs text-slate-600">
                Approved refunds are credited via the original online payment method used. Cash refunds are not provided.
              </p>
            </div>
          </section>

          {/* Section 13: How to Submit Refund Request */}
          <section id="ref-13" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              13. Submitting a Refund Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              To request a refund, please email our support desk at <strong>support@realtynow.in</strong> with the following details:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-200 mb-6">
              <span className="p-2 bg-white/10 rounded-xl border border-white/10">Full Name</span>
              <span className="p-2 bg-white/10 rounded-xl border border-white/10">Mobile Number</span>
              <span className="p-2 bg-white/10 rounded-xl border border-white/10">Transaction ID</span>
              <span className="p-2 bg-white/10 rounded-xl border border-white/10">Reason & Screenshot</span>
            </div>
            <p className="text-xs text-slate-400">
              Governed by Indian Law • Jurisdiction: Hyderabad, Telangana, India
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
