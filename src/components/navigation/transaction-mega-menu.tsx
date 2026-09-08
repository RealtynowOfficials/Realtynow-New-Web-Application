import React, { useState, useRef, useTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Building2,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocationContext } from '../../contexts/location-context';
import { useClickOutside } from '../../hooks/useClickOutside';
import {
  fetchPropertyCategoriesWithCounts,
  type CategoryItemWithCount,
} from '../../lib/categories';

interface BaseMegaMenuProps {
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// ─── BUY MEGA MENU (Residential Buy) ─────────────────────────────────────────
export const BuyMegaMenu: React.FC<BaseMegaMenuProps> = ({ onClose, onMouseEnter, onMouseLeave }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, onClose, true);

  const { data: taxonomy, isLoading: loading } = useQuery({
    queryKey: ['taxonomy', 'buy', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'buy'),
    staleTime: 60000,
  });

  const activeCity = city || 'All Cities';

  const handleCategoryClick = (categorySlug: string) => {
    onClose();
    const searchParams = new URLSearchParams();
    searchParams.set('purpose', 'buy');
    searchParams.set('category', categorySlug);
    if (city) {
      searchParams.set('city', city);
    }
    navigate(`/search?${searchParams.toString()}`);
  };

  const renderCategoryItem = (item: CategoryItemWithCount) => {
    const Icon = item.icon;
    const countFormatted = item.propertyCount.toLocaleString();

    return (
      <button
        key={item.slug}
        type="button"
        onClick={() => handleCategoryClick(item.slug)}
        className="group flex w-full items-start gap-2.5 rounded-xl border border-slate-100/70 bg-slate-50/50 p-2 text-left transition-all duration-150 hover:border-red-200/90 hover:bg-red-50/70 hover:shadow-xs focus:outline-none focus:ring-1 focus:ring-[#D8232A]/30 cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/80 text-navy-700 shadow-xs transition-colors duration-150 group-hover:border-red-300 group-hover:bg-[#D8232A] group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#D8232A]">
              {item.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors border ${
                item.propertyCount > 0
                  ? 'bg-red-50 border-red-200 text-[#D8232A] group-hover:bg-[#D8232A] group-hover:text-white group-hover:border-[#D8232A]'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {loading ? '...' : countFormatted}
            </span>
          </div>
          <p className="line-clamp-1 text-[10.5px] text-slate-500">{item.description}</p>
        </div>
      </button>
    );
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 right-0 top-full z-[100] flex justify-center px-4 pt-2 pointer-events-none"
    >
      <motion.div
        ref={menuRef}
        role="menu"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-[840px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 md:p-6"
      >
        {/* Header Title & Location Context */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8232A]/10 text-[#D8232A]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Buy Properties in <span className="text-[#D8232A]">{activeCity}</span>
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[11px] font-bold text-[#D8232A]">
                  <Sparkles className="h-3 w-3" />
                  For Sale
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Discover residential properties available for purchase with verified titles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={city ? `/search?purpose=buy&city=${encodeURIComponent(city)}` : '/search?purpose=buy'}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-[#D8232A] hover:text-white"
            >
              <span>Explore All Buy ({taxonomy?.residential.reduce((s, i) => s + i.propertyCount, 0) || 0})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Primary Grid: Residential Buy (12 categories) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                Residential Buy
              </span>
              <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {taxonomy?.residential.length || 12} Categories
              </span>
            </div>
            <span className="text-[10.5px] font-semibold text-slate-500">
              {taxonomy?.residential.reduce((sum, item) => sum + item.propertyCount, 0).toLocaleString() || 0} Homes for Sale
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {taxonomy?.residential.map((item) => renderCategoryItem(item))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── RENT MEGA MENU (Residential Rent) ───────────────────────────────────────
export const RentMegaMenu: React.FC<BaseMegaMenuProps> = ({ onClose, onMouseEnter, onMouseLeave }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, onClose, true);

  const { data: taxonomy, isLoading: loading } = useQuery({
    queryKey: ['taxonomy', 'rent', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'rent'),
    staleTime: 60000,
  });

  const activeCity = city || 'All Cities';

  const handleCategoryClick = (categorySlug: string) => {
    onClose();
    const searchParams = new URLSearchParams();
    searchParams.set('purpose', 'rent');
    searchParams.set('category', categorySlug);
    if (city) {
      searchParams.set('city', city);
    }
    navigate(`/search?${searchParams.toString()}`);
  };

  const renderCategoryItem = (item: CategoryItemWithCount) => {
    const Icon = item.icon;
    const countFormatted = item.propertyCount.toLocaleString();

    return (
      <button
        key={item.slug}
        type="button"
        onClick={() => handleCategoryClick(item.slug)}
        className="group flex w-full items-start gap-2.5 rounded-xl border border-slate-100/70 bg-slate-50/50 p-2 text-left transition-all duration-150 hover:border-red-200/90 hover:bg-red-50/70 hover:shadow-xs focus:outline-none focus:ring-1 focus:ring-[#D8232A]/30 cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/80 text-navy-700 shadow-xs transition-colors duration-150 group-hover:border-red-300 group-hover:bg-[#D8232A] group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#D8232A]">
              {item.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors border ${
                item.propertyCount > 0
                  ? 'bg-red-50 border-red-200 text-[#D8232A] group-hover:bg-[#D8232A] group-hover:text-white group-hover:border-[#D8232A]'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {loading ? '...' : countFormatted}
            </span>
          </div>
          <p className="line-clamp-1 text-[10.5px] text-slate-500">{item.description}</p>
        </div>
      </button>
    );
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 right-0 top-full z-[100] flex justify-center px-4 pt-2 pointer-events-none"
    >
      <motion.div
        ref={menuRef}
        role="menu"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-[840px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 md:p-6"
      >
        {/* Header Title & Location Context */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8232A]/10 text-[#D8232A]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Rent Properties in <span className="text-[#D8232A]">{activeCity}</span>
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[11px] font-bold text-[#D8232A]">
                  <Sparkles className="h-3 w-3" />
                  For Rent
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Explore residential homes, flats, and apartments available for lease
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={city ? `/search?purpose=rent&city=${encodeURIComponent(city)}` : '/search?purpose=rent'}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-[#D8232A] hover:text-white"
            >
              <span>Explore All Rent ({taxonomy?.residential.reduce((s, i) => s + i.propertyCount, 0) || 0})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Primary Grid: Residential Rent (12 categories) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                Residential Rent
              </span>
              <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {taxonomy?.residential.length || 12} Categories
              </span>
            </div>
            <span className="text-[10.5px] font-semibold text-slate-500">
              {taxonomy?.residential.reduce((sum, item) => sum + item.propertyCount, 0).toLocaleString() || 0} Rental Homes
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {taxonomy?.residential.map((item) => renderCategoryItem(item))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── COMMERCIAL MEGA MENU (Dedicated Commercial Hub) ─────────────────────────
export const CommercialMegaMenu: React.FC<BaseMegaMenuProps> = ({ onClose, onMouseEnter, onMouseLeave }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, onClose, true);

  const { data: buyTaxonomy, isLoading: buyLoading } = useQuery({
    queryKey: ['taxonomy', 'buy', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'buy'),
    staleTime: 60000,
  });

  const { data: rentTaxonomy, isLoading: rentLoading } = useQuery({
    queryKey: ['taxonomy', 'rent', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'rent'),
    staleTime: 60000,
  });

  const loading = buyLoading || rentLoading;

  const activeCity = city || 'All Cities';

  const handleCommercialNav = (categorySlug: string, purpose: 'buy' | 'rent') => {
    onClose();
    const searchParams = new URLSearchParams();
    searchParams.set('purpose', purpose);
    searchParams.set('type', 'commercial');
    searchParams.set('category', categorySlug);
    if (city) {
      searchParams.set('city', city);
    }
    navigate(`/search?${searchParams.toString()}`);
  };

  const renderCommercialRow = (item: CategoryItemWithCount, purpose: 'buy' | 'rent') => {
    const Icon = item.icon;
    const countFormatted = item.propertyCount.toLocaleString();

    return (
      <button
        key={`${purpose}-${item.slug}`}
        type="button"
        onClick={() => handleCommercialNav(item.slug, purpose)}
        className="group flex w-full items-start gap-2.5 rounded-xl border border-slate-100/70 bg-slate-50/50 p-2.5 text-left transition-all duration-150 hover:border-red-200/90 hover:bg-red-50/70 hover:shadow-xs focus:outline-none focus:ring-1 focus:ring-[#D8232A]/30 cursor-pointer"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/80 text-navy-700 shadow-xs transition-colors duration-150 group-hover:border-red-300 group-hover:bg-[#D8232A] group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#D8232A]">
              {item.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors border ${
                item.propertyCount > 0
                  ? 'bg-red-50 border-red-200 text-[#D8232A] group-hover:bg-[#D8232A] group-hover:text-white group-hover:border-[#D8232A]'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {loading ? '...' : countFormatted}
            </span>
          </div>
          <p className="line-clamp-1 text-[10.5px] text-slate-500">{item.description}</p>
        </div>
      </button>
    );
  };

  const totalCommercialCount = (buyTaxonomy?.commercial.reduce((s, i) => s + i.propertyCount, 0) || 0) +
    (rentTaxonomy?.commercial.reduce((s, i) => s + i.propertyCount, 0) || 0);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-0 right-0 top-full z-[100] flex justify-center px-4 pt-2 pointer-events-none"
    >
      <motion.div
        ref={menuRef}
        role="menu"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-[960px] overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 md:p-6"
      >
        {/* Header Title & Location Context */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8232A]/10 text-[#D8232A]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Commercial Real Estate in <span className="text-[#D8232A]">{activeCity}</span>
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[11px] font-bold text-[#D8232A]">
                  <Sparkles className="h-3 w-3" />
                  Grade-A Assets
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Explore corporate offices, high-street retail, warehouses, and commercial investment opportunities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={city ? `/commercial?city=${encodeURIComponent(city)}` : '/commercial'}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-[#D8232A] hover:text-white"
            >
              <span>Commercial Hub ({totalCommercialCount})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* 2-Column Grid: Commercial Buying & Commercial Renting */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ─── LEFT: Commercial Buying (6 cols) ─── */}
          <div className="space-y-3 lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                  Commercial Buying
                </span>
                <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                  For Purchase
                </span>
              </div>
              <span className="text-[10.5px] font-semibold text-slate-500">
                {buyTaxonomy?.commercial.reduce((s, i) => s + i.propertyCount, 0).toLocaleString() || 0} Assets for Sale
              </span>
            </div>

            <div className="space-y-2">
              {buyTaxonomy?.commercial.map((item) => renderCommercialRow(item, 'buy'))}
            </div>
          </div>

          {/* ─── RIGHT: Commercial Renting (6 cols) ─── */}
          <div className="flex flex-col justify-between space-y-3 lg:col-span-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                    Commercial Renting
                  </span>
                  <span className="rounded-md bg-[#D8232A]/10 border border-red-100 px-1.5 py-0.5 text-[10px] font-bold text-[#D8232A]">
                    For Lease
                  </span>
                </div>
                <span className="text-[10.5px] font-semibold text-slate-500">
                  {rentTaxonomy?.commercial.reduce((s, i) => s + i.propertyCount, 0).toLocaleString() || 0} Assets for Rent
                </span>
              </div>

              <div className="space-y-2">
                {rentTaxonomy?.commercial.map((item) => renderCommercialRow(item, 'rent'))}
              </div>
            </div>

            {/* Commercial Investment & Advisor Banner */}
            <div className="mt-2 rounded-2xl border border-slate-800 bg-gradient-to-br from-navy-900 via-navy-800 to-red-950 p-4 text-white shadow-md">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <TrendingUp className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Commercial Investment Advisory</h4>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-navy-200">
                    Looking for Grade-A pre-leased assets, retail shops, or warehouse parks?
                  </p>
                  <Link
                    to="/commercial"
                    onClick={onClose}
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300"
                  >
                    <span>Browse Commercial Advisory</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── MOBILE ACCORDIONS ───────────────────────────────────────────────────────

/**
 * Mobile Drawer Accordion for Buy (Residential Buy)
 */
export const MobileBuyAccordion: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const { data: taxonomy } = useQuery({
    queryKey: ['taxonomy', 'buy', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'buy'),
    staleTime: 60000,
  });

  const handleSelect = (categorySlug: string) => {
    onNavigate();
    const params = new URLSearchParams();
    params.set('purpose', 'buy');
    params.set('category', categorySlug);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-2 pb-3 pl-2 pr-1 pt-1">
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-center justify-between py-1 border-b border-slate-100 mb-2 px-1">
          <span className="text-xs font-bold text-slate-900">Residential Buy</span>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] text-slate-700">
            {taxonomy?.residential.length || 12}
          </span>
        </div>
        <div className="space-y-1">
          {taxonomy?.residential.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleSelect(item.slug)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-[#D8232A]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span>{item.name}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                  item.propertyCount > 0
                    ? 'bg-red-50 border-red-200 text-[#D8232A]'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  {item.propertyCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile Drawer Accordion for Rent (Residential Rent)
 */
export const MobileRentAccordion: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const { data: taxonomy } = useQuery({
    queryKey: ['taxonomy', 'rent', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'rent'),
    staleTime: 60000,
  });

  const handleSelect = (categorySlug: string) => {
    onNavigate();
    const params = new URLSearchParams();
    params.set('purpose', 'rent');
    params.set('category', categorySlug);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-2 pb-3 pl-2 pr-1 pt-1">
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex items-center justify-between py-1 border-b border-slate-100 mb-2 px-1">
          <span className="text-xs font-bold text-slate-900">Residential Rent</span>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] text-slate-700">
            {taxonomy?.residential.length || 12}
          </span>
        </div>
        <div className="space-y-1">
          {taxonomy?.residential.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleSelect(item.slug)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-[#D8232A]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span>{item.name}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                  item.propertyCount > 0
                    ? 'bg-red-50 border-red-200 text-[#D8232A]'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  {item.propertyCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile Drawer Accordion for Commercial (Commercial Buying + Commercial Renting)
 */
export const MobileCommercialAccordion: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { city } = useLocationContext();
  const navigate = useNavigate();
  const [subSection, setSubSection] = useState<'buy' | 'rent' | null>('buy');
  const { data: buyTaxonomy } = useQuery({
    queryKey: ['taxonomy', 'buy', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'buy'),
    staleTime: 60000,
  });
  const { data: rentTaxonomy } = useQuery({
    queryKey: ['taxonomy', 'rent', city],
    queryFn: () => fetchPropertyCategoriesWithCounts(city, 'rent'),
    staleTime: 60000,
  });

  const handleSelect = (categorySlug: string, purpose: 'buy' | 'rent') => {
    onNavigate();
    const params = new URLSearchParams();
    params.set('purpose', purpose);
    params.set('type', 'commercial');
    params.set('category', categorySlug);
    if (city) params.set('city', city);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-2 pb-3 pl-2 pr-1 pt-1">
      {/* Commercial Buying */}
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setSubSection((prev) => (prev === 'buy' ? null : 'buy'))}
          className="flex w-full items-center justify-between py-1 text-xs font-bold text-slate-900"
        >
          <span className="flex items-center gap-2">
            <span>Commercial Buying</span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[9px] text-slate-700">For Purchase</span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
              subSection === 'buy' ? 'rotate-180 text-[#D8232A]' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {subSection === 'buy' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2"
            >
              <div className="space-y-1">
                {buyTaxonomy?.commercial.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`mob-buy-${item.slug}`}
                      type="button"
                      onClick={() => handleSelect(item.slug, 'buy')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-[#D8232A]"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{item.name}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                        item.propertyCount > 0
                          ? 'bg-red-50 border-red-200 text-[#D8232A]'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {item.propertyCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Commercial Renting */}
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setSubSection((prev) => (prev === 'rent' ? null : 'rent'))}
          className="flex w-full items-center justify-between py-1 text-xs font-bold text-slate-900"
        >
          <span className="flex items-center gap-2">
            <span>Commercial Renting</span>
            <span className="rounded-full bg-[#D8232A]/10 border border-red-100 px-1.5 py-0.2 text-[9px] text-[#D8232A]">For Lease</span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
              subSection === 'rent' ? 'rotate-180 text-[#D8232A]' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {subSection === 'rent' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2"
            >
              <div className="space-y-1">
                {rentTaxonomy?.commercial.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`mob-rent-${item.slug}`}
                      type="button"
                      onClick={() => handleSelect(item.slug, 'rent')}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-[#D8232A]"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{item.name}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                        item.propertyCount > 0
                          ? 'bg-red-50 border-red-200 text-[#D8232A]'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {item.propertyCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
