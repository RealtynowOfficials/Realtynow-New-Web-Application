import { Link } from 'react-router-dom';
import { Home, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui';
import { useLanguageContext } from '../lib/i18n/language-context';
import { cn } from '../lib/utils';

export function PostPropertyBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguageContext();

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-xl p-4">
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="font-display font-bold text-xl mb-3">
            {t('banner.sellFaster', 'Sell or rent faster at the right price!')}
          </h2>
          <Link to="/portal/list-property" className="w-full">
            <Button className="w-full bg-[#E60000] hover:bg-red-700 text-white border-0 font-bold">
              {t('banner.postFree', "Post Property, It's FREE")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="py-4 bg-white">
      <div className="container-wide">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl flex flex-col md:flex-row border border-slate-800">
          
          {/* Left Content */}
          <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-center w-full md:w-3/5 lg:w-1/2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-400 backdrop-blur-md mb-2 border border-white/10 w-fit">
              <Zap className="h-2.5 w-2.5 fill-current" />
              {t('banner.limitedTime', 'Limited Time Offer')}
            </div>
            
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
              List your property & reach <span className="text-red-500">millions</span> of buyers.
            </h2>
            
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-medium max-w-md leading-relaxed hidden sm:block">
              Sell or rent your property faster, at the right price, with zero hassle.
            </p>
            
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 hidden sm:flex">
              {[
                'Free listing',
                'AI-powered price estimation',
                'Verified leads'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                    <ShieldCheck className="h-2 w-2" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <Link to="/portal/list-property">
                <Button size="sm" className="bg-[#E60000] hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/30 font-bold transition-all hover:scale-105 h-9 px-4 rounded-xl group text-xs">
                  {t('banner.postFree', "Post Property, It's FREE")}
                  <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative w-full md:w-2/5 lg:w-1/2 min-h-[140px] hidden md:block">
            {/* Gradient overlay to smoothly blend image into the dark background on the left */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
            <img 
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1673&q=80" 
              alt="Beautiful modern home" 
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
          
        </div>
      </div>
    </section>
  );
}
