import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ListingPromoBanner() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-red-100/90 bg-gradient-to-r from-red-50/70 via-white to-amber-50/30 p-3 sm:px-5 sm:py-3 shadow-xs mb-5 transition-all hover:border-red-200/80">
      {/* Subtle background ambient glow */}
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Cute Icon + Headline + Smart Pills */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          {/* Cute Glowing Icon Container */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-display font-extrabold text-slate-900 text-sm sm:text-[15px] tracking-tight">
                Sell or Rent Faster.
              </span>
              <span className="font-display font-extrabold text-[#D8232A] text-sm sm:text-[15px] tracking-tight">
                Post Property FREE
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100/70 text-[10px] font-extrabold text-[#D8232A] uppercase tracking-wider">
                100% Free
              </span>
            </div>

            {/* Smart Micro-Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-1.5 py-0.2 rounded-md">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Buyers
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11.5px] text-slate-600 hidden sm:inline">
                Zero Brokerage Options
              </span>
              <span className="text-slate-300 hidden md:inline">•</span>
              <span className="text-[11.5px] text-slate-600 hidden md:inline">
                Direct Enquiries
              </span>
            </div>
          </div>
        </div>

        {/* Right: Cute Smart CTA Button */}
        <div className="shrink-0 w-full sm:w-auto flex items-center justify-end">
          <Link
            to="/free_list_property"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#D8232A] hover:bg-[#b81d23] text-white text-xs font-extrabold shadow-md shadow-red-600/20 hover:shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Post Property Free</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>

      </div>
    </div>
  );
}

export default ListingPromoBanner;
