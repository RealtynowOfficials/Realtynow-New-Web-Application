import { Link } from 'react-router-dom';
import { Home, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { PostPropertyLink } from './post-property-link';

export function ListingPromoBanner() {
  return (
    <div className="relative w-full overflow-hidden rounded-[16px] bg-gradient-to-r from-navy-900 via-navy-800 to-primary-900 mb-6 shadow-xl">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary-600/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
        
        {/* Left side content */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-md border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            AI-Powered Property Promotion
          </div>
          
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-white leading-tight">
            Sell or Rent Faster. <br className="hidden md:block" />
            <span className="text-red-500 drop-shadow-md">Post Property FREE</span>
          </h2>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Reach Verified Buyers
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-200">
              <Home className="h-5 w-5 text-blue-400" />
              Zero Brokerage Options
            </div>
          </div>
        </div>

        {/* Right side CTA */}
        <div className="shrink-0 flex items-center justify-center">
          <PostPropertyLink to="/portal/list-property"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-[12px] bg-red-600 px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-red-700 hover:scale-105 hover:shadow-red-600/40"
          >
            <span className="relative z-10 flex items-center gap-2">
              Post Your Property <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
          </PostPropertyLink>
        </div>
      </div>
    </div>
  );
}
