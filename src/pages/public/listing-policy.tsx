import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Ban,
  Camera,
  FileCheck2,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function PropertyListingPolicyPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Property Listing Policy</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Listing Standards & Guidelines
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Property Listing Policy
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            This policy governs the submission, publication, quality standards, and management of all property listings on RealtyNow.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1: Purpose */}
          <section id="lp-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Purpose</span>
            </h2>
            <p className="mb-3">
              This Property Listing Policy governs the submission, publication, and management of property listings on <strong>RealtyNow</strong>. 
              By posting a property, you agree to comply with this policy.
            </p>
          </section>

          {/* Section 2: Eligibility */}
          <section id="lp-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>Eligibility</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Only registered users may list properties. Property listings may be submitted by:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-bold text-slate-800 mb-3">
              <span className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">Property Owners</span>
              <span className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">Authorized Agents</span>
              <span className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">Builders & Developers</span>
              <span className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">Authorized Representatives</span>
            </div>
            <p className="text-xs text-slate-600 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-200">
              Users must have explicit legal authority to advertise and represent the listed property.
            </p>
          </section>

          {/* Section 3: Listing Requirements */}
          <section id="lp-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>Listing Requirements</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Every property listing must include accurate and complete information, including:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-800 mb-3">
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Property Title</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Property Type</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Category (Sale / Rent / Lease)</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Full Property Address</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">City, State & PIN Code</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Truthful Pricing</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Property Size & Area</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Bedrooms & Bathrooms</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Amenities List</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Property Description</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Recent Original Images</span>
              <span className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">Contact Information</span>
            </div>
            <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">
              False, misleading, or incomplete property information is strictly prohibited.
            </p>
          </section>

          {/* Section 4: Property Images */}
          <section id="lp-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <span>4. Property Images Standards</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Uploaded images must:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Be owned by the uploader or used with explicit permission.</li>
              <li>Represent the actual physical property.</li>
              <li>Be clear, high-resolution, and recent.</li>
              <li>Not contain watermarks, logos, or phone numbers of competing platforms.</li>
              <li>Not contain offensive, inappropriate, or illegal content.</li>
            </ul>
          </section>

          {/* Section 5: Prohibited Listings */}
          <section id="lp-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">5</span>
              <span>Prohibited Listings</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">The following are strictly prohibited on RealtyNow:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Fake or non-existent properties</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Duplicate property listings</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Already sold/rented properties listed as available</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Illegal properties or encroached land</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Properties under legal dispute without proper disclosure</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Misleading pricing or hidden costs</span>
              </div>
              <div className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 text-red-900 flex items-center gap-2 sm:col-span-2">
                <Ban className="w-4 h-4 text-red-600 shrink-0" />
                <span>Spam listings or offensive content</span>
              </div>
            </div>
          </section>

          {/* Section 6 & 7 */}
          <section id="lp-6-7" className="scroll-mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                6. Verification Checks
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                RealtyNow may verify property ownership, identity of the advertiser, property documents, and contact details. 
                Verification does not constitute a legal guarantee of ownership or transaction safety.
              </p>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                7. Listing Approval & Moderation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All listings are subject to administrative review. RealtyNow reserves the right to approve, reject, edit formatting, remove, or suspend any listing that violates platform policies.
              </p>
            </div>
          </section>

          {/* Section 8 & 9 */}
          <section id="lp-8-9" className="scroll-mt-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">8. Listing Removal Criteria</h3>
              <p className="text-xs text-slate-600 mb-2">Listings may be removed immediately if:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                <li>Policy violations occur</li>
                <li>Fraud or impersonation is suspected</li>
                <li>The property is no longer available</li>
                <li>Incorrect or deceptive information is reported</li>
                <li>Legal complaints are received</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">9. Platform Liability</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Users are solely responsible for the property information published. RealtyNow acts strictly as a technology marketplace platform and does not verify every physical detail or guarantee any real estate transaction.
              </p>
            </div>
          </section>

          {/* Section 10: Policy Updates */}
          <section id="lp-10" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              10. Policy Updates & Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              RealtyNow may update this Property Listing Policy at any time. Continued use of the platform indicates acceptance of the revised policy.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs font-bold text-slate-200 border-t border-white/10 pt-4">
              <span>Support Desk: <a href="mailto:support@realtynow.in" className="text-blue-400 hover:underline">support@realtynow.in</a> / <a href="mailto:info@realtynow.in" className="text-blue-400 hover:underline">info@realtynow.in</a></span>
              <span>Phone: +91 94942 30774</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
