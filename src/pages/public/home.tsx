import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link, useNavigate } from 'react-router-dom';
import { PostPropertyBanner } from '../../components/post-property-banner';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import homeServicesImg from '../../assets/services/home-services.webp';
import interiorServicesImg from '../../assets/services/interior-services.webp';
import borewellServicesImg from '../../assets/services/borewell-services.webp';
import homeLoansImg from '../../assets/services/home-loans.webp';
import {
  Search,
  Mic,
  Camera,
  Navigation,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building2,
  Home,
  Store,
  Warehouse,
  Users,
  Star,
  Phone,
  MessageCircle,
  Calendar,
  ShieldCheck,
  BadgeCheck,
  Zap,
  Bot,
  Calculator,
  FileText,
  Wallet,
  KeyRound,
  Briefcase,
  Heart,
  GitCompare,
  Quote,
  BarChart3,
  Layers,
  Award,
  Scale,
  Hammer,
  Sun,
  Shield,
  Truck,
  Ruler,
  PaintBucket,
  LandPlot,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Droplets,
  PieChart,
  Bed,
  Share2,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRealtimeCount } from '../../lib/realtime';
import { formatCompactPrice, formatPrice, formatNumber, cn, generatePropertyUrl } from '../../lib/utils';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useToast } from '../../components/toast';
import { AppShowcase } from '../../components/app-showcase';
import type { HeroCampaign, Property } from '../../lib/types';
import { useLocationContext } from '../../contexts/location-context';

import { useFavorites, toggleFavoriteProperty, getLocalFavoriteIds } from '../../lib/favorites';
import { useAuth } from '../../lib/auth';

type HomeCardProperty = Property & {
  city_name?: string | null;
  locality_name?: string | null;
  property_type_name?: string | null;
  builder_name?: string | null;
};

/* ============================================================
   Compact premium property card — shared by the homepage carousels
============================================================ */
export function HomePropertyCard({
  property,
  badge,
}: {
  property: HomeCardProperty;
  badge?: { label: string; className: string; icon?: React.ReactNode };
}) {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: favoriteIds } = useFavorites(user?.id);
  const favorited = favoriteIds ? favoriteIds.includes(property.id) : false;
  
  const [localFavorited, setLocalFavorited] = useState(() => getLocalFavoriteIds().includes(property.id));
  useEffect(() => {
    if (!user) {
      const handleSyncFavorites = () => setLocalFavorited(getLocalFavoriteIds().includes(property.id));
      window.addEventListener('realtynow-favorites-updated', handleSyncFavorites);
      return () => window.removeEventListener('realtynow-favorites-updated', handleSyncFavorites);
    }
  }, [property.id, user]);

  const isCurrentlyFavorited = user ? favorited : localFavorited;
  const reraNumber = (property as { rera_number?: string | null }).rera_number ?? null;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFavoriteProperty(property.id, user?.id, isCurrentlyFavorited);
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${generatePropertyUrl(property)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      addToast('success', 'Link copied to clipboard');
    } catch {
      /* user cancelled share sheet — no-op */
    }
  };

  return (
    <Link
      to={generatePropertyUrl(property)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-300 hover:shadow-[0_16px_36px_rgba(0,0,0,0.12)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={property.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        {badge && (
          <span
            className={cn(
              'absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow',
              badge.className,
            )}
          >
            {badge.icon} {badge.label}
          </span>
        )}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          <button
            onClick={handleFavorite}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110 cursor-pointer',
              isCurrentlyFavorited ? 'text-red-500' : 'text-slate-600 hover:text-slate-900',
            )}
            title={isCurrentlyFavorited ? t('common.removeFromFavorites', 'Remove') : t('common.addToFavorites', 'Save')}
          >
            <Heart className={cn('h-4 w-4', isCurrentlyFavorited && 'fill-red-500')} />
          </button>
          <button
            onClick={handleShareClick}
            aria-label="Share this property"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {property.possession_status && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            {property.possession_status}
          </span>
        )}
        {reraNumber && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> RERA
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-display text-base font-extrabold text-slate-900">
          {formatCompactPrice(property.price)}
          {property.purpose === 'Rent' && <span className="text-[10px] font-medium text-slate-400">/mo</span>}
        </p>
        <h3 className="mt-0.5 font-display text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors">
          {property.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">
            {property.locality_name ? `${property.locality_name}, ` : ''}
            {property.city_name ?? 'Hyderabad'}
          </span>
        </p>
        {property.bedrooms != null && (
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            <Bed className="h-3 w-3 text-slate-400" /> {property.bedrooms} BHK
          </span>
        )}
      </div>
    </Link>
  );
}

/* ============================================================
   Animated Counter
============================================================ */
function Counter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.floor(eased * to));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {formatNumber(val)}
      {suffix}
    </span>
  );
}

/* ============================================================
   Hero Section
============================================================ */
type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  companyLogo?: string | null;
  priceText?: string | null;
  locationText?: string | null;
  imageDesktop: string;
  imageMobile?: string | null;
  ctaText: string;
  ctaLink: string;
  packageTier?: 'Platinum' | 'Gold' | 'Silver' | 'Featured' | 'Free' | null;
  isPinned?: boolean;
};

// Static fallback slides — shown only when no admin-configured Hero-placement
// advertisements are currently live, so the homepage never looks empty.
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-ramky',
    title: 'Discover Premium Living in Hyderabad',
    subtitle: 'Explore world-class residential high-rises with modern amenities and unparalleled luxury.',
    priceText: undefined,
    locationText: 'Hyderabad',
    imageDesktop: '/hero-ramky.jpg',
    imageMobile: '/hero-ramky.jpg',
    ctaText: 'Explore Projects',
    ctaLink: '/search?city=Hyderabad',
  },
  {
    id: 'fallback-2',
    title: 'Premium Homes, Verified & Ready',
    subtitle: 'RERA-approved projects with zero brokerage and instant AI-powered shortlisting.',
    priceText: undefined,
    locationText: 'Hyderabad',
    imageDesktop: '/hero_bg_user.jpg',
    imageMobile: '/hero_bg_user.jpg',
    ctaText: 'Explore Now',
    ctaLink: '/search?purpose=Buy',
  },
  {
    id: 'fallback-3',
    title: 'Luxury Living, Redefined',
    subtitle: 'Handpicked luxury apartments and villas with world-class amenities.',
    priceText: undefined,
    locationText: 'Hyderabad',
    imageDesktop: '/hero_luxury_bg.png',
    imageMobile: '/hero_luxury_bg.png',
    ctaText: 'Explore Now',
    ctaLink: '/search?type=Villa',
  },
];

const HERO_SLIDE_INTERVAL_MS = 5000; // Keep in sync with the `hero-progress` animation duration in tailwind.config.js

const heroTextVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function mapCampaignToHeroSlide(c: HeroCampaign): HeroSlide {
  return {
    id: c.id,
    title: c.title,
    subtitle: (c.subtitle && c.subtitle.trim()) || c.description || '',
    companyLogo: c.logo,
    // Reuses the existing "priceText" slide slot to surface a Sponsored badge for
    // Paid campaigns — Free campaigns just show their location, same as before.
    priceText: c.campaign_type === 'Paid' ? (c.package_tier && c.package_tier !== 'Free' ? c.package_tier : 'Sponsored') : null,
    locationText: c.cities?.name ?? null,
    imageDesktop: c.banner_image || '',
    imageMobile: c.mobile_banner || c.banner_image || '',
    ctaText: c.cta_text || 'Explore Now',
    ctaLink: c.cta_url || (c.property_id ? `/property/${c.property_id}` : '/search'),
    packageTier: c.package_tier,
    isPinned: c.is_pinned,
  };
}

function HeroSection() {
  const { cityId } = useLocationContext();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const { data: campaigns } = useQuery({
    queryKey: ['hero-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_campaigns')
        .select('*, cities(name)')
        .eq('status', 'Active')
        .order('order_no', { ascending: true });
      if (error) return [];
      return (data ?? []) as HeroCampaign[];
    },
  });

  const slides = useMemo(() => {
    const now = Date.now();
    const active = (campaigns ?? []).filter((c) => {
      if (c.start_date && new Date(c.start_date).getTime() > now) return false;
      if (c.end_date && new Date(c.end_date).getTime() < now) return false;
      return true;
    });
    // City-scoped campaigns (city_id set) only show in that city; campaigns left on
    // "All Cities" (city_id null) always show. Skip the city filter until a city is
    // detected so slides aren't empty during the initial geolocation lookup.
    const live = cityId ? active.filter((c) => !c.city_id || c.city_id === cityId) : active;

    const sortedLive = [...live].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      const tierWeights: Record<string, number> = {
        Platinum: 5,
        Gold: 4,
        Silver: 3,
        Featured: 2,
        Free: 1,
      };

      const weightA = tierWeights[a.package_tier || 'Free'] || 1;
      const weightB = tierWeights[b.package_tier || 'Free'] || 1;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const orderA = a.order_no ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order_no ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return sortedLive.length > 0 ? sortedLive.map(mapCampaignToHeroSlide) : HERO_SLIDES;
  }, [campaigns, cityId]);

  // Plugin instance must stay referentially stable across renders — recreating it
  // inline on every render (e.g. after setSelectedIndex) re-triggers Autoplay's
  // init/reset logic and was causing scrollNext() to advance by two slides.
  const autoplayPlugin = useRef(Autoplay({ delay: HERO_SLIDE_INTERVAL_MS, stopOnInteraction: false }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', duration: 32 }, [autoplayPlugin.current]);

  // Drive pause-on-hover explicitly off our own hover state rather than the
  // plugin's built-in stopOnMouseEnter, which didn't reliably see hover/leave
  // on this nested container and let the timer keep firing underneath.
  useEffect(() => {
    if (!emblaApi) return;
    try {
      if (isHovering) autoplayPlugin.current.stop();
      else autoplayPlugin.current.play();
    } catch {
      // Autoplay can be mid-(re)init during React StrictMode's double-effect
      // dev-mode cycle; a missed play/stop here self-corrects on the next
      // hover change, so failing silently beats crashing the whole section.
    }
  }, [isHovering, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Live campaigns can load after mount and change the slide count — re-measure
  // embla's scroll snaps so autoplay/drag stay in sync with the new slide list.
  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, slides.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  // Arrow-key navigation, scoped to pointer-over-hero so it doesn't hijack arrow
  // keys used elsewhere on the page (search box, forms).
  const isHoveringRef = useRef(false);
  useEffect(() => {
    isHoveringRef.current = isHovering;
  }, [isHovering]);
  useEffect(() => {
    if (slides.length <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isHoveringRef.current) return;
      if (e.key === 'ArrowLeft') scrollPrev();
      else if (e.key === 'ArrowRight') scrollNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollPrev, scrollNext, slides.length]);

  // Wheel navigation — deliberately never calls preventDefault, so a mouse/trackpad
  // flick over the hero still scrolls the page; it just also nudges the slide.
  const wheelLockRef = useRef(false);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (slides.length <= 1 || wheelLockRef.current) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 24) return;
      wheelLockRef.current = true;
      if (delta > 0) scrollNext();
      else scrollPrev();
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 700);
    },
    [scrollNext, scrollPrev, slides.length],
  );

  const activeSlide = slides[selectedIndex] ?? slides[0];

  return (
    <section
      className="relative overflow-hidden bg-navy-950 focus:outline-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onWheel={onWheel}
    >
      <div className="relative h-[380px] sm:h-[430px] lg:h-[470px] max-h-[470px] w-full">
        {/* Sliding track — slides sit edge-to-edge so the next banner is always
           physically adjacent, never a blank gap, during the transition. */}
        <div className="h-full w-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {slides.map((slide, index) => {
              const isActive = index === selectedIndex;
              return (
                <div key={slide.id} className="relative h-full min-w-0 flex-[0_0_100%]">
                  <motion.div
                    className="absolute inset-0 will-change-transform"
                    animate={isActive ? 'active' : 'inactive'}
                    initial="inactive"
                    variants={{
                      active: { scale: 1, opacity: 1, filter: 'blur(0px)' },
                      inactive: { scale: 1.05, opacity: 0.55, filter: 'blur(6px)' },
                    }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <picture>
                      {slide.imageMobile && slide.imageMobile !== slide.imageDesktop && (
                        <source media="(max-width: 640px)" srcSet={slide.imageMobile} />
                      )}
                      <img
                        key={isActive ? `${slide.id}-kb-${selectedIndex}` : slide.id}
                        src={slide.imageDesktop}
                        alt={slide.title}
                        className={cn('h-full w-full object-cover object-center', isActive && 'animate-hero-ken-burns')}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        {...{ fetchpriority: index === 0 ? 'high' : 'low' }}
                      />
                    </picture>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Left/right navigation arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 sm:left-5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-800 shadow-lg transition-all hover:bg-white sm:h-11 sm:w-11"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 sm:right-5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-800 shadow-lg transition-all hover:bg-white sm:h-11 sm:w-11"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Animated progress indicator — fills over the autoplay dwell time instead of a static dot */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 right-4 z-20 flex gap-1.5 sm:right-6">
            {slides.map((s, idx) => (
              <button
                type="button"
                key={s.id}
                onClick={() => scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="relative h-1 w-7 overflow-hidden rounded-full bg-white/30 sm:w-9"
              >
                <span
                  key={idx === selectedIndex ? `progress-${selectedIndex}` : undefined}
                  className={cn(
                    'absolute inset-y-0 left-0 w-full origin-left rounded-full bg-white',
                    idx < selectedIndex ? 'scale-x-100' : idx > selectedIndex ? 'scale-x-0' : 'animate-hero-progress',
                  )}
                  style={idx === selectedIndex ? { animationPlayState: isHovering ? 'paused' : 'running' } : undefined}
                />
              </button>
            ))}
          </div>
        )}

        {/* Cinematic scrim — text sits directly on the image, no card, so this carries all the legibility */}
        <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-navy-950/85 via-navy-950/35 to-navy-950/10" />

        {/* Slide info — centered directly over the banner image */}
        <div className="absolute inset-0 z-10">
          <AnimatePresence initial={false}>
            <motion.div
              key={`panel-${activeSlide.id}-${selectedIndex}`}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
              className="absolute inset-0 flex items-center justify-center px-4 text-center sm:px-8"
            >
              <div className="max-w-2xl">
                {activeSlide.companyLogo && (
                  <motion.div
                    variants={heroTextVariants}
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/95 p-1 shadow-lg sm:h-12 sm:w-12"
                  >
                    <img src={activeSlide.companyLogo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  </motion.div>
                )}

                {activeSlide.locationText && (
                  <motion.p
                    variants={heroTextVariants}
                    className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)] sm:text-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    {activeSlide.locationText}
                  </motion.p>
                )}

                <motion.h2
                  variants={heroTextVariants}
                  className="font-display text-2xl font-extrabold uppercase leading-[1.15] tracking-wide text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl"
                >
                  {activeSlide.title}
                </motion.h2>

                {activeSlide.subtitle && (
                  <motion.p
                    variants={heroTextVariants}
                    className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/90 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] sm:text-base"
                  >
                    {activeSlide.subtitle}
                  </motion.p>
                )}

                <motion.div variants={heroTextVariants} className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
                  {activeSlide.priceText && (
                    <span className="text-sm font-bold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] sm:text-base">
                      {activeSlide.priceText}
                    </span>
                  )}
                  {activeSlide.ctaLink.startsWith('http') ? (
                    <a
                      href={activeSlide.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-white/85 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-all hover:bg-white hover:text-navy-900 sm:text-sm"
                    >
                      {activeSlide.ctaText}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Link
                      to={activeSlide.ctaLink}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-white/85 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-all hover:bg-white hover:text-navy-900 sm:text-sm"
                    >
                      {activeSlide.ctaText}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AI Smart Search
============================================================ */
const SEARCH_TABS = ['Buy', 'Rent', 'PG', 'Commercial', 'Plots', 'Projects'] as const;

const SEARCH_PLACEHOLDERS: Record<(typeof SEARCH_TABS)[number], string[]> = {
  Buy: [
    'Search Apartments in Hyderabad...',
    'Search Villas in Bangalore...',
    'Search 2 & 3 BHK Luxury Flats...',
  ],
  Rent: [
    'Search Rental Apartments in Gachibowli...',
    'Search Furnished Houses for Rent...',
    'Search Flats near Hitec City...',
  ],
  PG: [
    'Search PG & Hostels in Gachibowli...',
    'Search Boys / Girls PG in Bangalore...',
    'Search Luxury Co-Living Spaces in Hyderabad...',
  ],
  Commercial: [
    'Search Commercial Offices in Financial District...',
    'Search Shops & Showrooms for Lease...',
    'Search Warehouses & Industrial Spaces...',
  ],
  Plots: [
    'Search Residential Plots Near ORR...',
    'Search Villa Plots in Jubilee Hills...',
    'Search Gated Community Plots...',
  ],
  Projects: [
    'Search New Launch Projects in Gachibowli...',
    'Search Upcoming Gated Communities...',
    'Search Luxury Builder Projects...',
  ],
};

function useTypingPlaceholder(phrases: string[], active: boolean) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');

  useEffect(() => {
    if (!active) return;
    const current = phrases[phraseIndex % phrases.length];
    let timeout: number;

    if (phase === 'typing') {
      timeout = window.setTimeout(() => {
        if (charCount < current.length) setCharCount((c) => c + 1);
        else setPhase('pausing');
      }, 45);
    } else if (phase === 'pausing') {
      timeout = window.setTimeout(() => setPhase('deleting'), 700);
    } else {
      timeout = window.setTimeout(() => {
        if (charCount > 0) setCharCount((c) => c - 1);
        else {
          setPhase('typing');
          setPhraseIndex((i) => (i + 1) % phrases.length);
        }
      }, 22);
    }
    return () => window.clearTimeout(timeout);
  }, [active, charCount, phase, phraseIndex, phrases]);

  return phrases[phraseIndex % phrases.length].slice(0, charCount);
}

function AISmartSearch() {
  const navigate = useNavigate();
  const toast = useToast();
  const { detectLocation } = useLocationContext();
  const [tab, setTab] = useState<(typeof SEARCH_TABS)[number]>('Buy');
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [locating, setLocating] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const activePlaceholders = useMemo(() => SEARCH_PLACEHOLDERS[tab] || SEARCH_PLACEHOLDERS.Buy, [tab]);
  const typedPlaceholder = useTypingPlaceholder(activePlaceholders, !query);

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.addToast('error', 'Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'RealtyNow/1.0 (contact@realtynow.in)',
              },
            }
          );
          const data = await res.json();
          const address = data?.address || {};
          const locality =
            address.suburb ||
            address.neighbourhood ||
            address.residential ||
            address.subdistrict ||
            address.town ||
            address.city_district ||
            '';
          const city =
            address.city ||
            address.town ||
            address.state_district ||
            address.county ||
            '';

          const detectedName = [locality, city].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setQuery(detectedName);
          toast.addToast('success', `Live location detected: ${detectedName}`);
          
          detectLocation().catch(() => {});
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setQuery(fallback);
          toast.addToast('success', `Location coordinates: ${fallback}`);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        if (err.code === 1) {
          toast.addToast('error', 'Location permission denied. Please allow location access in your browser settings.');
        } else {
          toast.addToast('error', 'Failed to fetch live location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleVoice = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => { start: () => void; stop: () => void; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; onend: () => void; lang: string; continuous: boolean; interimResults: boolean } }).webkitSpeechRecognition;
    if (!SR) { setQuery('Voice search not supported in this browser'); return; }
    setListening(true);
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const handleAISearch = async () => {
    setAiThinking(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim());
      }
      if (tab === 'Rent') {
        params.set('purpose', 'Rent');
      } else if (tab === 'PG') {
        params.set('purpose', 'PG');
      } else if (tab === 'Buy') {
        params.set('purpose', 'Sale');
      } else if (tab === 'Commercial') {
        params.set('type', 'Commercial');
      } else if (tab === 'Plots') {
        params.set('type', 'Plot');
      } else if (tab === 'Projects') {
        params.set('category', 'Project');
      }

      navigate(`/search?${params.toString()}`);
    } catch {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div className="container-wide relative z-30 -mt-16 sm:-mt-20">
      <div className="relative mx-auto w-[92%] sm:w-[85%] lg:w-[78%] max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="w-full rounded-[2rem] border border-slate-200/90 bg-white/95 p-3 sm:p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl"
        >
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 pb-2.5 border-b border-slate-100 px-1">
            {SEARCH_TABS.map((tItem) => (
              <button
                key={tItem}
                onClick={() => setTab(tItem)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200',
                  tab === tItem
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 scale-[1.02]'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                )}
              >
                {tItem === 'Buy' && <Home className="h-4 w-4" />}
                {tItem === 'Rent' && <KeyRound className="h-4 w-4" />}
                {tItem === 'PG' && <Bed className="h-4 w-4" />}
                {tItem === 'Commercial' && <Building2 className="h-4 w-4" />}
                {tItem === 'Plots' && <LandPlot className="h-4 w-4" />}
                {tItem === 'Projects' && <Layers className="h-4 w-4" />}
                {tItem}
              </button>
            ))}
          </div>

          {/* Main Search Input & Actions */}
          <div className="flex flex-col md:flex-row items-center gap-2.5 pt-2.5">
            <div className="relative w-full flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                aria-label="Search properties"
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-3.5 pl-12 pr-32 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all"
              />
              {!query && (
                <div className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 text-sm sm:text-base text-slate-400">
                  {typedPlaceholder}
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-red-500 align-middle" />
                </div>
              )}
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1">
                <button
                  onClick={handleVoice}
                  className={cn('grid h-8 w-8 place-items-center rounded-xl transition-all', listening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-200/60')}
                  title="Voice Search"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLiveLocation}
                  disabled={locating}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-xl transition-all',
                    locating
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-slate-500 hover:bg-slate-200/60 hover:text-red-600'
                  )}
                  title="Detect Live Location"
                >
                  <Navigation className={cn("h-4 w-4 transition-transform", locating && "animate-spin")} />
                </button>
              </div>
            </div>

            <button
              onClick={handleAISearch}
              disabled={aiThinking}
              className="w-full md:w-auto rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className={cn("h-4 w-4", aiThinking && "animate-spin")} />
              <span>{aiThinking ? 'AI Analyzing…' : 'Search'}</span>
            </button>
          </div>
        </motion.div>

        {/* AI Robot — sits outside the (now centered) search panel, offset to its right */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden lg:flex absolute left-full bottom-0 ml-6 xl:ml-10 items-end justify-center shrink-0"
        >
          <img
            src="/robot.png"
            alt="AI Assistant Robot"
            className="h-44 xl:h-52 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform cursor-pointer mix-blend-multiply"
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
            title="Chat with AI Assistant"
          />
        </motion.div>
      </div>
    </div>
  );
}
/* ============================================================
   Trust Section
============================================================ */
function TrustSection() {
  const { t } = useLanguageContext();
  const badges = [
    { icon: BadgeCheck, label: t('home.verifiedProperties', 'Verified Properties'), color: 'text-primary-600' },
    { icon: ShieldCheck, label: t('home.reraApproved', 'RERA Approved'), color: 'text-success-600' },
    { icon: Building2, label: t('home.verifiedBuilders', 'Verified Builders'), color: 'text-primary-600' },
    { icon: Users, label: t('home.verifiedAgents', 'Verified Agents'), color: 'text-secondary-500' },
    { icon: Zap, label: t('home.aiVerifiedListings', 'AI Verified Listings'), color: 'text-warning-500' },
    { icon: Shield, label: t('home.hundredPercentSecure', '100% Secure'), color: 'text-primary-600' },
  ];
  return (
    <section className="border-b border-navy-100 bg-white py-6">
      <div className="container-wide">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <motion.div
              key={b.label}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2.5 rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3"
            >
              <b.icon className={cn('h-5 w-5 shrink-0', b.color)} />
              <span className="text-xs font-semibold text-navy-700">{b.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Dynamic AI Advertisement Banner Section (Home Page)
============================================================ */
/* ============================================================
   Property Categories
============================================================ */
const CATEGORIES = [
  { name: 'Apartment', icon: Building2, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Villa', icon: Home, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Independent House', icon: KeyRound, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Commercial Office', icon: Briefcase, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Retail Shop', icon: Store, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Warehouse', icon: Warehouse, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Plots', icon: LandPlot, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
  { name: 'Co-working', icon: Users, color: 'bg-[#fff0f3] text-[#e11d48] border border-red-100/80 group-hover:bg-[#e11d48] group-hover:text-white' },
];

function CategoriesSection() {
  const { t } = useLanguageContext();
  const categoryNames: Record<string, string> = {
    Apartment: t('property.typeApartment', 'Apartment'),
    Villa: t('property.typeVilla', 'Villa'),
    'Independent House': t('property.typeHouse', 'Independent House'),
    'Commercial Office': t('property.typeOffice', 'Commercial Office'),
    'Retail Shop': t('property.typeShop', 'Retail Shop'),
    Warehouse: t('property.typeWarehouse', 'Warehouse'),
    Plots: t('property.typePlots', 'Plots'),
    'Co-working': t('property.typeCoworking', 'Co-working'),
  };

  return (
    <SectionShell
      title={t('home.browseCategory', 'Browse by Category')}
      subtitle={t('home.categorySubtitle', "Find exactly what you're looking for")}
      id="categories"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <Link
              to={`/search?type=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 transition shadow-sm hover:shadow-md hover:border-red-300"
            >
              <div
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-xl transition group-hover:scale-110',
                  cat.color,
                )}
              >
                <cat.icon className="h-5 w-5" />
              </div>
              <span className="text-center text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
                {categoryNames[cat.name] ?? cat.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ============================================================
   Featured Properties
============================================================ */
function SponsoredPropertiesCarousel() {
  const { t } = useLanguageContext();
  const { cityId } = useLocationContext();

  const { data } = useQuery({
    queryKey: ['home-sponsored-properties', cityId],
    queryFn: async () => {
      // Over-fetch candidate ids so there's enough to work with after city-scoping below.
      const { data: campaignRows } = await supabase.rpc('fn_get_active_sponsored_property_ids', { p_limit: 20 });
      const ids = ((campaignRows ?? []) as { property_id: string }[]).map((r) => r.property_id);

      if (ids.length > 0) {
        const { data: propertyRows } = await supabase.from('v_properties_search').select('*').in('id', ids);
        const byId = new Map((propertyRows ?? []).map((p) => [p.id, p]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
        // Prefer campaigns for the detected city; widen back to all cities if none match there.
        const scoped = cityId ? ordered.filter((p) => p.city_id === cityId) : ordered;
        const picked = (scoped.length > 0 ? scoped : ordered).slice(0, 6);
        if (picked.length > 0) return picked.map((p) => ({ ...p, _isPaidCampaign: true }));
      }

      // No active paid campaigns — fall back to admin-marked Featured properties,
      // scoped to the detected city when we have one (widen if that's empty).
      const fetchFeatured = async (scopeToCity: boolean) => {
        let q = supabase
          .from('v_properties_search')
          .select('*')
          .or('status.eq.published,is_live.eq.true')
          .eq('is_featured', true);
        if (scopeToCity && cityId) q = q.eq('city_id', cityId);
        const { data } = await q.order('created_at', { ascending: false }).limit(6);
        return data ?? [];
      };

      let featuredRows = await fetchFeatured(true);
      if (featuredRows.length === 0 && cityId) {
        featuredRows = await fetchFeatured(false);
      }
      return featuredRows.map((p) => ({ ...p, _isPaidCampaign: false }));
    },
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'start', loop: true, containScroll: 'trimSnaps' },
    [Autoplay({ delay: 4500, stopOnInteraction: true, stopOnMouseEnter: true })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!data || data.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-white" id="sponsored-properties">
      <div className="container-wide">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {t('home.sponsoredTitle', 'Featured Properties')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t('home.sponsoredSubtitle', 'Handpicked listings for maximum visibility')}
            </p>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            {t('common.viewAll', 'View All')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {data.slice(0, 6).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="relative min-w-0 flex-[0_0_82%] sm:flex-[0_0_calc(50%-8px)] lg:flex-[0_0_calc(25%-12px)] xl:flex-[0_0_calc(20%-13px)]"
                >
                  <HomePropertyCard
                    property={p}
                    badge={{
                      label: p._isPaidCampaign ? 'Sponsored' : 'Featured',
                      className: p._isPaidCampaign ? 'bg-amber-500' : 'bg-red-600',
                      icon: <Zap className="h-2.5 w-2.5" />,
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {data.length > 4 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-[-16px] top-[35%] -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:scale-105 hover:text-red-600"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-[-16px] top-[35%] -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:scale-105 hover:text-red-600"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            {data.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi && emblaApi.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === selectedIndex ? 'w-6 bg-red-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Top Localities in Hyderabad
============================================================ */
const HYDERABAD_RICH_AREAS = [
  { name: 'Jubilee Hills', image: '/localities/villas.png' },
  { name: 'Banjara Hills', image: '/localities/apartments.png' },
  { name: 'Gachibowli', image: '/localities/skyscrapers.png' },
  { name: 'Hitech City', image: '/localities/hitech_city.png' },
  { name: 'Madhapur', image: '/localities/cable_bridge.png' },
  { name: 'Kondapur', image: '/localities/buddha_statue.png' },
  { name: 'Kokapet', image: '/localities/charminar.png' },
  { name: 'Financial Dist', image: '/localities/golconda.png' },
];

function ExploreHyderabad() {
  const activeCityName = 'Hyderabad';

  return (
    <SectionShell
      title="Explore in Hyderabad"
      subtitle="Discover premium properties across Hyderabad's richest localities"
      id="cities"
    >
      <div className="flex items-center justify-end -mt-10 mb-4 sm:-mt-12">
        <Link
          to="/hyderabad-localities"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 sm:gap-6 lg:grid-cols-8">
        {HYDERABAD_RICH_AREAS.map((locality, i) => (
          <motion.div
            key={locality.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/search?city=${encodeURIComponent(activeCityName)}&locality=${encodeURIComponent(locality.name)}`}
              className="group flex flex-col items-center gap-3 text-center"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-navy-50 shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-red-500/20 sm:h-24 sm:w-24">
                <img
                  src={locality.image}
                  alt={locality.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-navy-900/10 transition-colors group-hover:bg-transparent" />
              </div>
              <p className="font-display text-[11px] font-bold leading-tight text-navy-800 transition-colors group-hover:text-red-600 sm:text-xs">
                {locality.name}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ============================================================
   AI Features Showcase (Ultra Professional 4-Category Layout)
============================================================ */
const AI_CATEGORIES = [
  {
    category: 'Property Discovery',
    subtitle: 'Find the right property with AI in seconds',
    headerIcon: Search,
    headerColor: 'bg-rose-50 text-rose-500',
    items: [
      {
        title: 'AI Property Search',
        desc: 'Search properties naturally using everyday language.',
        icon: Search,
        bg: 'bg-rose-50 text-rose-500',
      },
      {
        title: 'AI Recommendations',
        desc: 'Personalized property suggestions just for you.',
        icon: Sparkles,
        bg: 'bg-purple-50 text-purple-600',
      },
      {
        title: 'AI Property Comparison',
        desc: 'Compare multiple properties side by side instantly.',
        icon: GitCompare,
        bg: 'bg-sky-50 text-sky-600',
      },
    ],
  },
  {
    category: 'Investment Intelligence',
    subtitle: 'Make smarter investment decisions',
    headerIcon: TrendingUp,
    headerColor: 'bg-emerald-50 text-emerald-600',
    items: [
      {
        title: 'AI Price Prediction',
        desc: 'Predict future property prices with advanced AI models.',
        icon: TrendingUp,
        bg: 'bg-emerald-50 text-emerald-600',
      },
      {
        title: 'AI Rental Yield',
        desc: 'Calculate rental returns and cash flow instantly.',
        icon: Calculator,
        bg: 'bg-amber-50 text-amber-600',
      },
      {
        title: 'AI Market Insights',
        desc: 'Get real-time market trends and investment insights.',
        icon: BarChart3,
        bg: 'bg-fuchsia-50 text-fuchsia-600',
      },
    ],
  },
  {
    category: 'Legal & Finance',
    subtitle: 'Secure and transparent real estate transactions',
    headerIcon: ShieldCheck,
    headerColor: 'bg-indigo-50 text-indigo-600',
    items: [
      {
        title: 'AI Legal Assistant',
        desc: 'Get legal guidance and document insights.',
        icon: Scale,
        bg: 'bg-purple-50 text-purple-600',
      },
      {
        title: 'AI Loan Assistant',
        desc: 'Find the best home loan options for you.',
        icon: Wallet,
        bg: 'bg-teal-50 text-teal-600',
      },
      {
        title: 'AI Fraud Detection',
        desc: 'Detect risky listings and fraudulent activities.',
        icon: Shield,
        bg: 'bg-rose-50 text-rose-600',
      },
    ],
  },
  {
    category: 'Smart Services',
    subtitle: 'AI tools to make your journey effortless',
    headerIcon: Bot,
    headerColor: 'bg-blue-50 text-blue-600',
    items: [
      {
        title: 'AI Chat Assistant',
        desc: '24/7 AI-powered answers to all your queries.',
        icon: MessageCircle,
        bg: 'bg-sky-50 text-sky-600',
      },
      {
        title: 'AI Builder Score',
        desc: 'Check builder credibility and project trust score.',
        icon: Award,
        bg: 'bg-amber-50 text-amber-600',
      },
      {
        title: 'AI Neighborhood Analysis',
        desc: 'Analyze locality, lifestyle and future growth.',
        icon: MapPin,
        bg: 'bg-emerald-50 text-emerald-600',
      },
    ],
  },
];

function AIFeaturesSection() {
  const { t } = useLanguageContext();

  const aiServices = [
    {
      title: t('home.aiSearchTitle', 'AI Property Search'),
      desc: t('home.aiSearchDesc', 'Natural language property search'),
      tab: 'smart-search',
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/30',
      bg: 'bg-rose-50',
      icon: Search,
    },
    {
      title: t('home.aiRecommendationsTitle', 'AI Recommendations'),
      desc: t('home.aiRecommendationsDesc', 'Personalized property picks'),
      tab: 'recommendations',
      gradient: 'from-violet-500 to-purple-600',
      shadow: 'shadow-violet-500/30',
      bg: 'bg-violet-50',
      icon: Sparkles,
    },
    {
      title: t('home.aiComparisonTitle', 'Property Comparison'),
      desc: t('home.aiComparisonDesc', 'Side-by-side AI comparison'),
      tab: 'assistant',
      gradient: 'from-sky-500 to-blue-600',
      shadow: 'shadow-sky-500/30',
      bg: 'bg-sky-50',
      icon: GitCompare,
    },
    {
      title: t('home.aiChatAssistantTitle', 'AI Chat Assistant'),
      desc: t('home.aiChatAssistantDesc', '24/7 AI-powered answers'),
      tab: 'assistant',
      gradient: 'from-cyan-500 to-teal-600',
      shadow: 'shadow-cyan-500/30',
      bg: 'bg-cyan-50',
      icon: MessageCircle,
    },
    {
      title: t('home.aiBuilderScoreTitle', 'Builder Score'),
      desc: t('home.aiBuilderScoreDesc', 'Builder credibility check'),
      tab: 'market',
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/30',
      bg: 'bg-amber-50',
      icon: Award,
    },
    {
      title: t('home.aiNeighborhoodTitle', 'Neighborhood AI'),
      desc: t('home.aiNeighborhoodDesc', 'Locality & lifestyle analysis'),
      tab: 'market',
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
      bg: 'bg-emerald-50',
      icon: MapPin,
    },
  ];

  const categories = [
    {
      category: t('home.smartServicesCategory', 'Smart Services'),
      subtitle: t('home.smartServicesSubtitle', 'AI tools to make your journey effortless'),
      headerIcon: Bot,
      headerColor: 'bg-blue-50 text-blue-600',
      items: [
        {
          title: t('home.aiChatAssistantTitle', 'AI Chat Assistant'),
          desc: t('home.aiChatAssistantDesc', '24/7 AI-powered answers to all your queries.'),
          icon: MessageCircle,
          bg: 'bg-sky-50 text-sky-600',
          tab: 'assistant',
        },
        {
          title: t('home.aiBuilderScoreTitle', 'AI Builder Score'),
          desc: t('home.aiBuilderScoreDesc', 'Check builder credibility and project trust score.'),
          icon: Award,
          bg: 'bg-amber-50 text-amber-600',
          tab: 'market',
        },
        {
          title: t('home.aiNeighborhoodTitle', 'AI Neighborhood Analysis'),
          desc: t('home.aiNeighborhoodDesc', 'Analyze locality, lifestyle and future growth.'),
          icon: MapPin,
          bg: 'bg-emerald-50 text-emerald-600',
          tab: 'market',
        },
      ],
    },
  ];

  return (
    <>
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-wide">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('home.aiServices', 'AI-Powered Services')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('home.aiServicesSubtitle', 'Explore all AI tools to find, compare and invest smarter')}
              </p>
            </div>
            <Link
              to="/ai-hub"
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 group transition-colors"
            >
              <span>{t('common.viewAll', 'View All')}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Single-Row 6 Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {aiServices.map((svc, i) => (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <Link
                  to={`/ai-hub?tab=${svc.tab}`}
                  className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all group cursor-pointer h-full"
                >
                  {/* 3D-style gradient icon badge */}
                  <div
                    className={`relative h-14 w-14 rounded-2xl bg-gradient-to-br ${svc.gradient} flex items-center justify-center shadow-xl ${svc.shadow} group-hover:scale-110 transition-transform duration-300`}
                    style={{ transform: 'perspective(200px) rotateX(8deg) rotateY(-4deg)' }}
                  >
                    {/* Glossy highlight */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent" />
                    <svc.icon className="h-6 w-6 text-white relative z-10 drop-shadow-sm" />
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-800 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                      {svc.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2 hidden sm:block">
                      {svc.desc}
                    </p>
                  </div>

                  <span className="text-[11px] font-bold text-red-600 group-hover:gap-1.5 flex items-center gap-1 transition-all">
                    Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50/60 border-y border-slate-100">
        <div className="container-wide">
          <div className="space-y-12">
            {categories.map((cat, catIdx) => (
              <div key={cat.category} className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn('h-10 w-10 rounded-full flex items-center justify-center shadow-sm', cat.headerColor)}
                    >
                      <cat.headerIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-slate-900 tracking-tight">{cat.category}</h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{cat.subtitle}</p>
                    </div>
                  </div>
                  <Link
                    to="/ai-hub"
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 group transition-colors cursor-pointer"
                  >
                    <span>{t('common.viewAll', 'View All')}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                {/* 3 Grid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {cat.items.map((item, itemIdx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (catIdx * 3 + itemIdx) * 0.04 }}
                      whileHover={{ y: -4 }}
                      className="block"
                    >
                      <Link
                        to={`/ai-hub?tab=${item.tab}`}
                        className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm hover:shadow-md transition-all flex items-start gap-4 cursor-pointer group h-full"
                      >
                        <div
                          className={cn(
                            'h-13 w-13 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                            item.bg,
                          )}
                        >
                          <item.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-bold text-slate-900 text-base leading-snug">{item.title}</h4>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">{item.desc}</p>
                          <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-600 group-hover:text-red-700">
                            <span>{t('common.explore', 'Explore')}</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ============================================================
   Signature Collection (Luxury)
============================================================ */
function SignatureCollection() {
  const { t } = useLanguageContext();
  const { cityId } = useLocationContext();
  const { data } = useQuery({
    queryKey: ['home-luxury', cityId],
    queryFn: async () => {
      // Scope to the detected city when we have one; if that comes back empty
      // (e.g. little luxury inventory yet in that city), widen to all cities
      // so the homepage never looks empty.
      const fetchLuxury = async (scopeToCity: boolean) => {
        let q = supabase
          .from('properties')
          .select('*, cities(name), localities(name), property_types(name)')
          .eq('status', 'published')
          .eq('is_luxury', true);
        if (scopeToCity && cityId) q = q.eq('city_id', cityId);
        const { data } = await q.order('price', { ascending: false }).limit(9);
        return data ?? [];
      };

      let rows = await fetchLuxury(true);
      if (rows.length === 0 && cityId) {
        rows = await fetchLuxury(false);
      }

      return rows.map((p) => {
        const r = p as unknown as {
          cities?: { name: string };
          localities?: { name: string };
          property_types?: { name: string };
        };
        return {
          ...p,
          city_name: r.cities?.name ?? null,
          locality_name: r.localities?.name ?? null,
          property_type_name: r.property_types?.name ?? null,
        };
      });
    },
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: 'start', loop: true, containScroll: 'trimSnaps' },
    [Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!data || data.length === 0) return null;

  return (
    <section className="mt-4 mb-8 sm:mt-6 sm:mb-12 w-full bg-[#F8FAFC] py-8 lg:py-12 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-[#F8FAFC] opacity-80 pointer-events-none" />
      
      <div className="container-wide relative z-10">
        
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Signature Collection
            </h2>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              Ultra Luxury Homes for the Discerning Buyer
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link 
              to="/search?is_luxury=true" 
              className="group flex items-center gap-2 text-base font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              Explore All 
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/* Carousel Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative"
        >
          {/* Embla Viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {data.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="relative min-w-0 flex-[0_0_82%] sm:flex-[0_0_calc(50%-8px)] lg:flex-[0_0_calc(25%-12px)] xl:flex-[0_0_calc(20%-13px)]"
                >
                  <HomePropertyCard
                    property={p}
                    badge={{
                      label: 'Signature',
                      className: 'bg-black/60',
                      icon: <Sparkles className="h-2.5 w-2.5" />,
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          {data.length > 4 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-[-16px] top-[35%] -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:bg-slate-50 hover:text-red-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-100"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                onClick={scrollNext}
                className="absolute right-[-16px] top-[35%] -translate-y-1/2 z-20 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:bg-slate-50 hover:text-red-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-100"
                aria-label="Next slide"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Pagination Dots */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {data.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi && emblaApi.scrollTo(i)}
                className={`h-2 transition-all duration-300 rounded-full ${i === selectedIndex ? 'w-8 bg-red-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Top Builders
============================================================ */
function TopBuilders() {
  const { t } = useLanguageContext();
  const { data: builders } = useQuery({
    queryKey: ['home-builders'],
    queryFn: async () => {
      const { data } = await supabase.from('builders').select('*').limit(6);
      return data ?? [];
    },
  });
  if (!builders || builders.length === 0) return null;

  return (
    <SectionShell
      title={t('home.topBuilders', 'Top Builders')}
      subtitle={t('home.trustedDevelopers', "Hyderabad's most trusted developers")}
      id="builders"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {builders.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -5 }}
            className="card-premium flex items-center gap-4 p-5 hover:shadow-cardHover"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-navy-900 truncate">{b.name}</p>
              {b.established_year && (
                <p className="text-xs text-navy-500">
                  {t('home.since', 'Since')} {b.established_year}
                </p>
              )}
              {b.description && <p className="mt-1 text-sm text-navy-600 line-clamp-1">{b.description}</p>}
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn('h-3.5 w-3.5', s <= 4 ? 'fill-gold-400 text-gold-400' : 'text-navy-200')}
                  />
                ))}
                <span className="ml-1 text-xs text-navy-500">4.0 {t('home.trustScore', 'Trust Score')}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ============================================================
   Top Agents
============================================================ */
function TopAgents() {
  const { t } = useLanguageContext();
  const { data: agents } = useQuery({
    queryKey: ['home-agents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, avatar_url, bio, company, specialization')
        .eq('role', 'agent')
        .eq('status', 'active')
        .limit(8);
      return data ?? [];
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => {};
    }
  }, [agents]);

  if (!agents || agents.length === 0) return null;

  return (
    <section className="py-10 bg-white overflow-hidden" id="agents">
      <div className="container-wide relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {t('home.topAgents', 'Top Agents')}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600 border border-red-100">
                <ShieldCheck className="h-3 w-3" />
                Verified Real Estate Experts
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm">
              {t('home.connectExperts', 'Connect with trusted real estate experts')}
            </p>
          </div>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            View All Agents <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {agents.map((a, i) => {
            const badges = ['TOP RATED', 'RISING STAR', 'EXPERT', 'TOP PERFORMER'];
            const badge = badges[i % badges.length];
            const badgeColors: Record<string, string> = {
              'TOP RATED': 'text-red-600 bg-red-50 border-red-100',
              'RISING STAR': 'text-blue-600 bg-blue-50 border-blue-100',
              'EXPERT': 'text-emerald-600 bg-emerald-50 border-emerald-100',
              'TOP PERFORMER': 'text-amber-600 bg-amber-50 border-amber-100',
            };
            const avatarGrads = [
              'from-red-500 to-rose-600',
              'from-blue-500 to-indigo-600',
              'from-emerald-500 to-teal-600',
              'from-amber-500 to-orange-500',
            ];

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] transition-all p-3.5"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {a.avatar_url ? (
                    <img
                      src={a.avatar_url}
                      alt={(a.first_name ?? '') + ' ' + (a.last_name ?? '')}
                      className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${avatarGrads[i % avatarGrads.length]} text-white flex items-center justify-center text-lg font-bold shadow`}>
                      {a.first_name?.[0] ?? 'A'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="font-display font-bold text-[13px] text-slate-900 leading-tight truncate">
                      {a.first_name} {a.last_name}
                    </h3>
                    <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold border uppercase ${badgeColors[badge]}`}>
                      {badge === 'TOP RATED' && <Star className="h-2 w-2" />}
                      {badge === 'RISING STAR' && <TrendingUp className="h-2 w-2" />}
                      {badge === 'EXPERT' && <ShieldCheck className="h-2 w-2" />}
                      {badge === 'TOP PERFORMER' && <Award className="h-2 w-2" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{a.company || 'Real Estate Agent'}</p>

                  {/* Stars + Stats */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] font-semibold text-slate-600">{100 + i * 15}+ deals</span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] font-semibold text-slate-600">{5 + i}+ yrs</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <a
                      href={"tel:" + (a.phone ?? '')}
                      className="grid h-6 w-6 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                    <a
                      href={"https://wa.me/" + (a.phone ?? '')}
                      className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </a>
                    <Link
                      to={"/agents/" + a.id}
                      className="flex-1 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors text-[10px] font-bold"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   EMI Calculator
============================================================ */
/* ============================================================
   EMI + Testimonials Combined (2-column layout)
============================================================ */
/* ============================================================
   RealtyNow Exclusive Properties (Sponsored Projects & Events)
============================================================ */
function RealtynowExclusiveSection() {
  const { t } = useLanguageContext();
  const { addToast } = useToast();
  const carouselRef = useRef<HTMLDivElement>(null);
  const realtimeTick = useRealtimeCount('cms_exclusive_properties');

  const [enquiryItem, setEnquiryItem] = useState<any | null>(null);
  const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  const { data: exclusiveList = [], isLoading } = useQuery({
    queryKey: ['home-exclusive-properties', realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_exclusive_properties')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return [
          {
            id: 'ex-1',
            title: 'Crystal Garden',
            subtitle: '3 & 4 BHK Luxury Apartment',
            locality: 'Attapur, Hyderabad',
            price_text: 'Starting at ₹1.29 Cr.',
            badge_text: 'Sponsored Project',
            rera_no: 'Phase 1 P02500004287',
            image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
            cta_text: 'Enquire Now',
            cta_link: '/search',
            sort_order: 1,
          },
          {
            id: 'ex-2',
            title: 'Ananda Vihara',
            subtitle: '1 BHK Luxury Service Suite',
            locality: 'Tirupati',
            price_text: 'Price: ₹69 Lakhs Onw.',
            badge_text: 'Vacation Home Ownership',
            rera_no: 'RERA.P10120276492',
            image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
            cta_text: 'Enquire Now',
            cta_link: '/search',
            sort_order: 2,
          },
          {
            id: 'ex-3',
            title: 'Eternia Benchmark',
            subtitle: '7.5 Acres | 2, 2.5 & 3 BHK Homes',
            locality: 'Bachupally, Hyderabad',
            price_text: '₹1.2 Cr* Onwards',
            badge_text: 'New Benchmark',
            rera_no: 'RERA Approved',
            image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
            cta_text: 'Enquire Now',
            cta_link: '/search',
            sort_order: 3,
          },
          {
            id: 'ex-4',
            title: 'DLF Camellias Heights',
            subtitle: '4 & 5 BHK Ultra Luxury Penthouses',
            locality: 'Gachibowli, Hyderabad',
            price_text: '₹3.5 Cr* Onwards',
            badge_text: 'Exclusive Launch',
            rera_no: 'RERA.P02400009821',
            image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
            cta_text: 'Enquire Now',
            cta_link: '/search',
            sort_order: 4,
          },
        ];
      }
      return data;
    },
  });

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = 380;
    carouselRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEnquiry(true);
    try {
      await supabase.from('crm_leads').insert([
        {
          full_name: enquiryForm.name,
          phone: enquiryForm.phone,
          email: enquiryForm.email,
          notes: `Enquiry for Exclusive Project: ${enquiryItem?.title} (${enquiryItem?.locality}) - ${enquiryForm.message}`,
          source: 'realtynow_exclusive_cms',
          status: 'new',
        },
      ]);
    } catch {
      // Local fallback success
    } finally {
      setSubmittingEnquiry(false);
      addToast('success', `Enquiry sent for ${enquiryItem?.title}! Our relationship manager will contact you shortly.`);
      setEnquiryItem(null);
      setEnquiryForm({ name: '', phone: '', email: '', message: '' });
    }
  };

  return (
    <section className="py-14 bg-slate-50/70 border-t border-b border-slate-200/80" id="exclusive">
      <div className="container-wide">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-700">
                <Sparkles className="h-3.5 w-3.5 fill-red-600 text-red-600" /> Featured
              </span>
              <span className="text-xs font-semibold text-slate-500">Curated & Verified Projects</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
              RealtyNow Exclusive
            </h2>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              Sponsored projects, premium launches, and exclusive builder events
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              aria-label="Previous Project"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Next Project"
              className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs transition hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel / Cards Row */}
        {isLoading ? (
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[280px] w-[360px] shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
          >
            {exclusiveList.map((item: any, idx: number) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                className="group relative h-[310px] w-[340px] sm:w-[380px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-md hover:shadow-xl transition-all duration-300 snap-start flex flex-col justify-between"
              >
                {/* Background Image */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/40" />

                {/* Top Header Bar */}
                <div className="relative z-10 flex items-start justify-between p-4">
                  <span className="rounded-lg bg-red-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
                    {item.badge_text || 'Exclusive'}
                  </span>
                  {item.rera_no && (
                    <span className="rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-slate-200 border border-white/10">
                      {item.rera_no}
                    </span>
                  )}
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-10 p-5 space-y-2 text-white">
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-white tracking-tight leading-tight group-hover:text-red-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{item.locality}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/15">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Price</p>
                      <p className="font-display text-base font-extrabold text-amber-400">
                        {item.price_text}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnquiryItem(item)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{item.cta_text || 'Enquire Now'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ENQUIRY MODAL */}
      <AnimatePresence>
        {enquiryItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                    Exclusive Project Enquiry
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{enquiryItem.title}</h3>
                  <p className="text-xs text-slate-500">{enquiryItem.locality} • {enquiryItem.price_text}</p>
                </div>
                <button
                  onClick={() => setEnquiryItem(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendEnquiry} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your name"
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message / Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="I am interested in floor plans, pricing & site visit..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEnquiryItem(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEnquiry}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-600/20 cursor-pointer"
                  >
                    {submittingEnquiry ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ============================================================
   Latest Blogs
============================================================ */
function LatestBlogs() {
  const { t } = useLanguageContext();
  const realtimeTick = useRealtimeCount('blogs');
  const { data, isLoading } = useQuery({
    queryKey: ['home-blogs', realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('blogs')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <SectionShell
      title={t('home.latestFromBlog', 'Latest from our Blog')}
      subtitle={t('home.blogSubtitle', 'Guides, tips, and market insights')}
      id="blogs"
      action={
        <Link
          to="/blog"
          className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          {t('common.allPosts', 'All posts')} <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-2xl" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-3">
          {data.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/blog/${b.slug}`}
                className="group block overflow-hidden rounded-2xl border border-navy-100 bg-white transition hover:shadow-cardHover"
              >
                {b.cover_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={b.cover_image}
                      alt={b.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex gap-1.5">
                    {(b.tags as string[] | null)?.slice(0, 2).map((tag) => (
                      <span key={tag} className="badge-blue">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-2 font-display font-bold text-navy-900 line-clamp-2 group-hover:text-primary-700">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-navy-600 line-clamp-2">{b.excerpt}</p>
                  <p className="mt-3 text-xs text-navy-400">
                    {new Date(b.published_at ?? b.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-navy-400">{t('home.noBlogsYet', 'No blog posts yet.')}</p>
      )}
    </SectionShell>
  );
}

/* ============================================================
   Property Services
============================================================ */
const SERVICES = [
  {
    icon: Wallet,
    name: 'Home Loan Assistance',
    brand: 'Bank Partners',
    link: '/contact?service=Home+Loan+Assistance',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    icon: Ruler,
    name: 'Architecture & Design',
    brand: 'Certified Experts',
    link: '/contact?service=Architecture',
    color: 'bg-success-50 text-success-600',
  },
  {
    icon: Scale,
    name: 'Legal Services',
    brand: 'Legal Desk',
    link: '/contact?service=Legal+Services',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    icon: FileText,
    name: 'Property Registration',
    brand: 'Govt Assistance',
    link: '/contact?service=Property+Registration',
    color: 'bg-secondary-50 text-secondary-600',
  },
  {
    icon: Sun,
    name: 'Solar Installation',
    brand: 'Green Energy',
    link: '/contact?service=Solar+Installation',
    color: 'bg-success-50 text-success-600',
  },
  {
    icon: Shield,
    name: 'Home Insurance',
    brand: 'Protection Plan',
    link: '/contact?service=Home+Insurance',
    color: 'bg-warning-50 text-warning-600',
  },
  {
    icon: Truck,
    name: 'Packers & Movers',
    brand: 'Relocation Services',
    link: '/contact?service=Packers+and+Movers',
    color: 'bg-primary-50 text-primary-600',
  },
  {
    icon: Building2,
    name: 'Property Valuation',
    brand: 'Verified Assessors',
    link: '/contact?service=Property+Valuation',
    color: 'bg-secondary-50 text-secondary-600',
  },
];

/* ============================================================
   Enhanced Services — 4 Premium Cards matching exact UI design
============================================================ */
const ENHANCED_SERVICES = [
  {
    id: 'home-services',
    title: 'Home Services',
    description: 'Professional care for your home, every day.',
    icon: Home,
    image: homeServicesImg,
    link: 'https://kamkaka.com',
    cta: 'Explore Now',
  },
  {
    id: 'interior-services',
    title: 'Interior Services',
    description: 'Designing beautiful spaces that reflect you.',
    icon: PaintBucket,
    image: interiorServicesImg,
    link: 'https://borninteriors.in',
    cta: 'Explore Now',
  },
  {
    id: 'borewell-services',
    title: 'Borewell Services',
    description: 'Deep expertise. Reliable water solutions.',
    icon: Droplets,
    image: borewellServicesImg,
    link: '/borewell-services',
    cta: 'Explore Now',
  },
  {
    id: 'home-loans',
    title: 'Home Loans',
    description: 'Easy financing for your dream home.',
    icon: PieChart,
    image: homeLoansImg,
    link: '/home-loans',
    cta: 'Explore Now',
  },
] as const;

function ServiceCard({ service }: { service: (typeof ENHANCED_SERVICES)[number] }) {
  const Icon = service.icon;
  const isExternal = /^https?:\/\//.test(service.link);

  const content = (
    <div className="group flex flex-row overflow-hidden rounded-[20px] bg-white shadow-sm hover:shadow-xl transition-all duration-300 h-[135px] w-full border border-slate-100">
      {/* Left side: 40% Background Image */}
      <div className="w-[40%] h-full relative overflow-hidden shrink-0">
        <img
          src={service.image}
          alt={service.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>

      {/* Right side: 60% White Content */}
      <div className="w-[60%] h-full bg-white p-3 flex flex-col justify-between items-start">
        {/* Top: Icon + Title + Verified */}
        <div className="flex gap-2 sm:gap-2.5 items-center w-full">
          {/* Icon Box */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#fff0f3] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#e11d48] stroke-[2]" />
          </div>

          {/* Title and Badge */}
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 text-[12px] sm:text-[13px] leading-tight tracking-tight truncate">
              {service.title}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-slate-500 text-[8.5px] font-bold uppercase tracking-wider whitespace-nowrap">Verified Service</span>
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#1d9bf0] text-white shrink-0">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-[9px] sm:text-[10px] text-slate-500 line-clamp-2 leading-snug w-full mt-1 mb-1">
          {service.description}
        </p>

        {/* Bottom: Button - Small and Cute */}
        <div className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[#e11d48] px-3 py-1.5 text-white transition-colors hover:bg-red-700 mt-auto">
          <span className="text-[11px] font-bold tracking-wide">{service.cta || 'Explore Now'}</span>
          <div className="rounded-full border-[1.5px] border-white flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <ArrowRight className="h-2 w-2 text-white stroke-[3]" />
          </div>
        </div>
      </div>
    </div>
  );

  return isExternal ? (
    <a href={service.link} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
      {content}
    </a>
  ) : (
    <Link to={service.link} className="block h-full w-full">
      {content}
    </Link>
  );
}


function ServicesSection() {
  const { t } = useLanguageContext();
  return (
    <section className="relative overflow-hidden py-10 sm:py-14 bg-gradient-to-b from-white to-slate-50" id="services">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-red-100/60 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.08) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="container-wide relative z-10 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-700">
              <Home className="h-3.5 w-3.5" /> {t('home.exploreMore', 'Explore More')}
            </span>
            <span className="text-xs font-semibold text-slate-500">Curated &amp; Verified Services</span>
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
            {t('home.beyondProperty', 'Beyond Property.')}{' '}
            <span className="text-red-600">{t('home.enhanceLiving', 'We Enhance Your Living.')}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600 font-medium">
            {t(
              'home.servicesDescription',
              'Discover premium services to complete your dream home experience with trusted professionals.',
            )}
          </p>
        </div>

        {/* Single Row — Responsive Grid on Desktop / Smooth Scroll on Mobile */}
        <div className="flex flex-nowrap lg:grid lg:grid-cols-4 overflow-x-auto gap-3 lg:gap-4 pb-3 pt-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {ENHANCED_SERVICES.map((service, i) => (
            <motion.div
              key={service.id}
              id={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex-1 min-w-[220px] lg:min-w-0 shrink-0 lg:shrink"
            >
              <ServiceCard service={service} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Interior Design & Home Services — Merged into ServicesSection
============================================================ */
// This section has been merged into the unified ServicesSection above
// Keeping component for backwards compatibility
function InteriorAndHomeServicesSection() {
  return null; // Functionality merged into ServicesSection
}

/* ============================================================
   App CTA
============================================================ */
function AppCTA() {
  return <AppShowcase />;
}

/* ============================================================
   Partners
============================================================ */
function PartnersSection() {
  const { t } = useLanguageContext();
  
  const partners = [
    { name: 'HDFC', logo: '/partners/hdfc.svg' },
    { name: 'SBI', logo: '/partners/sbi.svg' },
    { name: 'ICICI', logo: '/partners/icici.svg' },
    { name: 'Axis', logo: '/partners/axis.svg' },
    { name: 'LIC', logo: '/partners/lic.svg' },
    { name: 'Bajaj Finserv', logo: '/partners/bajaj.svg' },
    { name: 'Kotak', logo: '/partners/kotak.svg' },
    { name: 'Yes Bank', logo: '/partners/yesbank.svg' },
  ];

  // Triple the array to ensure smooth infinite scrolling
  const marqueeItems = [...partners, ...partners, ...partners];

  return (
    <section className="border-y border-navy-100 bg-white py-12 overflow-hidden">
      <div className="container-wide">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-navy-400">
          {t('home.bankingPartners', 'Our Banking & Insurance Partners')}
        </p>
        
        {/* Marquee Container */}
        <div className="mt-10 relative flex overflow-hidden">
          {/* Gradient Masks for smooth fade at edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

          <motion.div
            className="flex items-center gap-24"
            animate={{ x: ['0%', '-33.333333%'] }}
            transition={{ 
              duration: 25, 
              ease: 'linear', 
              repeat: Infinity 
            }}
          >
            {marqueeItems.map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex-shrink-0 w-48 flex justify-center">
                <img 
                  src={p.logo} 
                  alt={p.name} 
                  className="h-16 w-auto object-contain hover:scale-110 transition-transform duration-300" 
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA
============================================================ */
function FinalCTA() {
  const { t } = useLanguageContext();
  return (
    <section className="py-20">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-4xl bg-red-gradient px-6 py-16 text-center"
        >
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            {t('home.readyToFind', 'Ready to Find Your Dream Property?')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            {t(
              'home.joinThousands',
              "Join thousands of satisfied customers who found their perfect home with RealtyNow's AI-powered platform.",
            )}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="btn rounded-xl bg-white px-6 py-3.5 text-base text-secondary-600 hover:bg-white/90"
            >
              {t('common.getStartedFree', 'Get Started Free')} <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/portal/list-property"
              className="btn rounded-xl glass-card px-6 py-3.5 text-base text-white hover:bg-white/20"
            >
              {t('forms.postProperty', 'Post a Property')}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Section Shell (reusable wrapper)
============================================================ */
function SectionShell({
  title,
  subtitle,
  children,
  id,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="py-8 sm:py-10" id={id}>
      <div className="container-wide">
        <div className="mb-5 sm:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight"
            >
              {title}
            </motion.h2>
            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-1 text-xs sm:text-sm text-slate-500"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   Luxury Paid Ad Banners (2 Column)
============================================================ */
function LuxuryAdBannersSection() {
  const { t } = useLanguageContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const banners = [
    {
      id: 'luxury-ad-1',
      title: 'Ultra-Luxury Penthouses in South Mumbai',
      subtitle: 'Starting from ₹15 Cr',
      cta: 'View Collection',
      image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
      link: '/search?type=Penthouse',
      tag: 'Sponsored',
    },
    {
      id: 'luxury-ad-2',
      title: 'Premium Golf Course Villas in Gurugram',
      subtitle: 'Limited Edition Estates',
      cta: 'Explore Villas',
      image: 'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg',
      link: '/search?type=Villa',
      tag: 'Exclusive',
    },
    {
      id: 'luxury-ad-3',
      title: 'Sea-Facing Mansions in Goa',
      subtitle: 'Private Beach Access',
      cta: 'Discover More',
      image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
      link: '/search?type=Mansion',
      tag: 'Premium',
    },
    {
      id: 'luxury-ad-4',
      title: 'Modern High-Rise Apartments in Bengaluru',
      subtitle: 'Smart Homes & Helipad',
      cta: 'View Apartments',
      image: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg',
      link: '/search?type=Apartment',
      tag: 'Trending',
    }
  ];

  // Auto scroll effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      const isMobile = window.innerWidth < 768;
      // Item width is container width / 2 on desktop, or container width on mobile
      const itemWidth = isMobile ? el.clientWidth : (el.clientWidth / 2);
      const maxScroll = el.scrollWidth - el.clientWidth;
      
      let targetScroll = el.scrollLeft + itemWidth;
      
      // If we've reached or passed the max scroll, reset to 0
      if (targetScroll > maxScroll + 10) {
        targetScroll = 0;
      }
      
      el.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (!scrollRef.current) return;
    const itemWidth = window.innerWidth < 768 ? scrollRef.current.clientWidth : (scrollRef.current.clientWidth / 2);
    scrollRef.current.scrollBy({ left: itemWidth, behavior: 'smooth' });
  };
  
  const handlePrev = () => {
    if (!scrollRef.current) return;
    const itemWidth = window.innerWidth < 768 ? scrollRef.current.clientWidth : (scrollRef.current.clientWidth / 2);
    scrollRef.current.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  };

  return (
    <section className="py-8 bg-slate-50/50">
      <div className="container-wide relative group/section">
        
        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/80 text-slate-800 backdrop-blur-md shadow-lg border border-slate-200 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/section:opacity-100 scale-90 group-hover/section:scale-100 cursor-pointer hidden sm:grid"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <button
          onClick={handleNext}
          className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-20 grid h-12 w-12 place-items-center rounded-full bg-white/80 text-slate-800 backdrop-blur-md shadow-lg border border-slate-200 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/section:opacity-100 scale-90 group-hover/section:scale-100 cursor-pointer hidden sm:grid"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {banners.map((ad, i) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-3xl h-[320px] shadow-xl group block border border-slate-200/60 shrink-0 w-[calc(100%-8px)] md:w-[calc(50%-12px)] snap-start"
            >
              <img
                src={ad.image}
                alt={ad.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute top-4 left-4">
                <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md">
                  {ad.tag}
                </span>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-2 z-10">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight drop-shadow-md">
                  {ad.title}
                </h3>
                <p className="text-sm font-semibold text-amber-400 drop-shadow-md">
                  {ad.subtitle}
                </p>
                <Link
                  to={ad.link}
                  className="mt-2 inline-flex items-center gap-2 bg-white/20 hover:bg-red-600 text-white backdrop-blur-md border border-white/40 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xl hover:scale-105"
                >
                  {ad.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Three Column Paid Ad Banners
============================================================ */
function ThreeColumnAdBannersSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const banners = [
    {
      id: 'paid-ad-1',
      title: 'Smart Homes by TechBuilders',
      subtitle: 'Move-in ready with Alexa',
      cta: 'View Details',
      image: 'https://images.pexels.com/photos/259950/pexels-photo-259950.jpeg',
      link: '/search',
      tag: 'Featured',
    },
    {
      id: 'paid-ad-2',
      title: 'City Center Commercial Spaces',
      subtitle: 'High Footfall Areas',
      cta: 'Explore Spaces',
      image: 'https://images.pexels.com/photos/269077/pexels-photo-269077.jpeg',
      link: '/search',
      tag: 'Ad',
    },
    {
      id: 'paid-ad-3',
      title: 'Lakeview Residential Plots',
      subtitle: 'Build your dream home',
      cta: 'See Plots',
      image: 'https://images.pexels.com/photos/2104152/pexels-photo-2104152.jpeg',
      link: '/search',
      tag: 'Sponsored',
    },
    {
      id: 'paid-ad-4',
      title: 'Luxury Villas in Prime Locations',
      subtitle: 'Zero Brokerage Fees',
      cta: 'View Villas',
      image: 'https://images.pexels.com/photos/208736/pexels-photo-208736.jpeg',
      link: '/search',
      tag: 'Hot Deal',
    }
  ];

  // Auto scroll effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024;
      // Item width is container width / 3 on desktop, /2 on tablet, or container width on mobile
      const itemWidth = isMobile ? el.clientWidth : isTablet ? (el.clientWidth / 2) : (el.clientWidth / 3);
      const maxScroll = el.scrollWidth - el.clientWidth;
      
      let targetScroll = el.scrollLeft + itemWidth;
      
      if (targetScroll > maxScroll + 10) {
        targetScroll = 0;
      }
      
      el.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (!scrollRef.current) return;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    const itemWidth = isMobile ? scrollRef.current.clientWidth : isTablet ? (scrollRef.current.clientWidth / 2) : (scrollRef.current.clientWidth / 3);
    scrollRef.current.scrollBy({ left: itemWidth, behavior: 'smooth' });
  };
  
  const handlePrev = () => {
    if (!scrollRef.current) return;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    const itemWidth = isMobile ? scrollRef.current.clientWidth : isTablet ? (scrollRef.current.clientWidth / 2) : (scrollRef.current.clientWidth / 3);
    scrollRef.current.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  };

  return (
    <section className="py-8 bg-slate-50 border-t border-slate-100">
      <div className="container-wide relative group/section">
        
        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white/80 text-slate-800 backdrop-blur-md shadow-lg border border-slate-200 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/section:opacity-100 scale-90 group-hover/section:scale-100 cursor-pointer hidden sm:grid"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        
        <button
          onClick={handleNext}
          className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white/80 text-slate-800 backdrop-blur-md shadow-lg border border-slate-200 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/section:opacity-100 scale-90 group-hover/section:scale-100 cursor-pointer hidden sm:grid"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {banners.map((ad, i) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-3xl h-[260px] shadow-lg hover:shadow-xl group block border border-slate-200/60 shrink-0 w-[calc(100%-8px)] md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start"
            >
              <img
                src={ad.image}
                alt={ad.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute top-3 left-3">
                <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-sm shadow-sm">
                  {ad.tag}
                </span>
              </div>
              
              <div className="absolute bottom-5 left-5 right-5 flex flex-col items-start gap-1 z-10">
                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-md">
                  {ad.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-amber-300 drop-shadow-md">
                  {ad.subtitle}
                </p>
                <Link
                  to={ad.link}
                  className="mt-2 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white text-white hover:text-red-600 backdrop-blur-md border border-white/40 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:scale-105"
                >
                  {ad.cta} <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Main HomePage
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden rounded-3xl h-[320px] shadow-xl group block border border-slate-200/60 shrink-0 w-[calc(100%-8px)] md:w-[calc(50%-12px)] snap-start"
            >
              <img
                src={ad.image}
                alt={ad.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute top-4 left-4">
                <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md">
                  {ad.tag}
                </span>
              </div>
              
              <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-2 z-10">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight drop-shadow-md">
                  {ad.title}
                </h3>
                <p className="text-sm font-semibold text-amber-400 drop-shadow-md">
                  {ad.subtitle}
                </p>
                <Link
                  to={ad.link}
                  className="mt-2 inline-flex items-center gap-2 bg-white/20 hover:bg-red-600 text-white backdrop-blur-md border border-white/40 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xl hover:scale-105"
                >
                  {ad.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ============================================================
   Main HomePage
============================================================ */
export function HomePage() {
  return (
    <div>
      <HeroSection />
      <AISmartSearch />
      <TrustSection />
      <ServicesSection />
      <CategoriesSection />
      <SponsoredPropertiesCarousel />
      <LuxuryAdBannersSection />
      <ExploreHyderabad />
      <TopAgents />
      <PostPropertyBanner />
      <SignatureCollection />
      <TopBuilders />
      <ThreeColumnAdBannersSection />
      <LatestBlogs />
      <RealtynowExclusiveSection />
      <InteriorAndHomeServicesSection />
      <AppCTA />
      <PartnersSection />
      <FinalCTA />
    </div>
  );
}
