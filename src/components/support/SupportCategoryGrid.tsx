import React from 'react';
import {
  Building2,
  Search,
  CreditCard,
  UserCheck,
  Sparkles,
  ShieldCheck,
  Wrench,
  Headphones,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import { SUPPORT_CATEGORIES, type SupportCategory } from '../../lib/support';
import { cn } from '../../lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Search,
  CreditCard,
  UserCheck,
  Sparkles,
  ShieldCheck,
  Wrench,
  Headphones,
};

interface SupportCategoryGridProps {
  activeCategory?: SupportCategory | null;
  onSelectCategory: (category: SupportCategory | null) => void;
}

export const SupportCategoryGrid: React.FC<SupportCategoryGridProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
            Browse by Help Categories
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Select a topic to explore frequently asked questions and step-by-step guides.
          </p>
        </div>
        {activeCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            Show All Categories
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUPPORT_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.iconName] || Building2;
          const isSelected = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.id)}
              className={cn(
                'group relative flex flex-col justify-between p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-red-50/70 border-red-500 shadow-md shadow-red-500/10 ring-2 ring-red-500/20'
                  : 'bg-white border-slate-200/80 hover:border-red-200 hover:shadow-lg hover:shadow-slate-200/50'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition-transform group-hover:scale-105',
                      cat.colorClass
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 group-hover:bg-red-100 group-hover:text-red-700 px-2 py-0.5 rounded-full transition-colors">
                    {cat.topicsCount} articles
                  </span>
                </div>

                <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-red-600 transition">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-red-600 transition">
                <span>{isSelected ? 'Viewing topic' : 'Explore articles'}</span>
                <ChevronRight className={cn('h-4 w-4 transition-transform', isSelected ? 'rotate-90 text-red-600' : 'group-hover:translate-x-1')} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
