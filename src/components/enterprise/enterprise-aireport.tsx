import React from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Sparkles, Zap } from 'lucide-react';

export function EnterpriseAIReportDashboard() {
  const { t } = useLanguageContext();

  const insights = [
    {
      title: 'Price Appreciation Forecast',
      desc: 'Hyderabad Gachibowli predicted to see 14.2% price appreciation in Q3/Q4 2026 based on tech corridor expansion.',
      impact: 'High Growth',
      score: '98% Accuracy',
    },
    {
      title: 'Buyer Demand Matcher',
      desc: '3BHK Gated Apartments under ₹1.2 Cr currently driving 68% of all customer inquiries in Hyderabad & Bengaluru.',
      impact: 'High Demand',
      score: 'High Velocity',
    },
    {
      title: 'Recommended Pricing',
      desc: 'Listing price optimization engine suggests setting ₹7,200/sqft for Kondapur luxury projects to maximize conversion.',
      impact: 'Optimal Yield',
      score: 'AI Verified',
    },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-lg shadow-red-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              RealtyNow AI Enterprise Intelligence & Demand Forecast
            </h2>
            <p className="text-xs text-slate-400">
              Automated machine learning market analysis, price elasticity & lead forecasting.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> AI Model v4.2 Active
        </span>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {insights.map((item, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/50 shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                {item.impact}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{item.score}</span>
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors mb-2">
              {item.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
