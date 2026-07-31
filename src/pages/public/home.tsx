import React, { useState, useEffect, useRef, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Link, useNavigate } from 'react-router-dom';
import { PostPropertyBanner } from '../../components/post-property-banner';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  Mic,
  Camera,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building2,
  Home,
  Store,
  Warehouse,
  Users,
  User,
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
  Eye,
  CheckCircle2,
  AppWindow,
  Smartphone,
  QrCode,
  Quote,
  ArrowUpRight,
  BarChart3,
  MapPinned,
  Layers,
  Award,
  Clock,
  Newspaper,
  Mail,
  PhoneCall,
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
  Droplets,
  PieChart,
  HeartHandshake,
  Check,
  ZapIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRealtimeCount } from '../../lib/realtime';
import { formatCompactPrice, formatPrice, formatNumber, cn } from '../../lib/utils';
import { PropertyCard } from '../../components/property-card';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { AppShowcase } from '../../components/app-showcase';
import { Card, Button, Badge } from '../../components/ui';
import { DETAILED_BLOGS } from './static';
import type { Advertisement } from '../../lib/types';

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
   AI Smart Search
/* ============================================================
   Hero Section
============================================================ */
function HeroSection() {
  const { t } = useLanguageContext();
  return (
    <section className="relative overflow-hidden bg-white pt-6 pb-12 lg:pt-8 lg:pb-14">
      {/* Background image & gradient mesh overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.jpg"
          alt="RealtyNow Hero Backdrop"
          className="h-full w-full object-cover object-center"
          style={{ objectPosition: '60% center' }}
        />
        {/* Left white fade — keeps text readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent lg:w-[65%] w-full" />
        {/* Subtle top & bottom edge fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/60" />

        {/* Ambient radial glows */}
        <div className="absolute top-1/4 left-10 h-80 w-80 rounded-full bg-rose-400/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl pointer-events-none" />
      </div>

      <div className="container-wide relative z-10">
        <div className="grid items-center gap-8">
          {/* FULL WIDTH HERO TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-2xl text-left"
          >
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/90 px-3.5 py-1 shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-red-600 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                ✨ {t('common.tagline', 'AI-Powered Real Estate Platform')}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              {t('home.heroTitle', 'Find Your Perfect Place to Call Home')}
            </h1>

            {/* Sub Heading */}
            <p className="mt-2.5 text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl">
              {t(
                'home.heroSubtitle',
                'Search thousands of verified properties across India with AI recommendations & instant site visit booking.',
              )}
            </p>

            {/* CTA Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/search"
                className="group rounded-full bg-gradient-to-r from-red-600 via-red-500 to-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <span>{t('common.search', 'Explore Properties')}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
                className="group rounded-full border border-slate-200/90 bg-white/90 hover:bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <Bot className="h-4.5 w-4.5 text-red-600 transition-transform group-hover:scale-110" />
                <span>{t('home.aiAdvisor', 'AI Property Advisor')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   AI Smart Search
============================================================ */
const SEARCH_TABS = ['Buy', 'Rent', 'Commercial', 'Plots', 'Projects'] as const;

function AISmartSearch() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof SEARCH_TABS)[number]>('Buy');
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const examples = [
    '3BHK under 80 Lakhs in Hyderabad',
    'Luxury Villa in Hyderabad',
    'Commercial Office Near Metro',
    'Best Investment Property under 50L',
    'Ready To Move',
    'New Projects',
  ];

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
    if (!query.trim()) return;
    setAiThinking(true);
    try {
      const purpose = tab === 'Rent' ? 'Rent' : 'Sale';
      navigate(`/search?q=${encodeURIComponent(query)}&purpose=${purpose}`);
    } catch {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } finally {
      setAiThinking(false);
    }
  };

  return (
    <div className="container-wide relative z-30 -mt-6 sm:-mt-8">
      <div className="relative flex items-end gap-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="w-full max-w-4xl rounded-[2rem] border border-slate-200/90 bg-white/95 p-3 sm:p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl"
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
                placeholder={`Search by city, locality, project or landmark...`}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 py-3.5 pl-12 pr-32 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all"
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1">
                <button
                  onClick={handleVoice}
                  className={cn('grid h-8 w-8 place-items-center rounded-xl transition-all', listening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-200/60')}
                  title="Voice Search"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition-all hover:bg-slate-200/60"
                  title="Image Search"
                >
                  <Camera className="h-4 w-4" />
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

          {/* AI Suggestion Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1 pt-1 border-t border-slate-100/60">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> POPULAR SEARCHES:
            </span>
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuery(ex)}
                className="rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-0.5 text-xs font-medium text-slate-700 transition-all hover:border-red-300 hover:bg-red-50/80 hover:text-red-700"
              >
                {ex}
              </button>
            ))}
          </div>
        </motion.div>

        {/* AI Robot */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden lg:flex items-end justify-center shrink-0 self-end -mb-2 ml-2"
        >
          <img
            src="/robot.png"
            alt="AI Assistant Robot"
            className="h-52 xl:h-60 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform cursor-pointer mix-blend-multiply"
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
function AIAdBannerSection() {
  const { t } = useLanguageContext();
  const realtimeTick = useRealtimeCount('advertisements');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: ads } = useQuery({
    queryKey: ['home-ad-banners', realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('display_order', { ascending: true });

      const filtered = (data ?? []).filter((a) => {
        if (a.end_date && new Date(a.end_date) < new Date()) return false;
        if (a.ends_at && new Date(a.ends_at) < new Date()) return false;
        return true;
      });

      return filtered as (Advertisement & {
        banner_tags?: string[];
        property_id?: string;
        category_name?: string;
        link_url?: string;
        seo_alt_text?: string;
        image_caption?: string;
      })[];
    },
  });

  const defaultBanners = [
    {
      id: 'demo-banner-1',
      title: 'Monsoon Mega Property Fest 2026',
      subtitle: 'Zero Brokerage on Verified Luxury Apartments & Villas',
      description: 'Get up to 5% instant cashback, free modular kitchen, and zero processing fee on home loans.',
      cta_text: 'Claim Exclusive Offer',
      cta_link: '/search?purpose=Buy',
      image_desktop: 'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1600',
      banner_tags: ['Zero Brokerage', '5% Cashback', 'RERA Approved'],
    },
    {
      id: 'demo-banner-2',
      title: 'Premium Smart Luxury Villas',
      subtitle: 'Exclusive Gated Community with 24/7 AI Security',
      description: 'Enjoy private swimming pool, home automation, and 0% down payment options.',
      cta_text: 'View Luxury Villas',
      cta_link: '/search?type=Villa',
      image_desktop: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1600',
      banner_tags: ['Smart Automation', 'Private Pool', 'Zero Down Payment'],
    },
    {
      id: 'demo-banner-3',
      title: 'Sea-View Penthouses in Mumbai',
      subtitle: 'Iconic Skyline Views | Starts at ₹3.2 Cr',
      description: 'Breathtaking Arabian Sea views, world-class concierge, and smart home features in every unit.',
      cta_text: 'Explore Penthouses',
      cta_link: '/search?type=Penthouse',
      image_desktop: 'https://images.pexels.com/photos/2581922/pexels-photo-2581922.jpeg?auto=compress&cs=tinysrgb&w=1600',
      banner_tags: ['Sea View', 'Premium Amenities', 'Luxury Living'],
    },
    {
      id: 'demo-banner-4',
      title: 'Commercial Workspaces & Tech Parks',
      subtitle: 'Prime Business Locations with High Rental Yields',
      description: 'Invest in GRADE-A commercial spaces with guaranteed 10% annual rental return.',
      cta_text: 'Explore Commercial',
      cta_link: '/search?purpose=Commercial',
      image_desktop: 'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1600',
      banner_tags: ['Grade-A Space', '10% Rental Yield', 'High ROI'],
    },
    {
      id: 'demo-banner-5',
      title: 'Serene Farmhouse Estates in Hyderabad',
      subtitle: 'Escape the City | Private Green Living',
      description: 'Sprawling 2-acre farmhouse plots with landscaped gardens, organic farm, and clubhouse.',
      cta_text: 'Discover Estates',
      cta_link: '/search?type=Farmhouse',
      image_desktop: 'https://images.pexels.com/photos/259950/pexels-photo-259950.jpeg?auto=compress&cs=tinysrgb&w=1600',
      banner_tags: ['2-Acre Plots', 'Green Living', 'Gated Community'],
    },
  ];

  const bannerItems = ads && ads.length > 0 ? [...ads, ...defaultBanners] : defaultBanners;
  const SLIDE_DURATION = 5000;

  // Progress bar + auto-play
  useEffect(() => {
    if (isPaused) return;
    setProgress(0);
    const startTime = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / SLIDE_DURATION) * 100, 100));
    }, 50);
    const slide = setTimeout(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
    }, SLIDE_DURATION);
    return () => { clearInterval(tick); clearTimeout(slide); };
  }, [currentIndex, isPaused, bannerItems.length]);

  const goTo = (idx: number) => {
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? bannerItems.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % bannerItems.length);
  };

  const handleBannerClick = async (ad: any) => {
    if (ad.id && typeof ad.id === 'string' && !ad.id.startsWith('demo-')) {
      try {
        await supabase.rpc('increment_ad_click', { p_ad_id: ad.id });
      } catch {
        await supabase
          .from('advertisements')
          .update({ clicks: ((ad.clicks as number) ?? 0) + 1 })
          .eq('id', ad.id);
      }
    }
  };

  const activeAd = (bannerItems[currentIndex % bannerItems.length] || defaultBanners[0]) as any;
  const targetLink = activeAd.property_id
    ? `/property/${activeAd.property_id}`
    : activeAd.category_name
      ? `/search?purpose=${activeAd.category_name}`
      : activeAd.cta_link || (activeAd as any).link_url || '/search';

  const slideVariants: any = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0, scale: 1.05 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0, scale: 0.95 }),
  };

  const textVariants: any = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' } }),
  };

  return (
    <section
      className="py-8 bg-slate-50/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container-wide">
        <div className="relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-800 h-[300px] sm:h-[350px] lg:h-[400px] group bg-slate-900 flex">

          {/* Slides */}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeAd.id || currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex"
            >
              <div className="relative w-full h-full">
                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10 pointer-events-none" />
                <motion.img
                  src={activeAd.image_desktop || defaultBanners[0].image_desktop}
                  alt={(activeAd as any).seo_alt_text || activeAd.title}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 6, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center h-full p-6 sm:p-10 lg:px-14 w-full lg:w-[55%] pointer-events-none">
            <motion.div
              key={`badge-${currentIndex}`}
              custom={0}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mb-4"
            >
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-sm pointer-events-auto">
                <Star className="h-3.5 w-3.5 fill-current text-yellow-300" />
                Featured
              </span>
            </motion.div>

            {/* Title */}
            <motion.h2
              key={`title-${currentIndex}`}
              custom={1}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] pointer-events-auto"
            >
              {(() => {
                const titleStr = activeAd.title || '';
                const words = titleStr.split(' ');
                if (words.length > 1) {
                  const last = words.pop();
                  return (
                    <>
                      {words.join(' ')} <br className="hidden sm:block" />
                      <span className="text-red-500">{last}</span>
                    </>
                  );
                }
                return titleStr;
              })()}
            </motion.h2>

            {/* Subtitle / Description */}
            {(activeAd.subtitle || activeAd.description) && (
              <motion.p
                key={`desc-${currentIndex}`}
                custom={2}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="mt-4 text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-sm pointer-events-auto line-clamp-2"
              >
                {activeAd.subtitle || activeAd.description}
              </motion.p>
            )}

            {/* CTA & Logo */}
            <motion.div
              key={`cta-${currentIndex}`}
              custom={3}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 pointer-events-auto flex items-center gap-6"
            >
              {targetLink.startsWith('http') ? (
                <a
                  href={targetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleBannerClick(activeAd)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E60000] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30"
                >
                  {activeAd.cta_text || 'Explore Now'}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  to={targetLink}
                  onClick={() => handleBannerClick(activeAd)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E60000] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30"
                >
                  {activeAd.cta_text || 'Explore Now'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              
              {/* Property Logo */}
              {(activeAd as any).company_logo && (
                <div className="h-12 w-auto max-w-[120px] rounded-md overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 p-1.5 flex items-center justify-center">
                  <img 
                    src={(activeAd as any).company_logo} 
                    alt="Property Logo" 
                    className="max-h-full max-w-full object-contain" 
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Dots Indicator */}
          {bannerItems.length > 1 && (
            <div className="absolute bottom-6 left-1/2 sm:left-[65%] -translate-x-1/2 z-30 flex gap-2">
              {bannerItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                  className={`h-2 transition-all rounded-full ${idx === currentIndex ? 'w-6 bg-red-600' : 'w-2 bg-white/70 hover:bg-white border border-slate-200'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
          
          {/* Slide Counter (Top Right) */}
          {bannerItems.length > 1 && (
            <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 text-white text-xs font-semibold border border-white/20 shadow-sm pointer-events-auto">
              <span className="text-white font-bold">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="text-white/60">/</span>
              <span className="text-white/60">{String(bannerItems.length).padStart(2, '0')}</span>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Property Categories
============================================================ */
const CATEGORIES = [
  { name: 'Apartment', icon: Building2, color: 'bg-primary-50 text-primary-600' },
  { name: 'Villa', icon: Home, color: 'bg-secondary-50 text-secondary-600' },
  { name: 'Independent House', icon: KeyRound, color: 'bg-success-50 text-success-600' },
  { name: 'Commercial Office', icon: Briefcase, color: 'bg-warning-50 text-warning-600' },
  { name: 'Retail Shop', icon: Store, color: 'bg-primary-50 text-primary-600' },
  { name: 'Warehouse', icon: Warehouse, color: 'bg-navy-100 text-navy-600' },
  { name: 'Plots', icon: LandPlot, color: 'bg-secondary-50 text-secondary-600' },
  { name: 'Co-working', icon: Users, color: 'bg-success-50 text-success-600' },
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
function FeaturedProperties() {
  const { t } = useLanguageContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data, isLoading } = useQuery({
    queryKey: ['home-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .limit(8);
      return (data ?? []).map((p) => {
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

  // Auto scroll effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      
      let itemWidth = el.clientWidth;
      if (window.innerWidth >= 1024) itemWidth = el.clientWidth / 4;
      else if (window.innerWidth >= 640) itemWidth = el.clientWidth / 2;
      
      const maxScroll = el.scrollWidth - el.clientWidth;
      let targetScroll = el.scrollLeft + itemWidth;
      
      if (targetScroll > maxScroll + 10) {
        targetScroll = 0;
      }
      
      el.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    let itemWidth = el.clientWidth;
    if (window.innerWidth >= 1024) itemWidth = el.clientWidth / 4;
    else if (window.innerWidth >= 640) itemWidth = el.clientWidth / 2;
    el.scrollBy({ left: itemWidth, behavior: 'smooth' });
  };
  
  const handlePrev = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    let itemWidth = el.clientWidth;
    if (window.innerWidth >= 1024) itemWidth = el.clientWidth / 4;
    else if (window.innerWidth >= 640) itemWidth = el.clientWidth / 2;
    el.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  };

  return (
    <SectionShell
      title={t('home.featuredProperties', 'Featured Properties')}
      subtitle={t('home.featuredSubtitle', 'Handpicked premium listings with AI-verified details')}
      id="featured"
      action={
        <Link
          to="/search"
          className="flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          {t('common.viewAll', 'View all')} <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="relative group/carousel -mx-2 px-2 sm:mx-0 sm:px-0">
        {data && data.length > 0 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white text-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-100 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 cursor-pointer hidden sm:grid"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-white text-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-100 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 cursor-pointer hidden sm:grid"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        {isLoading ? (
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-80 rounded-2xl shrink-0 w-[calc(100%-8px)] sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {data.map((p) => (
              <div key={p.id} className="shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] snap-start">
                <PropertyCard property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-navy-400">
            {t('home.noFeaturedProperties', 'No featured properties available.')}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

/* ============================================================
   Top Cities
============================================================ */
function TopCities() {
  const { t } = useLanguageContext();
  const { data: cities } = useQuery({
    queryKey: ['home-cities'],
    queryFn: async () => {
      const { data: cityRows } = await supabase.from('cities').select('id, name, state').order('name').limit(10);
      if (!cityRows) return [];
      const enriched = await Promise.all(
        cityRows.map(async (c) => {
          const { count } = await supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published')
            .eq('city_id', c.id);
          return { ...c, count: count ?? 0 };
        }),
      );
      return enriched.sort((a, b) => b.count - a.count);
    },
  });

  const cityImages: Record<string, string> = {
    Hyderabad: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
    Mumbai: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg',
    Bengaluru: 'https://images.pexels.com/photos/207891/pexels-photo-207891.jpeg',
    Pune: 'https://images.pexels.com/photos/2487317/pexels-photo-2487317.jpeg',
    Delhi: 'https://images.pexels.com/photos/2884866/pexels-photo-2884866.jpeg',
    Chennai: 'https://images.pexels.com/photos/2901214/pexels-photo-2901214.jpeg',
  };

  return (
    <SectionShell
      title={t('home.topCities', 'Top Cities')}
      subtitle={t('home.topCitiesSubtitle', "Explore properties in India's prime real estate markets")}
      id="cities"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {(cities ?? []).slice(0, 10).map((city, i) => (
          <motion.div
            key={city.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -5 }}
          >
            <Link to={`/search?city=${city.id}`} className="group relative block overflow-hidden rounded-2xl">
              <div className="aspect-[4/5] w-full overflow-hidden">
                <img
                  src={cityImages[city.name] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
                  alt={city.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4">
                <p className="font-display text-lg font-bold text-white">{city.name}</p>
                <p className="text-xs text-white/70">
                  {city.count} {t('property.propertiesCount', 'properties')}
                </p>
              </div>
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
      category: t('home.aiDiscoveryCategory', 'Property Discovery'),
      subtitle: t('home.aiDiscoverySubtitle', 'Find the right property with AI in seconds'),
      headerIcon: Search,
      headerColor: 'bg-rose-50 text-rose-500',
      items: [
        {
          title: t('home.aiSearchTitle', 'AI Property Search'),
          desc: t('home.aiSearchDesc', 'Search properties naturally using everyday language.'),
          icon: Search,
          bg: 'bg-rose-50 text-rose-500',
          tab: 'smart-search',
        },
        {
          title: t('home.aiRecommendationsTitle', 'AI Recommendations'),
          desc: t('home.aiRecommendationsDesc', 'Personalized property suggestions just for you.'),
          icon: Sparkles,
          bg: 'bg-purple-50 text-purple-600',
          tab: 'recommendations',
        },
        {
          title: t('home.aiComparisonTitle', 'AI Property Comparison'),
          desc: t('home.aiComparisonDesc', 'Compare multiple properties side by side instantly.'),
          icon: GitCompare,
          bg: 'bg-sky-50 text-sky-600',
          tab: 'assistant',
        },
      ],
    },
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
  const { data } = useQuery({
    queryKey: ['home-luxury'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .eq('status', 'published')
        .eq('is_luxury', true)
        .order('price', { ascending: false })
        .limit(9);
      return (data ?? []).map((p) => {
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
    <section className="mt-[80px] mb-[100px] w-full bg-[#F8FAFC] py-16 lg:py-20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-[#F8FAFC] opacity-80 pointer-events-none" />
      
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Signature Collection
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 font-medium">
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
            <div className="flex gap-[28px]">
              {data.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                  className="relative min-w-0 flex-[0_0_100%] sm:flex-[0_0_calc(50%-14px)] lg:flex-[0_0_calc(33.333%-18.66px)] max-w-[420px]"
                >
                  <Link 
                    to={`/property/${p.id}`}
                    className="group block h-[480px] lg:h-[520px] w-full rounded-[24px] bg-white border border-[#ECECEC] shadow-[0_15px_45px_rgba(0,0,0,0.12)] overflow-hidden transition-all duration-500 hover:-translate-y-[10px] hover:shadow-[0_25px_60px_rgba(0,0,0,0.18)]"
                  >
                    
                    {/* Top Image Box */}
                    <div className="relative h-[280px] w-full overflow-hidden bg-slate-100 rounded-t-[24px]">
                      <img
                        src={p.images?.[0] ?? 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
                      />
                      
                      {/* Signature Badge */}
                      <div className="absolute top-4 left-4 z-10 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] rounded-full">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/40 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                          <Sparkles className="h-3 w-3" /> SIGNATURE
                        </span>
                      </div>

                      {/* Wishlist Glass Icon */}
                      <button 
                        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white transition-all hover:bg-white/40 hover:scale-110 active:scale-95 focus:outline-none"
                        onClick={(e) => { e.preventDefault(); /* Wishlist handler logic */ }}
                      >
                        <Heart className="h-5 w-5" />
                      </button>

                      {/* Image Bottom Overlay Fade */}
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
                    </div>

                    {/* Bottom Details Content */}
                    <div className="relative flex flex-col justify-between h-[calc(100%-280px)] p-6 bg-gradient-to-b from-white to-[#FAFAFA]">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {p.property_type_name || 'Ultra Luxury'}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {p.builder_name || 'Premium Builder'}
                          </span>
                        </div>
                        
                        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 line-clamp-1 group-hover:text-red-600 transition-colors">
                          {p.title}
                        </h3>
                        
                        <div className="mt-2 flex items-center gap-1.5 text-slate-500">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="text-sm font-medium line-clamp-1">
                            {p.locality_name}, {p.city_name}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                        <p className="font-display text-2xl font-black text-slate-900 tracking-tight">
                          {formatCompactPrice(p.price)}
                        </p>
                        <span className="flex items-center gap-1 text-sm font-bold text-red-600 group-hover:gap-2 transition-all">
                          View Details <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>

                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          {data.length > 3 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-[-24px] top-[240px] -translate-y-1/2 z-20 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:bg-slate-50 hover:text-red-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-100"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              
              <button
                onClick={scrollNext}
                className="absolute right-[-24px] top-[240px] -translate-y-1/2 z-20 hidden lg:flex h-14 w-14 items-center justify-center rounded-full bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)] text-slate-700 transition-all hover:bg-slate-50 hover:text-red-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-slate-100"
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
      subtitle={t('home.trustedDevelopers', "India's most trusted developers")}
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
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [agents]);

  if (!agents || agents.length === 0) return null;

  return (
    <section className="py-16 bg-white overflow-hidden" id="agents">
      <div className="container-wide relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                {t('home.topAgents', 'Top Agents')}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 border border-red-100">
                <ShieldCheck className="h-4 w-4" />
                Verified Real Estate Experts
              </span>
            </div>
            <p className="text-slate-500 max-w-2xl text-sm sm:text-base">
              {t('home.connectExperts', 'Connect with trusted agents to find the perfect property')}
            </p>
          </div>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            View All Agents <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative group -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => scroll('left')}
            className={"hidden sm:grid absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 hover:text-red-600 transition-all hover:scale-110 " + (!showLeft && 'opacity-0 pointer-events-none')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {agents.map((a, i) => {
              const badges = ['TOP RATED', 'RISING STAR', 'EXPERT', 'TOP PERFORMER'];
              const badge = badges[i % badges.length];
              const badgeColors: Record<string, string> = {
                'TOP RATED': 'text-red-600 bg-red-50 border-red-100',
                'RISING STAR': 'text-blue-600 bg-blue-50 border-blue-100',
                'EXPERT': 'text-emerald-600 bg-emerald-50 border-emerald-100',
                'TOP PERFORMER': 'text-gold-600 bg-gold-50 border-gold-100',
              };

              const bgStyles = [
                { background: 'radial-gradient(circle at top left, #fee2e2 0%, #fff1f2 100%)' },
                { background: 'radial-gradient(circle at top right, #dbeafe 0%, #eff6ff 100%)' },
                { background: 'radial-gradient(circle at top left, #d1fae5 0%, #ecfdf5 100%)' },
                { background: 'radial-gradient(circle at top right, #fef3c7 0%, #fffbeb 100%)' },
              ];
              const bgStyle = bgStyles[i % bgStyles.length];

              return (
                <div
                  key={a.id}
                  className="snap-start shrink-0 w-[300px] sm:w-[320px] rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 relative overflow-hidden transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 flex flex-col"
                >
                  <div
                    className="h-28 w-[120%] absolute top-0 -left-[10%] rounded-b-[50%]"
                    style={bgStyle}
                  />

                  <div className="relative z-10 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <div className="w-8 h-8"></div>
                      <span
                        className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border uppercase tracking-wider " + badgeColors[badge]}
                      >
                        {badge === 'TOP RATED' && <Star className="h-3 w-3" />}
                        {badge === 'RISING STAR' && <TrendingUp className="h-3 w-3" />}
                        {badge === 'EXPERT' && <ShieldCheck className="h-3 w-3" />}
                        {badge === 'TOP PERFORMER' && <Award className="h-3 w-3" />}
                        {badge}
                      </span>
                    </div>

                    <div className="mx-auto relative mb-3">
                      {a.avatar_url ? (
                        <img
                          src={a.avatar_url}
                          alt={(a.first_name ?? '') + ' ' + (a.last_name ?? '')}
                          className="h-20 w-20 rounded-full object-cover border-[3px] border-white shadow-md bg-white"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full border-[3px] border-white shadow-md bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-3xl font-bold">
                          {a.first_name?.[0] ?? 'A'}
                        </div>
                      )}
                    </div>

                    <div className="text-center mb-6">
                      <h3 className="font-display font-bold text-xl text-slate-900 leading-tight">
                        {a.first_name} {a.last_name}
                      </h3>
                      <p className="text-[13px] text-slate-500 mt-1">{a.company || 'Real Estate Agent'}</p>

                      <div className="flex items-center justify-center gap-1 mt-2.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="h-4 w-4 fill-red-600 text-red-600" />
                        ))}
                        <span className="text-xs font-bold text-slate-600 ml-1">
                          ({(4.5 + (i % 5) * 0.1).toFixed(1)})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 leading-none mb-1">
                            {100 + i * 15}+
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">Deals Closed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-slate-900 leading-none mb-1">
                            {5 + i}+
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">Years Exp.</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-center gap-4 mb-4">
                        <a
                          href={"tel:" + (a.phone ?? '')}
                          className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Phone className="h-[18px] w-[18px]" />
                        </a>
                        <a
                          href={"https://wa.me/" + (a.phone ?? '')}
                          className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          <MessageCircle className="h-[18px] w-[18px]" />
                        </a>
                        <Link
                          to={"/agents/" + a.id}
                          className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                        >
                          <Calendar className="h-[18px] w-[18px]" />
                        </Link>
                      </div>

                      <Link
                        to={"/agents/" + a.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        View Full Profile
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => scroll('right')}
            className={"hidden sm:grid absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-100 hover:text-red-600 transition-all hover:scale-110 " + (!showRight && 'opacity-0 pointer-events-none')}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex justify-center gap-2 mt-2">
            <div className="h-1.5 w-4 rounded-full bg-red-600"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
          </div>
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
function EMIAndTestimonialsSection() {
  const { t } = useLanguageContext();

  // EMI state
  const [amount, setAmount] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const monthlyRate = rate / 12 / 100;
  const months = years * 12;
  const emi =
    monthlyRate > 0
      ? (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      : amount / months;
  const total = emi * months;
  const interest = total - amount;

  // Testimonials data
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['home-testimonials'],
    queryFn: async () => {
      const { data } = await supabase.from('testimonials').select('*').eq('is_active', true).limit(4);
      return data ?? [];
    },
  });

  return (
    <section className="py-16 bg-white border-t border-slate-100" id="emi">
      <div className="container-wide">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">

          {/* LEFT COLUMN — Customer Testimonials */}
          <div>
            <div className="mb-8">
              <h2 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {t('home.customerTestimonials', 'Customer Testimonials')}
              </h2>
              <p className="mt-2 text-sm text-navy-500">
                {t('home.realStories', 'Real stories from happy homeowners and investors')}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
              </div>
            ) : testimonials && testimonials.length > 0 ? (
              <div className="space-y-4">
                {testimonials.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="card-premium p-5 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <Quote className="h-6 w-6 shrink-0 text-primary-200 mt-0.5" />
                      <p className="text-sm leading-relaxed text-navy-700">"{item.body}"</p>
                    </div>
                    <div className="flex items-center gap-3 pl-9">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shrink-0">
                        {item.name?.[0] ?? 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-navy-900 truncate">{item.name}</p>
                        <p className="text-xs text-navy-500 truncate">
                          {item.role}{item.company ? `, ${item.company}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {[1,2,3,4,5].map((s) => (
                          <Star
                            key={s}
                            className={cn('h-3 w-3', s <= item.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200')}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy-400">No testimonials available yet.</p>
            )}
          </div>

          {/* RIGHT COLUMN — Home Loan EMI Calculator */}
          <div>
            <div className="mb-8">
              <h2 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {t('home.emiCalculatorTitle', 'Home Loan EMI Calculator')}
              </h2>
              <p className="mt-2 text-sm text-navy-500">
                {t('home.emiSubtitle', 'Plan your finances with our smart calculator')}
              </p>
            </div>

            <div className="card-premium p-6 space-y-5">
              {/* Sliders */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-navy-700">{t('home.loanAmount', 'Loan Amount')}</span>
                    <span className="font-bold text-primary-600">{formatPrice(amount)}</span>
                  </div>
                  <input
                    type="range" min="500000" max="50000000" step="100000"
                    value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-navy-700">{t('home.interestRate', 'Interest Rate')}</span>
                    <span className="font-bold text-primary-600">{rate}%</span>
                  </div>
                  <input
                    type="range" min="6" max="15" step="0.1"
                    value={rate} onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-navy-700">{t('home.tenure', 'Tenure')}</span>
                    <span className="font-bold text-primary-600">{years} {t('home.years', 'years')}</span>
                  </div>
                  <input
                    type="range" min="1" max="30" step="1"
                    value={years} onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
                <p className="text-sm text-white/70">{t('home.monthlyEmi', 'Your Monthly EMI')}</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight">{formatPrice(emi)}</p>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/20 pt-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">{t('home.principal', 'Principal')}</p>
                    <p className="mt-1 font-bold text-base">{formatPrice(amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">{t('home.totalInterest', 'Total Interest')}</p>
                    <p className="mt-1 font-bold text-base">{formatPrice(interest)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/60">{t('home.totalPayable', 'Total Payable')}</p>
                    <p className="mt-1 font-bold text-base">{formatPrice(total)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
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
   Enhanced Services — 4 Column Grid (Home, Interiors, Borewell, Loans)
============================================================ */
const ENHANCED_SERVICES = [
  {
    id: 'home-services',
    badge: 'VERIFIED PARTNERS',
    badgeBg: 'bg-amber-100 text-amber-700',
    badgeIcon: Hammer,
    title: 'Home Services',
    subtitle: 'Trusted experts for all your home repair, maintenance & improvement needs.',
    description: 'Reliable, background-verified professionals — available same day across all major cities',
    features: [
      'Skilled Professionals',
      'Verified & Background Checked',
      'On-time Service',
      'Affordable Pricing',
    ],
    icon: Hammer,
    iconGradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-50',
    link: '/contact?service=Kam+Kaka+Home+Services',
    cta: 'Book a Service',
    stats: '50,000+ Jobs Completed',
  },
  {
    id: 'interior-design',
    badge: 'PREMIUM PARTNER',
    badgeBg: 'bg-violet-100 text-violet-700',
    badgeIcon: PaintBucket,
    title: 'Interior Design',
    subtitle: 'Elegant designs that reflect your style and elevate your living space.',
    description:
      'From concept to completion — modular kitchens, custom furniture, 3D visualization and complete home makeovers starting ₹3 Lakhs.',
    features: ['Custom Designs', 'Premium Materials', 'End-to-End Execution', '3D Design Preview'],
    icon: PaintBucket,
    iconGradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50',
    link: '/contact?service=Born+Interiors+Design',
    cta: 'Explore Interior Services',
    stats: 'Award-Winning Designers',
  },
  {
    id: 'borewell-services',
    badge: 'PROFESSIONAL SERVICE',
    badgeBg: 'bg-teal-100 text-teal-700',
    badgeIcon: Droplets,
    title: 'Borewell Services',
    subtitle: 'Professional borewell drilling solutions with high success rate.',
    description:
      'Expert borewell drilling, maintenance, and repairs for residential and commercial properties',
    features: [
      'Hydro Survey',
      'High Success Rate',
      'Expert Team',
      'Pump Installation',
    ],
    icon: Droplets,
    iconGradient: 'from-teal-500 to-cyan-600',
    iconBg: 'bg-teal-50',
    link: '/contact?service=Borewell+Services',
    cta: 'Explore Borewell Services',
    stats: '10+ Years Experience',
  },
  {
    id: 'home-loan',
    badge: 'FINANCIAL SERVICE',
    badgeBg: 'bg-blue-100 text-blue-700',
    badgeIcon: PieChart,
    title: 'Home Loan Services',
    subtitle: 'Easy home loans with lowest interest rates & quick approvals.',
    description:
      'Get competitive home loans with flexible tenure, minimal documentation, and dedicated support',
    features: ['Low Interest Rates', 'Quick Approval', 'Minimal Documents', 'Top Bank Partners'],
    icon: PieChart,
    iconGradient: 'from-blue-600 to-indigo-700',
    iconBg: 'bg-blue-50',
    link: '/contact?service=Home+Loan+Services',
    cta: 'Explore Home Loan Services',
    stats: 'Lowest Interest Rates',
  },
];

function ServicesSection() {
  const { t } = useLanguageContext();
  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-slate-50" id="services">
      <div className="container-wide space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider px-4 py-1.5 mb-4">
            <Home className="h-3.5 w-3.5" /> {t('home.exploreMore', 'Explore More')}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            {t('home.beyondProperty', 'Beyond Property.')}<br />
            <span className="text-red-600">{t('home.enhanceLiving', 'We Enhance Your Living.')}</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            {t(
              'home.servicesDescription',
              'Discover premium services to complete your dream home experience with trusted professionals.',
            )}
          </p>
        </div>

        {/* 4 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ENHANCED_SERVICES.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={service.link}>
                <div className={`flex flex-col h-full rounded-3xl border border-slate-200 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group ${service.iconBg}`}>
                  {/* Header with Badge */}
                  <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full ${service.badgeBg} text-[10px] font-extrabold uppercase tracking-wider px-3 py-1`}
                      >
                        <service.badgeIcon className="h-3 w-3" /> {service.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${service.iconGradient} shadow-lg`}
                      >
                        <service.icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-extrabold">{service.title}</h3>
                        <p className="text-xs text-white/70 mt-0.5">{service.stats}</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-grow p-6">
                    <p className="font-semibold text-slate-900 text-sm mb-2">{service.subtitle}</p>
                    <p className="text-slate-600 text-sm mb-5 flex-grow">{service.description}</p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-2.5 mb-5">
                      {service.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-slate-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <button className="w-full mt-auto py-3 px-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-sm hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group/btn">
                      <span>{service.cta}</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </div>
              </Link>
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
  const partners = ['HDFC', 'SBI', 'ICICI', 'Axis', 'LIC Housing', 'Bajaj Finserv'];
  return (
    <section className="border-y border-navy-100 bg-white py-12">
      <div className="container-wide">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-navy-400">
          {t('home.bankingPartners', 'Our Banking & Insurance Partners')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
          {partners.map((p) => (
            <div key={p} className="font-display text-xl font-bold text-navy-300 transition hover:text-navy-600">
              {p}
            </div>
          ))}
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
      <CategoriesSection />
      <AIAdBannerSection />
      <FeaturedProperties />
      <LuxuryAdBannersSection />
      <ThreeColumnAdBannersSection />
      <TopAgents />
      <PostPropertyBanner />
      <AIFeaturesSection />
      <SignatureCollection />
      <TopCities />
      <TopBuilders />
      <EMIAndTestimonialsSection />
      <ServicesSection />
      <InteriorAndHomeServicesSection />
      <LatestBlogs />
      <AppCTA />
      <PartnersSection />
      <FinalCTA />
    </div>
  );
}
