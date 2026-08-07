import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Phone,
  Heart,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  Car,
  Calendar,
  Home,
  Eye,
  Star,
  Send,
  ShieldCheck,
  Bot,
  GitCompare,
  Play,
  Printer,
  X,
  Building,
  Zap,
  Ruler,
  Images,
  HelpCircle,
  TrendingUp,
  Layers,
  Flag,
  Download,
  ChevronDown,
  Sparkles,
  Box,
  Navigation2,
} from 'lucide-react';
import { fetchProperty, trackPropertyView } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { SharePropertyModal } from '../../components/share-property-modal';
import { Button, Card, Input, Textarea, Badge, Avatar, EmptyState, Spinner, Modal, Select } from '../../components/ui';
import { PropertyCard, StatusBadge, RatingStars } from '../../components/property-card';
import { formatCompactPrice, formatNumber, cn } from '../../lib/utils';
import { isCompared, toggleCompareProperty } from '../../lib/compare';
import { useToast } from '../../components/toast';
import { PostPropertyBanner } from '../../components/post-property-banner';
import { useSEO } from '../../hooks/use-seo';
import { VirtualTourViewer } from '../../components/virtual-tour/virtual-tour-viewer';
import { loadGoogleMaps } from '../../lib/googleMaps';
import type { VirtualTour } from '../../lib/types';

interface AgentInfo {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  license_number: string | null;
}

interface PageSettings {
  show_specifications: boolean;
  show_amenities: boolean;
  show_floor_plans: boolean;
  show_gallery: boolean;
  show_videos: boolean;
  show_virtual_tour: boolean;
  show_location_map: boolean;
  show_nearby: boolean;
  show_price_history: boolean;
  show_reviews: boolean;
  show_faqs: boolean;
  show_similar_properties: boolean;
  show_emi_calculator: boolean;
  promo_banner_title: string | null;
  promo_banner_body: string | null;
  promo_banner_link: string | null;
}

const DEFAULT_SETTINGS: PageSettings = {
  show_specifications: true,
  show_amenities: true,
  show_floor_plans: true,
  show_gallery: true,
  show_videos: true,
  show_virtual_tour: true,
  show_location_map: true,
  show_nearby: true,
  show_price_history: true,
  show_reviews: true,
  show_faqs: true,
  show_similar_properties: true,
  show_emi_calculator: true,
  promo_banner_title: null,
  promo_banner_body: null,
  promo_banner_link: null,
};

/* ── Small single-marker Google Map for the Location & Map tab ── */
function PropertyLocationMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        });
        new google.maps.Marker({ position: { lat, lng }, map, title });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load map'));
    return () => {
      cancelled = true;
    };
  }, [lat, lng, title]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-navy-50 text-center text-sm text-navy-400">
        {error}
      </div>
    );
  }
  return <div ref={mapRef} className="h-full w-full bg-navy-50" />;
}

/* ── Interactive EMI calculator (sidebar widget) ── */
function EMICalculatorWidget({ defaultAmount }: { defaultAmount: number }) {
  const [amount, setAmount] = useState(Math.round(defaultAmount * 0.8));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const emi = useMemo(() => {
    const monthlyRate = rate / 12 / 100;
    const months = years * 12;
    if (monthlyRate <= 0) return amount / months;
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  }, [amount, rate, years]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-navy-900 p-6 text-white relative overflow-hidden shadow-lg">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/20 rounded-full blur-2xl" />
      <div className="relative z-10">
        <h3 className="font-display text-lg font-bold">Need a Home Loan?</h3>
        <p className="text-indigo-100 text-sm mt-1">Estimate your EMI and get pre-approved in minutes.</p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-indigo-200 mb-1">
              <span>Loan amount</span>
              <span className="font-semibold text-white">₹{formatNumber(amount)}</span>
            </div>
            <input
              type="range"
              min={100000}
              max={defaultAmount}
              step={50000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-indigo-200 mb-1">
              <span>Interest rate</span>
              <span className="font-semibold text-white">{rate}%</span>
            </div>
            <input
              type="range"
              min={6}
              max={14}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-indigo-200 mb-1">
              <span>Tenure</span>
              <span className="font-semibold text-white">{years} yrs</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
        </div>

        <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/20">
          <div className="flex justify-between text-sm">
            <span className="text-indigo-200">Estimated EMI</span>
            <span className="font-bold">₹{formatNumber(Math.round(emi))}/mo</span>
          </div>
        </div>

        <Link to={`/emi-calculator?amount=${amount}&rate=${rate}&years=${years}`}>
          <Button variant="secondary" className="w-full mt-4 bg-white text-navy-900 hover:bg-indigo-50 border-0">
            Check Eligibility
          </Button>
        </Link>
      </div>
    </div>
  );
}

const NEARBY_ICONS: Record<string, typeof Navigation2> = {
  metro: Navigation2,
  hospital: ShieldCheck,
  school: Building,
  mall: Layers,
  airport: Send,
};

export function PropertyDetailPage() {
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId ? routeId.slice(-36) : undefined;

  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [apptForm, setApptForm] = useState({ date: '', time: '', notes: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reportForm, setReportForm] = useState({ reason: '', details: '' });
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: true })]);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
  });

  const { data: settingsRow } = useQuery({
    queryKey: ['property-page-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('property_page_settings').select('*').eq('id', true).maybeSingle();
      return data as PageSettings | null;
    },
  });
  const settings: PageSettings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) };

  const { data: agent } = useQuery({
    queryKey: ['property-agent', property?.assigned_agent_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, avatar_url, bio, company, license_number')
        .eq('id', property!.assigned_agent_id!)
        .maybeSingle();
      return data as AgentInfo | null;
    },
    enabled: !!property?.assigned_agent_id,
  });

  const { data: tours } = useQuery({
    queryKey: ['property-virtual-tours', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_virtual_tours')
        .select('*')
        .eq('property_id', id!)
        .order('sort_order', { ascending: true });
      return (data ?? []) as VirtualTour[];
    },
    enabled: !!id && settings.show_virtual_tour,
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', property?.city_id, property?.property_type_id, property?.purpose, property?.price],
    queryFn: async () => {
      const priceMin = property!.price * 0.6;
      const priceMax = property!.price * 1.4;
      const { data } = await supabase
        .from('properties')
        .select('*, cities!inner(name), localities(name), property_types(name)')
        .eq('status', 'published')
        .neq('id', id!)
        .eq('city_id', property!.city_id!)
        .eq('property_type_id', property!.property_type_id!)
        .eq('purpose', property!.purpose)
        .gte('price', priceMin)
        .lte('price', priceMax)
        .limit(6);
      return (data ?? []).map((p) => {
        const r = p as unknown as { cities?: { name: string }; localities?: { name: string }; property_types?: { name: string } };
        return { ...p, city_name: r.cities?.name ?? null, locality_name: r.localities?.name ?? null, property_type_name: r.property_types?.name ?? null };
      });
    },
    enabled: !!property?.city_id && !!property?.property_type_id,
  });

  const { data: recentViews } = useQuery({
    queryKey: ['recent-views', id],
    queryFn: async () => {
      const { data } = await supabase.from('property_views').select('property_id').order('created_at', { ascending: false }).limit(5);
      if (!data || data.length === 0) return [];
      const ids = [...new Set(data.map((v: { property_id: string }) => v.property_id).filter((pid: string) => pid !== id))].slice(0, 4);
      if (ids.length === 0) return [];
      const { data: props } = await supabase.from('properties').select('*, cities!inner(name), localities(name), property_types(name)').in('id', ids);
      return (props ?? []).map((p) => {
        const r = p as unknown as { cities?: { name: string }; localities?: { name: string }; property_types?: { name: string } };
        return { ...p, city_name: r.cities?.name ?? null, locality_name: r.localities?.name ?? null, property_type_name: r.property_types?.name ?? null };
      });
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data } = await supabase.from('reviews').select('*, profiles!inner(first_name, last_name, avatar_url)').eq('property_id', id!).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', id],
    queryFn: async () => {
      const { data } = await supabase.from('property_status_history').select('*').eq('property_id', id!).order('created_at', { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (id) trackPropertyView(id, user?.id);
  }, [id, user?.id]);

  useEffect(() => {
    if (id) {
      setCompared(isCompared(id));
      if (user) {
        supabase.from('favorites').select('id').eq('user_id', user.id).eq('property_id', id).maybeSingle().then(({ data }) => setSaved(!!data));
      }
    }
  }, [user, id]);

  const toggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (saved) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', id);
      setSaved(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, property_id: id });
      setSaved(true);
    }
  };

  const toggleCompare = async () => {
    if (!id) return;
    try {
      const isNowCompared = await toggleCompareProperty(id, user?.id);
      setCompared(isNowCompared);
      addToast('success', isNowCompared ? t('notifications.addedToCompare', 'Added to comparison list') : t('notifications.removedFromCompare', 'Removed from comparison list'));
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : t('notifications.errorCompare', 'Compare action failed'));
    }
  };

  const shareLinks = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(window.location.href)}` },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}` },
    { name: 'X (Twitter)', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}` },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}` },
    { name: 'Copy link', href: '' },
  ];

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      addToast('success', 'Link copied to clipboard');
      if (id) {
        supabase.rpc('log_property_share', { p_property_id: id, p_platform: 'copy_link' }).catch(console.error);
      }
    } catch {
      addToast('error', 'Could not copy link');
    }
    setShowShare(false);
  };

  const handleShareClick = (platform: string, href: string) => {
    if (id) {
      supabase.rpc('log_property_share', { p_property_id: id, p_platform: platform.toLowerCase() }).catch(console.error);
    }
    window.open(href, '_blank', 'noopener,noreferrer');
    setShowShare(false);
  };

  const enquiryMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to submit an enquiry');
      const payload: Record<string, unknown> = { property_id: id, name: form.name, email: form.email, phone: form.phone, message: form.message };
      payload.customer_id = user.id;
      if (property?.assigned_agent_id) payload.agent_id = property.assigned_agent_id;
      const { error } = await supabase.from('enquiries').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setContactOpen(false);
      setForm({ name: '', email: '', phone: '', message: '' });
      addToast('success', 'Enquiry sent successfully!');
    },
    onError: (err: any) => addToast('error', err.message || 'Failed to send enquiry'),
  });

  const apptMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to book an appointment');
      const scheduledAt = new Date(`${apptForm.date}T${apptForm.time}`).toISOString();
      const { error } = await supabase.from('appointments').insert({
        property_id: id,
        customer_id: user.id,
        agent_id: property?.assigned_agent_id,
        scheduled_at: scheduledAt,
        notes: apptForm.notes,
        status: 'requested',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setApptOpen(false);
      setApptForm({ date: '', time: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['portal-appointments'] });
      addToast('success', 'Appointment requested successfully!');
    },
    onError: (err: any) => addToast('error', err.message || 'Failed to request appointment'),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please sign in to leave a review');
      const { error } = await supabase.from('reviews').insert({ property_id: id, user_id: user.id, rating: reviewForm.rating, comment: reviewForm.comment });
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewOpen(false);
      setReviewForm({ rating: 5, comment: '' });
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      addToast('success', 'Review submitted successfully!');
    },
    onError: (err: any) => addToast('error', err.message || 'Failed to submit review'),
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reportForm.reason) throw new Error('Please select a reason');
      const { error } = await supabase.from('property_reports').insert({
        property_id: id,
        reporter_id: user?.id ?? null,
        reason: reportForm.reason,
        details: reportForm.details || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReportOpen(false);
      setReportForm({ reason: '', details: '' });
      addToast('success', 'Thanks — our team will review this listing.');
    },
    onError: (err: any) => addToast('error', err.message || 'Failed to submit report'),
  });

  const images = property?.images?.length ? property.images : ['https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'];
  const agentName = agent ? `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() : 'Agent';

  // AI-generated JSON-LD (generatePropertySeo edge function, written on submit/resubmit)
  // takes priority; this client-built version is only a fallback for properties that
  // predate SEO generation or haven't run it yet.
  const schema = property
    ? property.json_ld ?? {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: property.title,
        description: property.description ?? undefined,
        image: images,
        url: window.location.href,
        address: {
          '@type': 'PostalAddress',
          streetAddress: property.address ?? undefined,
          addressLocality: property.locality_name ?? undefined,
          addressRegion: property.city_name ?? undefined,
          addressCountry: 'IN',
        },
        ...(property.latitude && property.longitude
          ? { geo: { '@type': 'GeoCoordinates', latitude: property.latitude, longitude: property.longitude } }
          : {}),
        offers: { '@type': 'Offer', price: property.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      }
    : undefined;

  useSEO({
    title: property?.seo_title || property?.title,
    description:
      property?.seo_description ||
      property?.description ||
      `${property?.property_type_name ?? 'Property'} for ${property?.purpose === 'Rent' ? 'rent' : 'sale'} in ${property?.locality_name ?? property?.city_name ?? 'Hyderabad'} — RealtyNow`,
    type: 'product',
    image: property?.og_image || images[0],
    twitterTitle: property?.twitter_title || undefined,
    twitterDescription: property?.twitter_description || undefined,
    twitterImage: property?.twitter_image || undefined,
    schema,
  });

  if (isLoading) {
    return (
      <div className="container-page py-16">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }
  if (!property) {
    return (
      <div className="container-page py-16">
        <Card>
          <EmptyState
            icon={<Home className="h-6 w-6" />}
            title={t('property.notFound', 'Property not found')}
            description={t('property.removedMsg', 'This listing may have been removed.')}
            action={
              <Link to="/search">
                <Button variant="secondary">{t('common.browseProperties', 'Browse properties')}</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const nearbyEntries = property.nearby_places
    ? (Object.entries(property.nearby_places).filter(([, v]) => v) as [string, string][])
    : [];

  const tabDefs: { key: string; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'specifications', label: 'Specifications', show: settings.show_specifications },
    { key: 'amenities', label: 'Amenities', show: settings.show_amenities && !!property.amenities?.length },
    { key: 'floorplans', label: 'Floor Plans', show: settings.show_floor_plans && !!property.floor_plans?.length },
    { key: 'gallery', label: 'Gallery', show: settings.show_gallery },
    { key: 'videos', label: 'Videos', show: settings.show_videos && !!property.videos?.length },
    { key: 'virtualtour', label: '360° Tour', show: settings.show_virtual_tour && !!tours?.length },
    { key: 'location', label: 'Location & Map', show: settings.show_location_map && !!(property.latitude && property.longitude) },
    { key: 'nearby', label: 'Nearby', show: settings.show_nearby && nearbyEntries.length > 0 },
    { key: 'pricehistory', label: 'Price History', show: settings.show_price_history && !!priceHistory?.length },
    { key: 'reviews', label: 'Reviews', show: settings.show_reviews },
    { key: 'faqs', label: 'FAQs', show: settings.show_faqs },
    { key: 'similar', label: 'Similar Properties', show: settings.show_similar_properties && !!similar?.length },
  ];
  const visibleTabs = tabDefs.filter((t) => t.show);
  const currentTab = visibleTabs.some((t) => t.key === activeTab) ? activeTab : visibleTabs[0]?.key;

  const faqItems = [
    { q: `Is this ${property.property_type_name ?? 'property'} verified by RealtyNow?`, a: property.verified_status && property.verified_status !== 'Unverified' ? `Yes — this listing's status is "${property.verified_status}".` : 'This listing has not yet completed verification. Contact the agent for documentation.' },
    { q: 'What is the possession status?', a: property.possession_status ?? (property.age_of_property ? `${property.age_of_property} years old — ready to move.` : 'Contact the agent for possession details.') },
    { q: property.purpose === 'Rent' ? 'Is the rent negotiable?' : 'Is the price negotiable?', a: 'Most listings on RealtyNow are open to reasonable offers — use "Contact Agent" to discuss.' },
    { q: 'What amenities are included?', a: property.amenities?.length ? property.amenities.slice(0, 6).join(', ') + (property.amenities.length > 6 ? ', and more.' : '.') : 'See the Amenities tab for full details.' },
  ];

  const breadcrumbs = [
    { label: t('common.home', 'Home'), to: '/' },
    ...(property.city_name ? [{ label: property.city_name, to: `/search?city=${encodeURIComponent(property.city_name)}` }] : []),
    ...(property.locality_name ? [{ label: property.locality_name, to: `/search?city=${encodeURIComponent(property.city_name ?? '')}&locality=${encodeURIComponent(property.locality_name)}` }] : []),
    ...(property.property_type_name ? [{ label: property.property_type_name, to: `/search?type=${encodeURIComponent(property.property_type_name)}` }] : []),
  ];

  return (
    <div className="container-page py-6">
      {/* Dynamic breadcrumbs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-navy-500">
        {breadcrumbs.map((b, i) => (
          <span key={b.to} className="flex items-center gap-2">
            {i > 0 && <ChevronLeft className="h-3 w-3 rotate-180" />}
            <Link to={b.to} className="hover:text-navy-800">
              {b.label}
            </Link>
          </span>
        ))}
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <span className="text-navy-700 truncate max-w-[200px]">{property.title}</span>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6 min-w-0">
          {/* Hero carousel */}
          {/* Premium Hero Gallery (Grid on Desktop, Carousel on Mobile) */}
          <div className="relative group rounded-3xl overflow-hidden bg-navy-100 shadow-sm border border-navy-50">
            {/* Desktop Grid (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[450px] lg:h-[500px]">
              {/* Main Large Image */}
              <button
                className="col-span-2 row-span-2 relative h-full w-full cursor-pointer overflow-hidden group/main"
                onClick={() => { setActiveImg(0); setLightbox(true); }}
              >
                <img
                  src={images[0]}
                  alt={`${property.title} main`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/main:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/main:opacity-100 transition-opacity" />
              </button>

              {/* 4 Smaller Images */}
              {Array.from({ length: 4 }).map((_, i) => {
                const imgIndex = i + 1;
                // If there aren't enough images, reuse the last one or early exit
                const imgSrc = images[imgIndex] || images[images.length - 1];
                if (!imgSrc && imgIndex > 0) return null; // Edge case where property has only 1 image

                return (
                  <button
                    key={imgIndex}
                    className="relative h-full w-full cursor-pointer overflow-hidden group/sub"
                    onClick={() => { setActiveImg(imgIndex % images.length); setLightbox(true); }}
                  >
                    <img
                      src={imgSrc}
                      alt={`${property.title} view ${imgIndex + 1}`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/sub:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>

            {/* Mobile Carousel (Hidden on Desktop) */}
            <div className="md:hidden overflow-hidden" ref={emblaRef}>
              <div className="flex aspect-square sm:aspect-video">
                {images.map((img, i) => (
                  <button key={i} className="relative min-w-0 flex-[0_0_100%] cursor-pointer" onClick={() => { setActiveImg(i); setLightbox(true); }}>
                    <img src={img} alt={`${property.title} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Top Bar (Badges & Actions) */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col gap-2 pointer-events-auto">
                <Badge variant={property.purpose === 'Rent' ? 'info' : 'gold'} className="shadow-lg backdrop-blur-md bg-opacity-90 w-fit">
                  {t('common.for', 'For')} {property.purpose === 'Rent' ? t('common.rent', 'Rent') : t('common.sale', 'Sale')}
                </Badge>
              </div>

              <div className="flex gap-2 pointer-events-auto">
                <button onClick={(e) => { e.stopPropagation(); toggleSave(); }} className={cn('grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition-transform hover:scale-110', saved ? 'text-error-500' : 'text-navy-600 hover:text-navy-900')} title="Save property">
                  <Heart className={cn('h-5 w-5', saved && 'fill-error-500')} />
                </button>
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowShare(true); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition-transform hover:scale-110 text-navy-600 hover:text-navy-900" title="Share">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <SharePropertyModal property={property} isOpen={showShare} onClose={() => setShowShare(false)} />
                </div>
              </div>
            </div>

            {/* Floating Bottom Bar (Show all photos & Media toggles) */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-2">
              {!!tours?.length && (
                <button className="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-bold text-navy-900 shadow-lg backdrop-blur hover:bg-white hover:scale-105 transition-all" onClick={(e) => { e.stopPropagation(); setShowVirtualTour(true); }}>
                  <Box className="h-4 w-4 text-red-600" /> <span className="hidden sm:inline">360° Tour</span>
                </button>
              )}
              {!!property.videos?.length && (
                <button className="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-bold text-navy-900 shadow-lg backdrop-blur hover:bg-white hover:scale-105 transition-all" onClick={(e) => { e.stopPropagation(); setActiveTab('videos'); }}>
                  <Play className="h-4 w-4 text-red-600" /> <span className="hidden sm:inline">Video</span>
                </button>
              )}
              <button
                className="flex items-center gap-2 rounded-xl bg-navy-900/90 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur hover:bg-navy-900 hover:scale-105 transition-all border border-white/10"
                onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              >
                <Images className="h-4 w-4" /> Show all photos
              </button>
            </div>
            
            {/* Mobile Dots */}
            {images.length > 1 && (
              <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 px-2 py-1 rounded-full backdrop-blur-md">
                {images.slice(0, 8).map((_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-sm" />
                ))}
              </div>
            )}
          </div>

          {/* Header Section (Title, Location, Price, Stats) */}
          <div className="space-y-4">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">{property.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-navy-600">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-navy-400" />
                {property.address ?? `${property.locality_name ?? ''}, ${property.city_name ?? ''}`}
              </span>
              {property.latitude && property.longitude && (
                <button onClick={() => setActiveTab('location')} className="font-semibold text-red-600 hover:underline flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> View on Map
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="font-display text-3xl font-extrabold text-navy-900">{formatCompactPrice(property.price)}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">Negotiable</span>
              {property.purpose === 'Rent' && <span className="text-sm font-medium text-navy-500">/mo</span>}
            </div>

            {property.verification_status && property.verification_status !== 'Pending AI' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs font-medium text-emerald-800">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4" /> {property.verification_status}
                </span>
                {property.ai_score != null && <span>AI Score: {property.ai_score}/100</span>}
                {property.ai_verified_at && <span>Verified on {new Date(property.ai_verified_at).toLocaleDateString('en-IN')}</span>}
                <span>Verified By AI</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
              {[
                { icon: Bed, label: 'Bedrooms', value: property.bedrooms },
                { icon: Bath, label: 'Bathrooms', value: property.bathrooms },
                { icon: Maximize, label: 'Built-up Area', value: property.built_up_area ? `${property.built_up_area} sq.ft` : null },
                { icon: Car, label: 'Parking', value: property.parking },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1.5 pl-4 first:border-l-0 sm:border-l border-navy-50 first:pl-0">
                  <div className="flex items-center gap-2 text-navy-500">
                    <s.icon className="h-4 w-4" />
                    <span className="text-xs">{s.label}</span>
                  </div>
                  <span className="font-semibold text-navy-900">{s.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real tab switcher */}
          <div className="sticky top-[64px] z-30 flex items-center gap-5 overflow-x-auto border-b border-navy-100 bg-slate-50/95 backdrop-blur pb-px pt-2 no-scrollbar">
            {visibleTabs.map((tabDef) => (
              <button
                key={tabDef.key}
                onClick={() => setActiveTab(tabDef.key)}
                className={cn(
                  'whitespace-nowrap pb-3 text-sm font-semibold transition-colors border-b-2',
                  currentTab === tabDef.key ? 'border-red-600 text-red-600' : 'border-transparent text-navy-500 hover:text-navy-900',
                )}
              >
                {tabDef.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {currentTab === 'overview' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.overview', 'Property Overview')}</h2>
                  {property.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-700">{property.description}</p>}
                  {property.ai_description && (
                    <div className="mt-6 rounded-xl bg-gold-50/50 p-4 ring-1 ring-gold-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-gold-600" />
                        <h3 className="text-sm font-semibold text-gold-900">AI Summary</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-gold-800">{property.ai_description}</p>
                    </div>
                  )}
                  <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {[
                      { label: t('search.propertyTypeLabel', 'Property type'), value: property.property_type_name },
                      { label: t('search.purposeLabel', 'Purpose'), value: property.purpose },
                      { label: 'Possession', value: property.possession_status },
                      { label: t('property.ownership', 'Ownership'), value: property.ownership_type },
                    ].filter((r) => r.value).map((r) => (
                      <div key={r.label} className="flex justify-between border-b border-navy-50 pb-2 text-sm">
                        <span className="text-navy-500">{r.label}</span>
                        <span className="font-medium text-navy-800 text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'specifications' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
                    <Ruler className="h-5 w-5 text-red-500" /> {t('property.specifications', 'Specifications')}
                  </h2>
                  <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {[
                      { label: t('search.furnishingLabel', 'Furnishing'), value: property.furnishing },
                      { label: t('property.floor', 'Floor'), value: property.floor_number != null ? `${property.floor_number} of ${property.total_floors ?? '—'}` : null },
                      { label: t('search.facingLabel', 'Facing'), value: property.facing },
                      { label: t('property.carpetArea', 'Carpet area'), value: property.carpet_area ? `${property.carpet_area} ${t('property.sqft', 'sqft')}` : null },
                      { label: t('property.plotArea', 'Plot area'), value: property.plot_area ? `${property.plot_area} ${t('property.sqft', 'sqft')}` : null },
                      { label: t('property.ageOfProperty', 'Age of property'), value: property.age_of_property ? `${property.age_of_property} yrs` : null },
                      { label: t('property.balconies', 'Balconies'), value: property.balconies },
                      { label: 'Legal approved', value: property.legal_approved ? 'Yes' : null },
                    ].filter((r) => r.value).map((r) => (
                      <div key={r.label} className="flex justify-between border-b border-navy-50 pb-2 text-sm">
                        <span className="text-navy-500">{r.label}</span>
                        <span className="font-medium text-navy-800 text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'amenities' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.amenities', 'Amenities')}</h2>
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {property.amenities!.map((a) => (
                      <div key={a} className="flex items-center gap-3 text-sm text-navy-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="bg-white p-1.5 rounded shadow-sm">
                          <Zap className="h-4 w-4 text-red-500" />
                        </div>
                        {a}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'floorplans' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.floorPlans', 'Floor Plans')}</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {property.floor_plans!.map((fp, i) => (
                      <a href={fp} target="_blank" rel="noopener noreferrer" key={i} className="group relative overflow-hidden rounded-xl border border-navy-100 block aspect-video">
                        <img src={fp} alt={`Floor plan ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-navy-900/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                          <span className="bg-white px-3 py-1.5 rounded-full text-xs font-bold text-navy-900">View Full Size</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'gallery' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.gallery', 'Photo Gallery')}</h2>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => { setActiveImg(i); setLightbox(true); }} className="aspect-square overflow-hidden rounded-xl">
                        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'videos' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.videoTitle', 'Property Videos')}</h2>
                  <div className="mt-6 space-y-4">
                    {property.videos!.map((v, i) => (
                      <div key={i} className="aspect-video overflow-hidden rounded-xl bg-navy-100">
                        <video src={v} controls className="h-full w-full" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'virtualtour' && !!tours?.length && (
                <Card className="overflow-hidden border-0 p-0 shadow-sm ring-1 ring-navy-100">
                  <div className="h-[420px]">
                    <VirtualTourViewer tours={tours} propertyId={id} />
                  </div>
                </Card>
              )}

              {currentTab === 'location' && property.latitude && property.longitude && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-navy-900">{t('property.locationMap', 'Location & Map')}</h2>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1"
                    >
                      Get Directions <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="aspect-video sm:aspect-[21/9] overflow-hidden rounded-xl border border-slate-200 shadow-inner">
                    <PropertyLocationMap lat={property.latitude} lng={property.longitude} title={property.title} />
                  </div>
                </Card>
              )}

              {currentTab === 'nearby' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.neighborhood', 'Nearby')}</h2>
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {nearbyEntries.map(([key, value]) => {
                      const Icon = NEARBY_ICONS[key] ?? MapPin;
                      const labels: Record<string, string> = { metro: 'Nearest Metro', hospital: 'Hospital', school: 'School / College', mall: 'Shopping Mall', airport: 'Airport' };
                      return (
                        <div key={key} className="flex flex-col gap-2 rounded-xl border border-navy-100 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-navy-500">
                            <Icon className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">{labels[key] ?? key}</span>
                          </div>
                          <p className="text-sm font-medium text-navy-900">{value}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {currentTab === 'pricehistory' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
                    <TrendingUp className="h-5 w-5 text-red-500" /> {t('property.priceHistory', 'Price History')}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {priceHistory!.map((h: Record<string, unknown>) => (
                      <div key={h.id as string} className="flex items-center justify-between border-b border-navy-50 pb-3 text-sm last:border-0">
                        <div>
                          <p className="font-medium text-navy-900">
                            {(h.from_status as string) ?? '—'} → {h.to_status as string}
                          </p>
                          {(h.reason as string) && <p className="mt-0.5 text-xs text-navy-500">{h.reason as string}</p>}
                        </div>
                        <span className="text-xs text-navy-400 shrink-0">{new Date(h.created_at as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'reviews' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-navy-900">{t('property.reviews', 'Reviews')}</h2>
                      {reviews && reviews.length > 0 && (
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <RatingStars rating={reviews.reduce((a: number, r: { rating: number }) => a + r.rating, 0) / reviews.length} />
                          <span className="text-navy-600">{reviews.length} {t('property.reviewsCount', 'reviews')}</span>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => (user ? setReviewOpen(true) : navigate('/login'))} icon={<Star className="h-4 w-4" />}>
                      {t('property.writeReview', 'Write a review')}
                    </Button>
                  </div>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((r: Record<string, unknown>) => {
                        const p = r.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
                        const rp = Array.isArray(p) ? p[0] : p;
                        return (
                          <div key={r.id as string} className="border-b border-navy-50 pb-6 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div className="flex gap-3">
                                <Avatar name={`${rp?.first_name ?? ''} ${rp?.last_name ?? ''}`.trim() || 'User'} src={(rp?.avatar_url as string) ?? null} size={40} />
                                <div>
                                  <p className="text-sm font-bold text-navy-900">{String(rp?.first_name ?? 'Anonymous')}</p>
                                  <div className="mt-1">
                                    <RatingStars rating={r.rating as number} size={14} />
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-navy-400">{new Date(r.created_at as string).toLocaleDateString()}</span>
                            </div>
                            {r.comment ? <p className="mt-3 text-sm text-navy-700 bg-slate-50 p-4 rounded-xl">{r.comment as string}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-navy-600">{t('property.noReviews', 'No reviews yet.')}</p>
                      <p className="text-xs text-navy-500 mt-1">Be the first to share your experience!</p>
                    </div>
                  )}
                </Card>
              )}

              {currentTab === 'faqs' && (
                <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
                    <HelpCircle className="h-5 w-5 text-red-500" /> {t('property.faqs', 'Frequently Asked Questions')}
                  </h2>
                  <div className="mt-6 divide-y divide-navy-50">
                    {faqItems.map((f) => (
                      <details key={f.q} className="group py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy-900">
                          {f.q}
                          <ChevronDown className="h-4 w-4 text-navy-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm text-navy-600">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </Card>
              )}

              {currentTab === 'similar' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.similarProperties', 'Similar Properties')}</h2>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    {similar!.map((p) => (
                      <PropertyCard key={p.id} property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Agent Card */}
          <Card className="p-6 border-t-4 border-t-red-600 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-wider text-navy-500 uppercase">{t('property.managedBy', 'Managed by')}</span>
              <StatusBadge status={property.status} />
            </div>
            <div className="flex items-center gap-4">
              <div className="ring-4 ring-red-50 rounded-full">
                <Avatar name={agentName} src={agent?.avatar_url ?? null} size={56} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg text-navy-900 truncate">{agentName}</p>
                {agent?.company && <p className="text-sm text-navy-600 truncate">{agent.company}</p>}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button size="lg" onClick={() => setContactOpen(true)} className="w-full text-base font-semibold shadow-lg shadow-red-600/20 hover:shadow-red-600/40">
                {t('property.contactAgent', 'Contact Agent')}
              </Button>
              <Button size="lg" variant="secondary" icon={<Calendar className="h-5 w-5 shrink-0" />} className="w-full bg-white border-navy-200 hover:bg-navy-50 text-navy-700 text-base font-semibold" onClick={() => (user ? setApptOpen(true) : navigate('/login'))}>
                Schedule Visit
              </Button>
              {agent?.phone && (
                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${agent.phone}`}>
                    <Button variant="secondary" icon={<Phone className="h-4 w-4" />} className="w-full bg-white border-navy-200 hover:bg-navy-50 text-navy-700" title="Call">
                      Call
                    </Button>
                  </a>
                  <a href={`https://wa.me/${agent.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${property.title}`)}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" icon={<Send className="h-4 w-4" />} className="w-full bg-white border-navy-200 hover:bg-navy-50 text-emerald-700" title="WhatsApp">
                      WhatsApp
                    </Button>
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-medium text-success-700 border border-success-100">
              <ShieldCheck className="h-4 w-4" /> Verified Professional
            </div>
          </Card>

          {settings.promo_banner_title && (
            <a
              href={settings.promo_banner_link ?? '#'}
              target={settings.promo_banner_link?.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="block rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 p-5 text-white shadow-lg transition-transform hover:scale-[1.01]"
            >
              <p className="font-display text-base font-bold">{settings.promo_banner_title}</p>
              {settings.promo_banner_body && <p className="mt-1 text-sm text-red-100">{settings.promo_banner_body}</p>}
            </a>
          )}

          <PostPropertyBanner compact />

          {settings.show_emi_calculator && <EMICalculatorWidget defaultAmount={property.price} />}

          {/* Property Insights */}
          <Card className="p-6 shadow-sm border-0 ring-1 ring-navy-100">
            <h3 className="text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4 text-navy-400" /> Property Insights
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center pb-4 border-b border-navy-50">
                <span className="text-navy-500">{t('property.views', 'Total Views')}</span>
                <span className="font-bold text-navy-900">{formatNumber(property.view_count)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-navy-50">
                <span className="text-navy-500">{t('property.posted', 'Posted On')}</span>
                <span className="font-semibold text-navy-800">{new Date(property.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {property.ai_score != null && (
                <div className="flex justify-between items-center pb-4 border-b border-navy-50">
                  <span className="text-navy-500">AI Property Score</span>
                  <span className="font-bold text-violet-700">{property.ai_score}/100</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-navy-500">{t('property.propertyId', 'Property ID')}</span>
                <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-navy-700">{property.id.slice(0, 8)}</span>
              </div>
            </div>
          </Card>

          {/* Brochure + Report */}
          <div className="grid grid-cols-2 gap-3">
            {property.documents?.[0] ? (
              <a href={property.documents[0]} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} className="w-full">
                  Brochure
                </Button>
              </a>
            ) : (
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} className="w-full opacity-50" disabled>
                Brochure
              </Button>
            )}
            <Button variant="secondary" icon={<Flag className="h-4 w-4" />} className="w-full text-navy-600" onClick={() => setReportOpen(true)}>
              Report
            </Button>
          </div>
        </aside>
      </div>

      {/* Virtual tour modal */}
      {showVirtualTour && !!tours?.length && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 p-4" onClick={() => setShowVirtualTour(false)}>
          <button className="absolute right-6 top-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25" onClick={() => setShowVirtualTour(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="h-[80vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <VirtualTourViewer tours={tours} propertyId={id} />
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/98 backdrop-blur-xl" onClick={() => setLightbox(false)}>
          <button className="absolute right-6 top-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-all shadow-lg" onClick={() => setLightbox(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white font-semibold text-sm px-5 py-2 rounded-full shadow-md tracking-wide">
            {activeImg + 1} / {images.length}
          </div>
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setActiveImg((prev) => (prev - 1 + images.length) % images.length); }} className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 grid h-14 w-14 place-items-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-2xl hover:scale-110 cursor-pointer">
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          <img src={images[activeImg]} alt={`Property image ${activeImg + 1}`} className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); setActiveImg((prev) => (prev + 1) % images.length); }} className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 grid h-14 w-14 place-items-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all shadow-2xl hover:scale-110 cursor-pointer">
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
          <div className="absolute bottom-6 flex gap-3 overflow-x-auto max-w-[90vw] px-4 py-3 bg-black/50 backdrop-blur-md rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={cn('h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all', activeImg === i ? 'border-red-500 scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100')}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {recentViews && recentViews.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-navy-900">{t('property.recentlyViewed', 'Recently Viewed')}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentViews.map((p) => (
              <PropertyCard key={p.id} property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
            ))}
          </div>
        </section>
      )}

      {/* Contact modal */}
      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={t('property.contactAgent', 'Contact Agent')}
        footer={
          <Button loading={enquiryMutation.isPending} onClick={() => enquiryMutation.mutate()} icon={<Send className="h-4 w-4" />} className="w-full">
            {t('forms.sendEnquiry', 'Send enquiry')}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-navy-500">{t('property.shareDetailsMsg', 'Share your details. The agent will reach out shortly.')}</p>
        <div className="space-y-3">
          <Input label={t('forms.name', 'Name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('forms.yourName', 'Your name')} />
          <Input label={t('forms.email', 'Email')} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
          <Input label={t('forms.phone', 'Phone')} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 90000 00000" />
          <Textarea label={t('forms.message', 'Message')} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder={t('forms.interestedMsg', "I'm interested in this property. Please share more details.")} />
          {enquiryMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> {t('property.enquirySentMsg', 'Enquiry sent! The agent will contact you soon.')}
            </p>
          )}
        </div>
      </Modal>

      {/* Appointment modal */}
      <Modal
        open={apptOpen}
        onClose={() => setApptOpen(false)}
        title={t('property.bookVisit', 'Book a property visit')}
        footer={
          <Button loading={apptMutation.isPending} onClick={() => apptMutation.mutate()} icon={<Calendar className="h-4 w-4" />} className="w-full">
            {t('forms.requestAppointment', 'Request appointment')}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-navy-500">{t('property.pickDateMsg', 'Pick a date and time to visit this property. The agent will confirm.')}</p>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('forms.date', 'Date')} type="date" value={apptForm.date} onChange={(e) => setApptForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label={t('forms.time', 'Time')} type="time" value={apptForm.time} onChange={(e) => setApptForm((f) => ({ ...f, time: e.target.value }))} />
          </div>
          <Textarea label={t('forms.notesOptional', 'Notes (optional)')} value={apptForm.notes} onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))} placeholder={t('forms.specificRequests', 'Any specific requests or questions')} />
          {apptMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> {t('property.apptRequestedMsg', 'Appointment requested! Check your portal for updates.')}
            </p>
          )}
        </div>
      </Modal>

      {/* Review modal */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={t('property.writeReview', 'Write a review')}
        footer={
          <Button loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate()} icon={<Star className="h-4 w-4" />} className="w-full">
            {t('forms.submitReview', 'Submit review')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('forms.rating', 'Rating')}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: i }))} className={i <= reviewForm.rating ? 'text-gold-400' : 'text-navy-200'}>
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <Textarea label={t('forms.comment', 'Comment')} value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} placeholder={t('forms.shareExperience', 'Share your experience with this property')} />
          {reviewMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> {t('property.reviewSubmitted', 'Review submitted!')}
            </p>
          )}
        </div>
      </Modal>

      {/* Report Property modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this listing"
        footer={
          <Button loading={reportMutation.isPending} onClick={() => reportMutation.mutate()} icon={<Flag className="h-4 w-4" />} className="w-full">
            Submit report
          </Button>
        }
      >
        <div className="space-y-3">
          <Select label="Reason" value={reportForm.reason} onChange={(e) => setReportForm((f) => ({ ...f, reason: e.target.value }))}>
            <option value="">Select a reason</option>
            <option value="Incorrect information">Incorrect information</option>
            <option value="Fraud or scam">Fraud or scam</option>
            <option value="Duplicate listing">Duplicate listing</option>
            <option value="Property already sold/rented">Property already sold/rented</option>
            <option value="Inappropriate content">Inappropriate content</option>
            <option value="Other">Other</option>
          </Select>
          <Textarea label="Details (optional)" value={reportForm.details} onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))} placeholder="Tell us more..." />
        </div>
      </Modal>
    </div>
  );
}
