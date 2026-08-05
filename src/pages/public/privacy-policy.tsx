import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileText,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Globe,
  Database,
  UserCheck,
  CreditCard,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function PrivacyPolicyPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb & Badge */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Privacy Policy</span>
        </div>

        {/* Hero Title Header Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                Official Legal Policy
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            At RealtyNow, we respect your privacy and are committed to protecting your personal data. 
            This policy outlines our transparent data handling and privacy practices across our web and mobile applications.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1 */}
          <section id="section-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Introduction</span>
            </h2>
            <p className="mb-3">
              Welcome to <strong>RealtyNow</strong>.
            </p>
            <p className="mb-3">
              RealtyNow (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a digital real estate platform that enables users to buy, sell, rent, lease, and manage residential and commercial properties throughout India.
            </p>
            <p className="mb-3">
              This Privacy Policy explains how we collect, use, store, protect, and disclose your information when you use our website, mobile application, and related services.
            </p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              By accessing or using RealtyNow, you agree to the terms of this Privacy Policy.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>Information We Collect</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-2">
                  <UserCheck className="w-4 h-4 text-red-600" />
                  Personal Information
                </h3>
                <p className="text-xs text-slate-500 mb-3">We may collect the following personal identity and contact data:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-800">
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Full Name</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Mobile Number</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Email Address</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Date of Birth (optional)</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Profile Photo</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Government ID (if required)</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">GST Details (for businesses)</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Company Information</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Address & Location</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Device & Browser Info</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">IP Address</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-red-600" />
                  Property Information
                </h3>
                <p className="text-xs text-slate-500 mb-3">When listing properties on our platform, we collect:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-800">
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Property Title & Description</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Property Type</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Sale/Rent Information</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Pricing & Budget</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Address, City, State, Pincode</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Amenities & Features</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Images & Videos</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Property Documents</span>
                  <span className="bg-white p-2 rounded-lg border border-slate-200">Ownership Details</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Payment Information
                </h3>
                <p className="text-xs text-slate-600 mb-3">
                  For premium property listings, featured boosts, and subscription services, we collect transaction records including:
                  Transaction ID, Payment Status, and Invoice Details.
                </p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Note: RealtyNow NEVER stores your debit card numbers, credit card numbers, UPI PINs, or banking passwords. 
                    All payments are securely processed by PCI-DSS compliant third-party gateways (e.g. Razorpay).
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Automatically Collected Information</h4>
                <p className="text-xs text-slate-600">
                  Browser Type, Device Type, Operating System, Login Activity, Referral Source, Cookies, Session Information, and Platform Analytics Data.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>How We Use Your Information</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">We process your data to deliver, optimize, and protect our real estate services:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-semibold text-slate-800">
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Create and manage your user account</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Verify identity and property ownership</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Publish and syndicate property listings</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Connect property buyers, sellers, and renters</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Assign verified agents and schedule site visits</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Process secure subscription & listing payments</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Improve AI recommendations and search results</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Detect fraud, spam, and enhance security</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Provide responsive customer support</span>
              </li>
              <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Marketing & updates (only with explicit consent)</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">4</span>
              <span>Cookies & Tracking</span>
            </h2>
            <p className="mb-3">
              We use cookies, web beacons, and session storage to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm mb-3">
              <li>Remember your login session securely</li>
              <li>Improve website loading speed and performance</li>
              <li>Personalize your search filters and preferences</li>
              <li>Analyze aggregate traffic and platform usage metrics</li>
              <li>Prevent unauthorized access and fraudulent activity</li>
            </ul>
            <p className="text-xs text-slate-500 font-medium">
              You can disable or customize cookies through your web browser settings at any time.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">5</span>
              <span>Data Security</span>
            </h2>
            <p className="mb-4">
              We implement robust, industry-standard administrative, physical, and technical safeguards, including:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-bold mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <Lock className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <span>HTTPS & SSL Encryption</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <KeyIcon className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <span>OTP Authentication</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <Database className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <span>Secure Cloud & RBAC</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <ShieldCheck className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <span>Firewalls & Audit Logs</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 italic">
              Despite our rigorous security precautions, no transmission over the Internet or electronic storage can be guaranteed to be 100% secure.
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">6</span>
              <span>Data Sharing & Disclosure</span>
            </h2>
            <p className="mb-3 font-bold text-red-600">
              We NEVER sell your personal information to third parties.
            </p>
            <p className="mb-3">
              We may share necessary data strictly with trusted service providers to run our operations:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Payment Gateways:</strong> Authorized payment processors (e.g. Razorpay) to complete transactions.</li>
              <li><strong>Government Authorities:</strong> When required by Indian law, judicial summons, or regulatory mandates.</li>
              <li><strong>Infrastructure & Cloud Providers:</strong> Secure hosting and database infrastructure (e.g. Supabase, Firebase).</li>
              <li><strong>Communication Partners:</strong> SMS & WhatsApp service gateways (e.g. MSG91) for OTP verification.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">7</span>
              <span>Third-Party Services</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              RealtyNow integrates with third-party tools to enhance your user experience:
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 mb-3">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">Google Maps</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">Razorpay</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">MSG91</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">Firebase</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">Supabase</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">WhatsApp API</span>
            </div>
            <p className="text-xs text-slate-500">
              Each third-party provider maintains its own separate Privacy Policy governing data usage.
            </p>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">8</span>
              <span>Data Retention</span>
            </h2>
            <p className="text-xs sm:text-sm">
              We retain your information for as long as your account remains active or as needed to provide our services. 
              We may retain certain records post-account deletion to comply with statutory legal, tax, or regulatory obligations under Indian law.
            </p>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">9</span>
              <span>User Rights</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">You have full control over your personal data:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-800">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Access and view your profile data</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Update personal & account details</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Request deletion of your account</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Request correction of inaccurate data</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Withdraw marketing consent anytime</div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">✓ Download a copy of your account data</div>
            </div>
          </section>

          {/* Section 10 & 11 */}
          <section id="section-10-11" className="scroll-mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">10. Children&apos;s Privacy</h2>
              <p className="text-xs text-slate-600">
                Our platform is intended strictly for users who are at least 18 years of age. We do not knowingly collect personal data from minors.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">11. Policy Changes</h2>
              <p className="text-xs text-slate-600">
                We may update this Privacy Policy periodically. Users will be notified of material changes via email or platform announcements.
              </p>
            </div>
          </section>

          {/* Section 12: Contact Box */}
          <section id="section-12" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 mt-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-red-500" />
              12. Contact & Privacy Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our Data Protection Officer:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Email Us</span>
                <a href="mailto:support@realtynow.in" className="font-bold text-red-400 hover:underline">
                  support@realtynow.in
                </a>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Phone Support</span>
                <span className="font-bold text-white">+91 94942 30774 / +91 99635 09329</span>
              </div>
              <div className="bg-white/10 p-3.5 rounded-2xl border border-white/10">
                <span className="text-slate-400 block mb-1 font-semibold">Head Office</span>
                <span className="font-medium text-slate-200">#19, Road No. 2B, LB Nagar, Hyderabad 500081</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="16.5" r="4.5" />
    </svg>
  );
}
