import React from 'react';
import { Link } from 'react-router-dom';
import {
  Cookie,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Lock,
  BarChart2,
  Sliders,
  Megaphone,
  Globe,
  Settings,
  Mail,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

export function CookiePolicyPage() {
  const { t } = useLanguageContext();

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold">Cookie Policy</span>
        </div>

        {/* Hero Title Card */}
        <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <Cookie className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Browser Data & Tracking Statement
              </span>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Effective Date: August 05, 2026</span>
              </p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Cookie Policy
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            This policy explains how RealtyNow uses cookies and similar technologies to improve your browsing experience.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
          {/* Section 1: Introduction */}
          <section id="ck-1" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">1</span>
              <span>Introduction</span>
            </h2>
            <p className="mb-3">
              This Cookie Policy explains how <strong>RealtyNow</strong> uses cookies and similar technologies to improve your browsing experience.
            </p>
            <p className="font-semibold text-slate-900 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              By using RealtyNow, you consent to the use of cookies as described in this policy.
            </p>
          </section>

          {/* Section 2: What Are Cookies */}
          <section id="ck-2" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">2</span>
              <span>What Are Cookies?</span>
            </h2>
            <p className="text-xs sm:text-sm">
              Cookies are small text files stored on your device that help websites remember information about your visit.
            </p>
          </section>

          {/* Section 3: Types of Cookies We Use */}
          <section id="ck-3" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">3</span>
              <span>Types of Cookies We Use</span>
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Essential Cookies
                </h3>
                <p className="text-xs text-slate-500 mb-2">These cookies are necessary for core platform functionality:</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">User Login</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Authentication</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Security</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Session Management</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Website Functionality</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-600" />
                  Performance Cookies
                </h3>
                <p className="text-xs text-slate-500 mb-2">These cookies help us understand platform performance:</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Page Performance</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Website Speed</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">User Interactions</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Error Reporting</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-600" />
                  Analytics Cookies
                </h3>
                <p className="text-xs text-slate-500 mb-2">Used to analyze aggregate visitor metrics:</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Visitor Traffic</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Popular Pages</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">User Behavior</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Device Types</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Geographic Usage</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  Preference Cookies
                </h3>
                <p className="text-xs text-slate-500 mb-2">These remember your personalized settings:</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Language Choice</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Theme</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Recently Viewed Properties</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Saved Search Preferences</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  Marketing Cookies
                </h3>
                <p className="text-xs text-slate-500 mb-2">With your consent, we may use cookies to:</p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-800">
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Display Relevant Advertisements</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Measure Campaign Performance</span>
                  <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200">Personalize Marketing Content</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Third-Party Cookies */}
          <section id="ck-4" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">4</span>
              <span>Third-Party Cookies</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">Our platform may use services from third-party partners including:</p>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 mb-3">
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Google Analytics</span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Google Maps</span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Razorpay</span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Firebase</span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">MSG91</span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">Integrated Partners</span>
            </div>
            <p className="text-xs text-slate-500">
              These service providers may use cookies according to their own independent privacy policies.
            </p>
          </section>

          {/* Section 5: Managing Cookies */}
          <section id="ck-5" className="scroll-mt-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2">
              <Settings className="w-5 h-5 text-amber-600" />
              <span>5. Managing Cookies</span>
            </h2>
            <p className="mb-3 text-xs sm:text-sm">
              You can control or disable cookies through your browser settings at any time.
            </p>
            <p className="text-xs font-semibold text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              Please note that disabling essential cookies may affect website functionality and prevent you from staying logged in.
            </p>
          </section>

          {/* Section 6: Updates */}
          <section id="ck-6" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-extrabold mb-2 text-white flex items-center gap-2">
              <Cookie className="w-5 h-5 text-amber-400" />
              6. Policy Updates & Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              This Cookie Policy may be updated periodically. Any changes will be published directly on this page.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs font-bold text-slate-200 border-t border-white/10 pt-4">
              <span>Questions? Email: <a href="mailto:info@realtynow.in" className="text-amber-400 hover:underline">info@realtynow.in</a> / <a href="mailto:support@realtynow.in" className="text-amber-400 hover:underline">support@realtynow.in</a></span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
