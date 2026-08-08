import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyMap } from '../../components/property-map';
import { VoiceSearchButton } from '../../components/voice-search-button';
import { generateSpeech } from '../../lib/elevenlabs';
import { ListingPromoBanner } from '../../components/listing-promo-banner';
import {
  SlidersHorizontal,
  X,
  MapPin,
  Home,
  ChevronLeft,
  ChevronRight,
  Search,
  Heart,
  Phone,
  MessageCircle,
  Calendar,
  Eye,
  Camera,
  Bed,
  Bath,
  Car,
  Maximize2,
  Navigation,
  Building2,
  Zap,
  TrendingUp,
  BarChart3,
  Map,
  GitCompare,
  CheckCircle2,
  Clock,
  ChevronDown,
  Filter,
  SortDesc,
  LayoutGrid,
  Share2,
  ShieldCheck,
  Sparkles,
  Rows3,
} from 'lucide-react';
import { type PropertyFilters, fetchPublishedProperties, sanitizeSearchQuery } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/toast';
import { formatCompactPrice, formatNumber, cn , generatePropertyUrl} from '../../lib/utils';
import type { Property } from '../../lib/types';

import { AdvancedFilters } from '../../components/advanced-filters';
import { useSEO } from '../../hooks/use-seo';

const PAGE_SIZE = 10;
type ViewMode = 'list' | 'grid' | 'map';
type SortOption =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'ai_recommended'
  | 'most_viewed'
  | 'most_contacted'
  | 'featured';


// ──────────────────────────────────────────────────────────────
// Property Horizontal List Card (desktop/tablet)
// ──────────────────────────────────────────────────────────────
interface HorizontalCardProps {
  property: Property & { city_name?: string; locality_name?: string; property_type_name?: string };
  onSave?: (id: string) => void;
  onCompare?: (id: string) => void;
  saved?: boolean;
  compared?: boolean;
  isAiRecommended?: boolean;
}

function HorizontalCard({ property: p, onSave, onCompare, saved = false, compared = false, isAiRecommended = false }: HorizontalCardProps) {
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const [imgHovered, setImgHovered] = useState(false);
  const [showMore, setShowMore] = useState(false);

  let parsedImages = p.images;
  if (typeof parsedImages === 'string') {
    try {
      parsedImages = JSON.parse(parsedImages);
    } catch {
      parsedImages = [parsedImages as unknown as string];
    }
  } else if (parsedImages && !Array.isArray(parsedImages)) {
    parsedImages = [parsedImages as any];
  }
  const images = Array.isArray(parsedImages) && parsedImages.length > 0 ? parsedImages : ['https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'];

  const investScore = useMemo(() => Math.floor(60 + Math.random() * 35), [p.id]);
  const pricePerSqft = p.built_up_area && p.price ? Math.round(p.price / p.built_up_area) : null;

  // Cap to 2-3 meaningful badges: purpose is always shown; at most one
  // "highlight" badge on top of it (luxury takes priority over featured).
  const highlightBadge = p.is_luxury
    ? { label: t('common.luxury', 'Luxury'), className: 'bg-purple-600' }
    : p.is_featured
      ? { label: t('common.featured', 'Featured'), className: 'bg-amber-500' }
      : null;

  const topAmenities = (p.amenities ?? []).slice(0, 4);
  const extraAmenityCount = Math.max(0, (p.amenities?.length ?? 0) - 4);
  const amenityIcons: Record<string, string> = {
    'Swimming Pool': '🏊',
    Gym: '💪',
    'Club House': '🏛️',
    Security: '🛡️',
    'Power Backup': '⚡',
    'Children Park': '🛝',
    Lift: '🛗',
    Garden: '🌿',
  };

  const specs = [
    p.bedrooms != null && { icon: Bed, val: `${p.bedrooms} BHK`, key: 'bed' },
    p.bathrooms != null && { icon: Bath, val: `${p.bathrooms} Bath`, key: 'bath' },
    p.parking != null && { icon: Car, val: `${p.parking} Park`, key: 'park' },
    p.built_up_area && { icon: Maximize2, val: `${formatNumber(p.built_up_area)} sq.ft`, key: 'area' },
  ].filter(Boolean) as { icon: typeof Bed; val: string; key: string }[];

  const nearby = [
    { label: 'Metro 800m', icon: '🚇' },
    { label: 'School 500m', icon: '🏫' },
    { label: 'Hospital 1.2km', icon: '🏥' },
  ];

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(generatePropertyUrl(p));
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col sm:flex-row bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(generatePropertyUrl(p))}
    >
      {/* ── LEFT: IMAGE GALLERY ── */}
      <div
        className="relative w-full sm:w-[40%] shrink-0 overflow-hidden aspect-[4/3] sm:aspect-auto"
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
      >
        <img
          src={images[activeImg]}
          alt={p.title}
          className={cn('h-full w-full object-cover transition-transform duration-500', imgHovered ? 'scale-110' : 'scale-100')}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5" />

        {/* Badges — purpose + at most one highlight */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {p.purpose && (
            <span
              className={cn(
                'text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide shadow',
                p.purpose === 'Rent' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white',
              )}
            >
              {p.purpose === 'Rent' ? t('property.forRent', 'For Rent') : t('property.forSale', 'For Sale')}
            </span>
          )}
          {highlightBadge && (
            <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow uppercase', highlightBadge.className)}>
              {highlightBadge.label}
            </span>
          )}
        </div>

        {/* Save, Compare + Share */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.share?.({ title: p.title, url: window.location.origin + generatePropertyUrl(p) })
                .catch(() => navigator.clipboard.writeText(window.location.origin + generatePropertyUrl(p)));
            }}
            title="Share"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110 text-slate-500 hover:text-slate-900"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare?.(p.id);
            }}
            title={t('property.addToCompare', 'Compare')}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110',
              compared ? 'text-blue-600' : 'text-slate-500',
            )}
          >
            <GitCompare className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(p.id);
            }}
            title={t('property.saveProperty', 'Save')}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:scale-110',
              saved ? 'text-red-600' : 'text-slate-500',
            )}
          >
            <Heart className={cn('h-4 w-4', saved && 'fill-red-600')} />
          </button>
        </div>

        {/* Gallery dots + count */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 z-10">
            {images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImg(i);
                }}
                className={cn('h-1.5 rounded-full transition-all', activeImg === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50')}
              />
            ))}
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Camera className="h-2.5 w-2.5" /> {images.length}
        </div>
      </div>

      {/* ── RIGHT: PROPERTY DETAILS ── */}
      <div className="flex flex-1 flex-col p-4 sm:p-5 min-w-0">
        {isAiRecommended && (
          <div className="mb-2 flex items-center gap-1.5 w-fit rounded-full bg-gradient-to-r from-purple-50 to-fuchsia-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 border border-purple-100 shadow-sm" title="Recommended by our AI based on your search patterns and property quality">
            <Sparkles className="h-3 w-3 text-purple-500" /> AI Recommended
          </div>
        )}
        {/* Title + Price */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 truncate leading-tight">{p.title}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3 w-3 text-red-500 shrink-0" />
              <span className="truncate">{[p.locality_name, p.city_name].filter(Boolean).join(', ')}</span>
            </div>
            {p.property_type_name && (
              <span className="mt-1.5 inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {p.property_type_name}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">{formatCompactPrice(p.price)}</p>
            {pricePerSqft && <p className="text-[11px] text-slate-500 mt-0.5">₹{formatNumber(pricePerSqft)}/sq.ft</p>}
            {p.purpose === 'Rent' && <p className="text-[11px] text-slate-500">/month</p>}
          </div>
        </div>

        {/* Key specs — one line */}
        {specs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {specs.map((s) => (
              <div key={s.key} className="flex items-center gap-1 text-sm text-slate-700">
                <s.icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold">{s.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nearby places — one compact row, icons only */}
        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500">
          {nearby.map((n, i) => (
            <span key={n.label} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <span className="text-slate-200">·</span>}
              <span>{n.icon}</span> {n.label}
            </span>
          ))}
        </div>

        {/* Amenities — max 4 + more */}
        {topAmenities.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {topAmenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {amenityIcons[a] ?? '✓'} {a}
              </span>
            ))}
            {extraAmenityCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMore(true);
                }}
                className="text-[11px] font-semibold text-red-600 hover:underline px-1"
              >
                +{extraAmenityCount} More
              </button>
            )}
          </div>
        )}

        {/* More Details — expandable */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMore((v) => !v);
          }}
          className="mt-2.5 flex items-center gap-1 self-start text-[11px] font-bold text-slate-500 hover:text-red-600 transition-colors"
        >
          {showMore ? t('common.lessDetails', 'Less Details') : t('common.moreDetails', 'More Details')}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5">
                {p.floor_number != null && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Floor {p.floor_number}
                    {p.total_floors ? `/${p.total_floors}` : ''}
                  </div>
                )}
                {p.facing && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Navigation className="h-3.5 w-3.5 text-slate-400" /> {p.facing} facing
                  </div>
                )}
                {(p as any).is_verified && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('common.verified', 'Verified')}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  <TrendingUp className="h-3 w-3" /> Invest {investScore}%
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  <BarChart3 className="h-3 w-3" /> Rental Yield {(2.5 + Math.random() * 2).toFixed(1)}%
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                  <Zap className="h-3 w-3" /> High Demand
                </span>
                {p.amenities && p.amenities.length > 4 && (
                  <div className="mt-1 flex w-full flex-wrap gap-1.5">
                    {p.amenities.slice(4).map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {amenityIcons[a] ?? '✓'} {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Updated date */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Updated {new Date(p.updated_at).toLocaleDateString()}</span>
        </div>

        {/* CTA row — 4 equal-width buttons, no scrolling */}
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleContact}
            className="flex items-center justify-center gap-1 rounded-xl bg-red-600 hover:bg-red-700 px-2 py-2 text-[11px] font-bold text-white transition-all shadow-sm shadow-red-600/30"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('property.contactAgent', 'Contact')}</span>
          </button>
          <button
            onClick={handleContact}
            className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-2 py-2 text-[11px] font-bold text-white transition-all shadow-sm shadow-emerald-600/30"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">WhatsApp</span>
          </button>
          <button
            onClick={handleContact}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-700 transition-all"
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('property.bookVisit', 'Visit')}</span>
          </button>
          <Link
            to={generatePropertyUrl(p)}
            className="flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-2 text-[11px] font-bold text-red-600 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('common.viewDetails', 'Details')}</span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

// ──────────────────────────────────────────────────────────────
// Property Grid Card (compact)
// ──────────────────────────────────────────────────────────────
function GridCard({
  property: p,
  onSave,
  saved,
}: {
  property: Property & { city_name?: string; locality_name?: string; property_type_name?: string };
  onSave?: (id: string) => void;
  saved?: boolean;
}) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const images = p.images?.length ? p.images : ['https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'];
  const reraNumber = (p as { rera_number?: string | null }).rera_number ?? null;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${generatePropertyUrl(p)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      addToast('success', 'Link copied to clipboard');
    } catch {
      /* user cancelled share sheet — no-op */
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -5 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl cursor-pointer"
      onClick={() => navigate(generatePropertyUrl(p))}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img
          src={images[0]}
          alt={p.title}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
        />
        {reraNumber && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> RERA
          </span>
        )}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onSave?.(p.id)}
            aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(
              'grid h-7 w-7 place-items-center rounded-full backdrop-blur shadow-sm transition hover:scale-110',
              saved ? 'bg-white text-red-500' : 'bg-white/90 text-slate-600 hover:bg-white',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', saved && 'fill-red-500')} />
          </button>
          <button
            onClick={handleShare}
            aria-label="Share this property"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {p.possession_status && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            {p.possession_status}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-display text-base font-extrabold text-slate-900">
          {formatCompactPrice(p.price)}
          {p.purpose === 'Rent' && <span className="text-[10px] font-medium text-slate-400">/mo</span>}
        </p>
        <h3 className="mt-0.5 font-display text-sm font-bold text-slate-900 truncate">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-red-400" />
          <span className="truncate">{[p.locality_name, p.city_name].filter(Boolean).join(', ')}</span>
        </p>
        {p.bedrooms != null && (
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            <Bed className="h-3 w-3 text-slate-400" /> {p.bedrooms} BHK
          </span>
        )}
      </div>
    </motion.article>
  );
}

// ──────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────
function ListSkeleton() {
  return (
    <div
      className="flex gap-0 sm:gap-4 bg-white rounded-[20px] border border-slate-100 shadow-md overflow-hidden animate-pulse"
      style={{ minHeight: 240 }}
    >
      <div className="w-full sm:w-[38%] bg-slate-200 shrink-0" style={{ minHeight: 220 }} />
      <div className="flex-1 p-5 space-y-3">
        <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
        <div className="h-8 bg-slate-100 rounded-xl w-1/3" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 bg-slate-100 rounded-lg w-16" />
          ))}
        </div>
        <div className="flex gap-2 mt-auto">
          {Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="h-8 bg-slate-100 rounded-xl w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Filter Sidebar
// ──────────────────────────────────────────────────────────────
interface FilterSidebarProps {
  params: URLSearchParams;
  setFilter: (k: string, v: string) => void;
  clearAll: () => void;
  activeCount: number;
  types: { id: string; name: string; category: string }[];
  cities: { id: string; name: string }[];
  localities: { id: string; name: string; city_id: string }[];
}

function FilterSidebar({ params, setFilter, clearAll, activeCount, types, cities, localities }: FilterSidebarProps) {
  const { t } = useLanguageContext();
  const [openSections, setOpenSections] = useState<string[]>(['purpose', 'location', 'price', 'details']);
  const toggle = (s: string) =>
    setOpenSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const open = (s: string) => openSections.includes(s);

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      className="flex w-full items-center justify-between py-2 text-sm font-bold text-slate-800"
      onClick={() => toggle(id)}
    >
      {label}
      <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open(id) && 'rotate-180')} />
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-md overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-red-600" />
          {t('search.filtersHeader', 'Filters')}
          {activeCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
          >
            <X className="h-3.5 w-3.5" /> {t('search.clearAll', 'Clear All')}
          </button>
        )}
      </div>

      <div className="p-4 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Purpose */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="purpose" label={t('search.purposeLabel', 'Purpose')} />
          {open('purpose') && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { v: 'Sale', l: t('common.sale', 'Buy') },
                { v: 'Rent', l: t('common.rent', 'Rent') },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setFilter('purpose', params.get('purpose') === v ? '' : v)}
                  className={cn(
                    'rounded-xl py-2 text-sm font-bold transition border',
                    params.get('purpose') === v
                      ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="location" label={t('search.cityLabel', 'Location')} />
          {open('location') && (
            <div className="mt-2 space-y-2">
              <select
                value={params.get('city') ?? ''}
                onChange={(e) => setFilter('city', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200"
              >
                <option value="">{t('search.anyCity', 'Any City')}</option>
                {cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={params.get('locality') ?? ''}
                onChange={(e) => setFilter('locality', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200"
              >
                <option value="">{t('search.anyLocality', 'Any Locality')}</option>
                {localities?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Property Type */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="type" label={t('search.propertyTypeLabel', 'Property Type')} />
          {open('type') && (
            <div className="mt-2">
              <select
                value={params.get('type_id') ?? ''}
                onChange={(e) => setFilter('type_id', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-200"
              >
                <option value="">{t('search.anyType', 'Any Type')}</option>
                {types?.map((t2) => (
                  <option key={t2.id} value={t2.id}>
                    {t2.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="price" label={t('search.priceRange', 'Price Range')} />
          {open('price') && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {t('search.minPrice', 'Min ₹')}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={params.get('min_price') ?? ''}
                  onChange={(e) => setFilter('min_price', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {t('search.maxPrice', 'Max ₹')}
                </label>
                <input
                  type="number"
                  placeholder="∞"
                  value={params.get('max_price') ?? ''}
                  onChange={(e) => setFilter('max_price', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="details" label={t('search.bedroomsLabel', 'Bedrooms & Bathrooms')} />
          {open('details') && (
            <div className="mt-2 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">{t('search.bedroomsLabel', 'Bedrooms')}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {['', '1', '2', '3', '4', '5+'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setFilter('bedrooms', b === '5+' ? '5' : b)}
                      className={cn(
                        'h-8 px-3 rounded-xl text-xs font-bold border transition',
                        params.get('bedrooms') === (b === '5+' ? '5' : b)
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300',
                      )}
                    >
                      {b || t('search.any', 'Any')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">{t('search.bathroomsLabel', 'Bathrooms')}</p>
                <div className="flex gap-1.5">
                  {['', '1', '2', '3', '4'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setFilter('bathrooms', b)}
                      className={cn(
                        'h-8 px-3 rounded-xl text-xs font-bold border transition',
                        params.get('bathrooms') === b
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300',
                      )}
                    >
                      {b || t('search.any', 'Any')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Area */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="area" label={t('search.areaRange', 'Area (sq.ft)')} />
          {open('area') && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder={t('search.minArea', 'Min')}
                value={params.get('min_area') ?? ''}
                onChange={(e) => setFilter('min_area', e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
              />
              <input
                type="number"
                placeholder={t('search.maxArea', 'Max')}
                value={params.get('max_area') ?? ''}
                onChange={(e) => setFilter('max_area', e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Furnishing */}
        <div className="border-b border-slate-50 pb-2">
          <SectionHeader id="furnish" label={t('search.furnishingLabel', 'Furnishing')} />
          {open('furnish') && (
            <div className="mt-2 space-y-1.5">
              {[
                { v: '', l: t('search.any', 'Any') },
                { v: 'Unfurnished', l: t('search.unfurnished', 'Unfurnished') },
                { v: 'Semi-Furnished', l: t('search.semiFurnished', 'Semi-Furnished') },
                { v: 'Fully Furnished', l: t('search.fullyFurnished', 'Fully Furnished') },
              ].map(({ v, l }) => (
                <label key={v} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="furnishing"
                    value={v}
                    checked={params.get('furnishing') === v || (!params.get('furnishing') && !v)}
                    onChange={() => setFilter('furnishing', v)}
                    className="text-red-600 border-slate-300 focus:ring-red-400"
                  />
                  {l}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Extras */}
        <div className="pt-2 space-y-2">
          <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={params.get('luxury') === '1'}
              onChange={(e) => setFilter('luxury', e.target.checked ? '1' : '')}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-400"
            />
            ✨ {t('search.luxuryOnly', 'Luxury Properties Only')}
          </label>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={params.get('virtual_tour') === '1'}
              onChange={(e) => setFilter('virtual_tour', e.target.checked ? '1' : '')}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-400"
            />
            <Camera className="h-3.5 w-3.5 text-emerald-600" /> {t('search.hasVirtualTour', '360° Virtual Tour')}
          </label>
        </div>
      </div>
    </div>
  );
}

const FILTER_CHIP_LABELS: Record<string, string> = {
  purpose: 'Purpose',
  city_id: 'Location',
  city: 'Location',
  locality_id: 'Locality',
  locality: 'Locality',
  type: 'Type',
  type_id: 'Type',
  min_price: 'Min Price',
  max_price: 'Max Price',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  min_area: 'Min Area',
  max_area: 'Max Area',
  possession_status: 'Possession',
  amenities: 'Amenities',
  luxury: 'Luxury',
};

// Never render raw UUIDs in filter chips — resolve city_id/locality_id/type to their readable names.
function describeFilterChip(
  key: string,
  value: string,
  lookups: {
    cities?: { id: string; name: string }[];
    localities?: { id: string; name: string }[];
    types?: { id: string; name: string }[];
  },
): { label: string; value: string } {
  const label = FILTER_CHIP_LABELS[key] || key;
  let resolved = value;
  if (key === 'city_id') resolved = lookups.cities?.find((c) => c.id === value)?.name ?? value;
  else if (key === 'locality_id') resolved = lookups.localities?.find((l) => l.id === value)?.name ?? value;
  else if (key === 'type' || key === 'type_id') resolved = lookups.types?.find((ty) => ty.id === value)?.name ?? value;
  return { label, value: resolved };
}

// ──────────────────────────────────────────────────────────────
// Main Search Page
// ──────────────────────────────────────────────────────────────
export function SearchPage() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const view = (params.get('view') as ViewMode) || 'list';
  const setView = (v: ViewMode) => {
    const next = new URLSearchParams(params);
    next.set('view', v);
    setParams(next);
  };
  
  const sort = (params.get('sort') as SortOption) || 'newest';
  const setSort = (s: SortOption) => {
    const next = new URLSearchParams(params);
    next.set('sort', s);
    setParams(next);
  };
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());
  const [isVoiceSearchInitiated, setIsVoiceSearchInitiated] = useState(false);
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const { data: types } = useQuery({
    queryKey: ['ptypes-all'],
    queryFn: async () => {
      const { data } = await supabase.from('property_types').select('id, name, category').order('name');
      return data ?? [];
    },
  });
  const { data: cities } = useQuery({
    queryKey: ['cities-all'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      return data ?? [];
    },
  });
  const { data: localities } = useQuery({
    queryKey: ['localities-all'],
    queryFn: async () => {
      const { data } = await supabase.from('localities').select('id, name, city_id').order('name').limit(200);
      return data ?? [];
    },
  });

  const query = params.get('q') || '';

  const searchSuggestions = useCallback(async (q: string) => {
    const cleaned = sanitizeSearchQuery(q);
    if (cleaned.length < 2) {
      setSuggestions([]);
      return;
    }
    // Same source/status/fields as the main search so a suggestion always
    // resolves to a non-empty result when selected.
    const { data } = await supabase
      .from('v_properties_search')
      .select('title')
      .or('status.eq.published,is_live.eq.true')
      .ilike('search_text', `%${cleaned}%`)
      .limit(6);
    setSuggestions((data ?? []).map((p: { title: string }) => p.title));
  }, []);

  const filters: PropertyFilters = useMemo(() => {
    const typeIdParam = params.get('type_id') || undefined;
    const typeNameParam = params.get('type') || undefined;
    let resolvedTypeId = typeIdParam;
    if (typeNameParam && types) {
      const found = types.find((t2) => t2.name.toLowerCase() === typeNameParam.toLowerCase());
      if (found) resolvedTypeId = found.id;
    }

    // Phase 11: Resolve ?city=CityName → city_id UUID (footer links use names not UUIDs)
    // ?city_id=UUID (filter sidebar) takes precedence when present
    const cityIdParam = params.get('city_id') || undefined;
    const cityParam = params.get('city') || undefined;
    let resolvedCityId: string | undefined = cityIdParam;
    if (!resolvedCityId && cityParam) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(cityParam);
      resolvedCityId = isUuid
        ? cityParam
        : cities?.find((c) => c.name.toLowerCase() === cityParam.toLowerCase())?.id;
    }

    // Phase 11: Resolve ?locality=LocalityName → locality_id UUID
    const localityParam = params.get('locality') || undefined;
    let resolvedLocalityId: string | undefined;
    if (localityParam && localities) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(localityParam);
      resolvedLocalityId = isUuid
        ? localityParam
        : localities.find(
            (l) =>
              l.name.toLowerCase() === localityParam.toLowerCase() &&
              (!resolvedCityId || l.city_id === resolvedCityId),
          )?.id;
    }

    return {
      q: params.get('q') || undefined,
      city_id: resolvedCityId,
       
      ...(resolvedLocalityId ? { locality_id: resolvedLocalityId } : {}),
      purpose: params.get('purpose') || undefined,
      property_type_id: resolvedTypeId,
      min_price: params.get('min_price') ? Number(params.get('min_price')) : undefined,
      max_price: params.get('max_price') ? Number(params.get('max_price')) : undefined,
      bedrooms: params.get('bedrooms') ? Number(params.get('bedrooms')) : undefined,
      bathrooms: params.get('bathrooms') ? Number(params.get('bathrooms')) : undefined,
      min_area: params.get('min_area') ? Number(params.get('min_area')) : undefined,
      max_area: params.get('max_area') ? Number(params.get('max_area')) : undefined,
      furnishing: params.get('furnishing') || undefined,
      facing: params.get('facing') || undefined,
      is_luxury: params.get('luxury') === '1' || undefined,
      sort_by: sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    };
  }, [params, types, cities, localities, sort, page]);

  // Same data source and filters as every other listing surface (home, category
  // pages) — v_properties_search's search_text covers locality/city/project/title
  // in one ilike, so a locality-only query no longer returns 0 results just
  // because the property's own title/description doesn't mention it.
  const { data, isLoading } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => fetchPublishedProperties(filters),
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    if (isVoiceSearchInitiated && !isLoading && data) {
      const propertyText = data.count === 1 ? 'property' : 'properties';
      const introText = data.count > 0 
        ? `I found ${data.count} ${propertyText} matching your search.`
        : `I'm sorry, I couldn't find any properties matching your search.`;
      generateSpeech(introText);
      setIsVoiceSearchInitiated(false);
    }
  }, [isVoiceSearchInitiated, isLoading, data]);

  const goToPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => setParams(new URLSearchParams());
  const activeCount = Array.from(params.keys()).filter((k) => !['q', 'page'].includes(k)).length;
  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    addToast('success', savedIds.has(id) ? 'Removed from saved' : 'Saved!');
  };
  const toggleCompare = (id: string) => {
    setComparedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const pageTitle =
    filters.purpose === 'Rent'
      ? t('search.forRentTitle', 'Properties for Rent')
      : filters.purpose === 'Sale'
        ? t('search.forSaleTitle', 'Properties for Sale')
        : t('search.title', 'Search Properties');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── TOP TOOLBAR ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="container-page py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setFilter('q', e.target.value);
                  searchSuggestions(e.target.value);
                }}
                placeholder={t('search.placeholder', 'City, locality, project or builder...')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-20 text-sm text-slate-800 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {query && (
                  <button
                    onClick={() => {
                      setFilter('q', '');
                      setSuggestions([]);
                    }}
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <VoiceSearchButton
                  onResult={(text) => {
                    setFilter('q', text);
                    setIsVoiceSearchInitiated(true);
                  }}
                  className="h-7 w-7 !p-0 rounded-lg"
                />
              </div>
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-50 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setFilter('q', s);
                          setSuggestions([]);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <Search className="h-3.5 w-3.5 text-slate-400" /> {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Results count */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
              <span className="font-bold text-slate-900">{formatNumber(data?.count ?? 0)}</span>
              <span>{t('search.results', 'results')}</span>
              {filters.q && (
                <span className="text-slate-400">
                  for "<span className="font-semibold text-slate-700">{filters.q}</span>"
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Sort */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <SortDesc className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="ai_recommended">AI Recommended</option>
                  <option value="most_viewed">Most Viewed</option>
                  <option value="most_contacted">Most Contacted</option>
                  <option value="featured">Featured First</option>
                </select>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1">
                {(
                  [
                    { v: 'list', Icon: Rows3, label: 'List' },
                    { v: 'grid', Icon: LayoutGrid, label: 'Grid' },
                    { v: 'map', Icon: Map, label: 'Map' },
                  ] as const
                ).map(({ v, Icon, label }) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                      view === v ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100',
                    )}
                    title={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition lg:hidden',
                  showFilters ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-700',
                )}
              >
                <Filter className="h-4 w-4" />
                {t('search.filtersHeader', 'Filters')}
                {activeCount > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-extrabold">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t('search.activeFilters', 'Active:')}</span>
              {Array.from(params.entries())
                .filter(([k]) => !['q', 'page'].includes(k))
                .map(([k, v]) => {
                  const { label, value } = describeFilterChip(k, v, { cities, localities, types });
                  return (
                    <span
                      key={k}
                      className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700"
                    >
                      {label}: {value}
                      <button onClick={() => setFilter(k, '')} className="ml-0.5 hover:text-red-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-red-600 font-semibold ml-1">
                {t('search.clearAll', 'Clear all')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY: Sidebar + Results ── */}
      <div className="container-page py-6">
        <ListingPromoBanner />
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={cn('shrink-0 w-72', showFilters ? 'block' : 'hidden lg:block')}>
            <div className="sticky top-[88px]">
              <AdvancedFilters
                cities={cities ?? []}
                filters={filters}
                onFilterChange={(newFilters) => {
                  const updated = { ...filters, ...newFilters };
                  const newParams = new URLSearchParams(params);
                  
                  // Reset page on filter change
                  newParams.delete('page');

                  const syncParam = (key: string, value: any) => {
                    if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
                      newParams.set(key, Array.isArray(value) ? value.join(',') : value.toString());
                    } else {
                      newParams.delete(key);
                    }
                  };

                  syncParam('purpose', updated.purpose);
                  syncParam('city_id', updated.city_id);
                  syncParam('locality_id', updated.locality_id);
                  syncParam('type', updated.property_type_id);
                  syncParam('min_price', updated.min_price);
                  syncParam('max_price', updated.max_price);
                  syncParam('bedrooms', updated.bedrooms);
                  syncParam('bathrooms', updated.bathrooms);
                  syncParam('min_area', updated.min_area);
                  syncParam('max_area', updated.max_area);
                  syncParam('possession_status', updated.possession_status);
                  syncParam('amenities', updated.amenities);

                  setParams(newParams);
                }}
                onCloseMobile={() => setShowFilters(false)}
              />
            </div>
          </aside>

          {/* Results Area */}
          <div className="flex-1 min-w-0">
            {/* Results heading */}
              <div className="mb-4 flex items-center justify-between">
              <h1 className="font-display text-xl font-bold text-slate-900">
                {pageTitle}
                {data?.count != null && (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({formatNumber(data.count)} {t('search.results', 'results')})
                  </span>
                )}
              </h1>
            </div>

            {/* Map view */}
            {view === 'map' && data?.data && (
              <div className="mt-4">
                <PropertyMap properties={data.data} />
              </div>
            )}

            {/* List / Grid */}
            {view !== 'map' && (
              <>
                {isLoading ? (
                  <div
                    className={cn(
                      'space-y-4',
                      view === 'grid' && 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 space-y-0',
                    )}
                  >
                    {Array.from({ length: view === 'grid' ? 10 : 4 }).map((_, i) =>
                      view === 'list' ? (
                        <ListSkeleton key={i} />
                      ) : (
                        <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />
                      ),
                    )}
                  </div>
                ) : data && data.data.length > 0 ? (
                  <>
                    <div
                      className={cn(
                        view === 'grid'
                          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                          : 'space-y-4',
                      )}
                    >
                      {data.data.map((p, index) => (
                        <div key={p.id} className="contents">
                          {view === 'list' ? (
                            <HorizontalCard
                              property={p as any}
                              onSave={toggleSave}
                              onCompare={toggleCompare}
                              saved={savedIds.has(p.id)}
                              compared={comparedIds.has(p.id)}
                            />
                          ) : (
                            <GridCard property={p as any} onSave={toggleSave} saved={savedIds.has(p.id)} />
                          )}

                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          disabled={page <= 1}
                          onClick={() => goToPage(page - 1)}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft className="h-4 w-4" /> {t('common.back', 'Prev')}
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                          const pg = i + 1;
                          return (
                            <button
                              key={pg}
                              onClick={() => goToPage(pg)}
                              className={cn(
                                'h-9 w-9 rounded-xl text-sm font-bold transition border',
                                page === pg
                                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600',
                              )}
                            >
                              {pg}
                            </button>
                          );
                        })}
                        {totalPages > 7 && <span className="px-2 text-slate-400 font-bold">…</span>}
                        <button
                          disabled={page >= totalPages}
                          onClick={() => goToPage(page + 1)}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {t('common.next', 'Next')} <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 gap-4">
                    <MapPin className="h-12 w-12 text-slate-300" />
                    <p className="font-bold text-slate-700 text-lg">
                      {t('search.notFoundTitle', 'No properties found')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t('search.notFoundDesc', 'Try adjusting your filters or searching in a different city.')}
                    </p>
                    <button
                      onClick={clearAll}
                      className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-5 py-2 text-sm font-bold hover:bg-red-100 transition"
                    >
                      {t('search.clearFilters', 'Clear All Filters')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Floating CTA */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <Link
          to="/portal/list-property"
          className="flex h-14 items-center justify-center rounded-full bg-red-600 px-6 font-bold text-white shadow-xl hover:bg-red-700 transition"
        >
          Post Property FREE
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Category Page (Buy / Rent / Commercial / Plots / Luxury)
// ──────────────────────────────────────────────────────────────
export function CategoryPage({ category }: { category: 'buy' | 'rent' | 'commercial' | 'plots' | 'luxury' }) {
  const { t } = useLanguageContext();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const purpose = category === 'rent' ? 'Rent' : category === 'buy' ? 'Sale' : undefined;
  const isLuxury = category === 'luxury';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  // SEO
  const seoTitle = {
    buy: t('search.forSaleTitle', 'Properties for Sale in Hyderabad'),
    rent: t('search.forRentTitle', 'Properties for Rent in Hyderabad'),
    commercial: t('menu.commercialSpaces', 'Commercial Properties in Hyderabad'),
    plots: t('menu.plotsTitle', 'Plots & Land in Hyderabad'),
    luxury: t('home.signatureCollection', 'Luxury Homes in Hyderabad'),
  }[category];

  useSEO({
    title: seoTitle,
    description: `Browse the best ${seoTitle.toLowerCase()}. Find your dream property today with RealtyNow.`,
    schema: {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": seoTitle,
    }
  });

  const { data: cities } = useQuery({
    queryKey: ['cities-all'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data: types } = useQuery({
    queryKey: ['ptypes-all'],
    queryFn: async () => {
      const { data } = await supabase.from('property_types').select('id, name, category').order('name');
      return data ?? [];
    },
  });

  const typeFilter = useMemo(() => {
    if (!types) return undefined;
    if (category === 'commercial') return types.filter((t2) => t2.category === 'Commercial').map((t2) => t2.id);
    if (category === 'plots') return types.filter((t2) => t2.category === 'Plot').map((t2) => t2.id);
    return undefined;
  }, [types, category]);

  const filters: PropertyFilters = useMemo(() => {
    const typeIdParam = params.get('type_id') || undefined;
    const typeNameParam = params.get('type') || undefined;
    let resolvedTypeId = typeIdParam;
    if (typeNameParam && types) {
      const found = types.find((t2) => t2.name.toLowerCase() === typeNameParam.toLowerCase());
      if (found) resolvedTypeId = found.id;
    }
    
    // Category defaults
    const defaultPurpose = category === 'rent' ? 'Rent' : category === 'buy' ? 'Sale' : undefined;
    const defaultIsLuxury = category === 'luxury' || undefined;

    // ?city_id=UUID (filter sidebar) takes precedence; ?city=CityName (footer/home links) is resolved via lookup
    const cityIdParam = params.get('city_id') || undefined;
    const cityParam = params.get('city') || undefined;
    let resolvedCityId: string | undefined = cityIdParam;
    if (!resolvedCityId && cityParam) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(cityParam);
      resolvedCityId = isUuid
        ? cityParam
        : cities?.find((c) => c.name.toLowerCase() === cityParam.toLowerCase())?.id;
    }

    return {
      q: params.get('q') || undefined,
      city_id: resolvedCityId,
      purpose: params.get('purpose') || defaultPurpose,
      property_type_id: resolvedTypeId || (typeFilter && typeFilter.length === 1 ? typeFilter[0] : undefined),
      min_price: params.get('min_price') ? Number(params.get('min_price')) : undefined,
      max_price: params.get('max_price') ? Number(params.get('max_price')) : undefined,
      bedrooms: params.get('bedrooms') ? Number(params.get('bedrooms')) : undefined,
      bathrooms: params.get('bathrooms') ? Number(params.get('bathrooms')) : undefined,
      min_area: params.get('min_area') ? Number(params.get('min_area')) : undefined,
      max_area: params.get('max_area') ? Number(params.get('max_area')) : undefined,
      furnishing: params.get('furnishing') || undefined,
      facing: params.get('facing') || undefined,
      is_luxury: params.get('luxury') === '1' || defaultIsLuxury,
    };
  }, [params, types, category, typeFilter, cities]);

  // Same v_properties_search source/status as the main search page and every
  // other listing surface — search_text covers locality/city/project/title so
  // a locality-only q never returns 0 just because title/description omit it.
  const { data, isLoading } = useQuery({
    queryKey: ['category', category, filters, page],
    queryFn: async () => {
      let q = supabase
        .from('v_properties_search')
        .select('*', { count: 'estimated' })
        .or('status.eq.published,is_live.eq.true');

      if (filters.purpose) q = q.eq('purpose', filters.purpose);
      if (filters.city_id) q = q.eq('city_id', filters.city_id);

      if (filters.property_type_id) {
        q = q.eq('property_type_id', filters.property_type_id);
      } else if (typeFilter && typeFilter.length > 0) {
        q = q.in('property_type_id', typeFilter);
      }

      if (filters.min_price != null) q = q.gte('price', filters.min_price);
      if (filters.max_price != null) q = q.lte('price', filters.max_price);
      if (filters.bedrooms != null) q = q.eq('bedrooms', filters.bedrooms);
      if (filters.bathrooms != null) q = q.eq('bathrooms', filters.bathrooms);
      if (filters.min_area != null) q = q.gte('built_up_area', filters.min_area);
      if (filters.max_area != null) q = q.lte('built_up_area', filters.max_area);
      if (filters.furnishing) q = q.eq('furnishing', filters.furnishing);
      if (filters.facing) q = q.eq('facing', filters.facing);
      if (filters.is_luxury) q = q.eq('is_luxury', true);
      if (filters.q) {
        const cleaned = sanitizeSearchQuery(filters.q);
        if (cleaned) q = q.ilike('search_text', `%${cleaned}%`);
      }

      q = q
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: (data ?? []) as unknown as Property[], count: count ?? (data?.length ?? 0) };
    },
  });

  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const title = {
    buy: t('search.forSaleTitle', 'Properties for Sale'),
    rent: t('search.forRentTitle', 'Properties for Rent'),
    commercial: t('menu.commercialSpaces', 'Commercial Properties'),
    plots: t('menu.plotsTitle', 'Plots & Land'),
    luxury: t('home.signatureCollection', 'Luxury Homes'),
  }[category];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-page py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-bold text-slate-800">{formatNumber(data?.count ?? 0)}</span>{' '}
              {t('property.propertiesCount', 'properties')}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            <Filter className="h-4 w-4" /> {t('search.filters', 'Filters')}
          </button>
        </div>
        
        <ListingPromoBanner />

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* Sidebar */}
          <aside className={cn('shrink-0 w-72', showFilters ? 'block' : 'hidden lg:block')}>
            <div className="sticky top-[88px]">
              <AdvancedFilters
                cities={cities ?? []}
                filters={filters}
                onFilterChange={(newFilters) => {
                  const updated = { ...filters, ...newFilters };
                  const newParams = new URLSearchParams(params);
                  
                  newParams.delete('page');

                  const syncParam = (key: string, value: any) => {
                    if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
                      newParams.set(key, Array.isArray(value) ? value.join(',') : value.toString());
                    } else {
                      newParams.delete(key);
                    }
                  };

                  syncParam('purpose', updated.purpose);
                  syncParam('city_id', updated.city_id);
                  syncParam('locality_id', updated.locality_id);
                  syncParam('type', updated.property_type_id);
                  syncParam('min_price', updated.min_price);
                  syncParam('max_price', updated.max_price);
                  syncParam('bedrooms', updated.bedrooms);
                  syncParam('bathrooms', updated.bathrooms);
                  syncParam('min_area', updated.min_area);
                  syncParam('max_area', updated.max_area);
                  syncParam('possession_status', updated.possession_status);
                  syncParam('amenities', updated.amenities);

                  setParams(newParams);
                }}
                onCloseMobile={() => setShowFilters(false)}
              />
            </div>
          </aside>

          {/* Main Listings Column */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ListSkeleton key={i} />
                ))}
              </div>
            ) : data && data.data.length > 0 ? (
              <div className="space-y-4">
                {data.data.map((p, index) => (
                  <div key={p.id} className="contents">
                    <HorizontalCard property={p as any} />
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                    <button
                      disabled={page <= 1}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('page', String(page - 1));
                        setParams(next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="h-4 w-4" /> {t('common.back', 'Prev')}
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      const pg = i + 1;
                      return (
                        <button
                          key={pg}
                          onClick={() => {
                            const next = new URLSearchParams(params);
                            next.set('page', String(pg));
                            setParams(next);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={cn(
                            'h-9 w-9 rounded-xl text-sm font-bold border transition',
                            page === pg
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-red-300',
                          )}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    {totalPages > 7 && <span className="px-2 text-slate-400 font-bold">…</span>}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('page', String(page + 1));
                        setParams(next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {t('common.next', 'Next')} <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 gap-4">
                <Home className="h-12 w-12 text-slate-300" />
                <p className="font-bold text-slate-700">
                  {t('search.noCategoryTitle', 'No properties in this category yet')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('search.noCategoryDesc', 'Check back soon or browse all properties.')}
                </p>
                <Link to="/search" className="rounded-xl bg-red-600 text-white px-5 py-2 text-sm font-bold">
                  {t('search.browseAll', 'Browse All')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Floating CTA */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <Link
          to="/portal/list-property"
          className="flex h-14 items-center justify-center rounded-full bg-red-600 px-6 font-bold text-white shadow-xl hover:bg-red-700 transition"
        >
          Post Property FREE
        </Link>
      </div>
    </div>
  );
}

