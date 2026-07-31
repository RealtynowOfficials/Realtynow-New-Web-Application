import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bed,
  Bath,
  Maximize,
  MapPin,
  Phone,
  Mail,
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
  FileDown,
  Map,
  Navigation,
  X,
  Maximize2,
  Building,
  Zap,
  Cctv,
  Wind,
  Coffee,
} from 'lucide-react';
import { fetchProperty, trackPropertyView } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Button, Card, Input, Textarea, Badge, Avatar, EmptyState, Spinner, Modal } from '../../components/ui';
import { PropertyCard, StatusBadge, RatingStars } from '../../components/property-card';
import { formatPrice, formatCompactPrice, formatNumber, cn } from '../../lib/utils';
import { isCompared, toggleCompareProperty } from '../../lib/compare';
import { useToast } from '../../components/toast';
import { PostPropertyBanner } from '../../components/post-property-banner';

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

export function PropertyDetailPage() {
  const { t } = useLanguageContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [apptForm, setApptForm] = useState({ date: '', time: '', notes: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
  });

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

  const { data: similar } = useQuery({
    queryKey: ['similar', property?.city_id, property?.property_type_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities!inner(name), localities(name), property_types(name)')
        .eq('status', 'published')
        .neq('id', id!)
        .eq('city_id', property!.city_id!)
        .limit(3);
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
    enabled: !!property?.city_id,
  });

  const { data: recentViews } = useQuery({
    queryKey: ['recent-views', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_views')
        .select('property_id')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!data || data.length === 0) return [];
      const ids = [
        ...new Set(data.map((v: { property_id: string }) => v.property_id).filter((pid: string) => pid !== id)),
      ].slice(0, 4);
      if (ids.length === 0) return [];
      const { data: props } = await supabase
        .from('properties')
        .select('*, cities!inner(name), localities(name), property_types(name)')
        .in('id', ids);
      return (props ?? []).map((p) => {
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

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles!inner(first_name, last_name, avatar_url)')
        .eq('property_id', id!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: priceHistory } = useQuery({
    queryKey: ['price-history', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_status_history')
        .select('*')
        .eq('property_id', id!)
        .order('created_at', { ascending: false })
        .limit(5);
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
        supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('property_id', id)
          .maybeSingle()
          .then(({ data }) => setSaved(!!data));
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
      addToast(
        'success',
        isNowCompared
          ? t('notifications.addedToCompare', 'Added to comparison list')
          : t('notifications.removedFromCompare', 'Removed from comparison list'),
      );
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : t('notifications.errorCompare', 'Compare action failed'));
    }
  };

  const shareLinks = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(window.location.href)}` },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
    },
    { name: 'X (Twitter)', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}` },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
    },
  ];

  const handlePrint = () => window.print();

  const enquiryMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        property_id: id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      };
      if (user) payload.customer_id = user.id;
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
      const { error } = await supabase.from('reviews').insert({
        property_id: id,
        user_id: user.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
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

  if (isLoading)
    return (
      <div className="container-page py-16">
        <div className="flex justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  if (!property)
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

  const images = property.images?.length
    ? property.images
    : ['https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'];
  const agentName = agent ? `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() : 'Agent';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description,
    image: images,
    address: property.address ?? `${property.locality_name ?? ''}, ${property.city_name ?? ''}`,
    offers: { price: property.price, priceCurrency: 'INR' },
  };

  return (
    <div className="container-page py-6">
      <script type="application/ld+json">{JSON.stringify(schema)}</script>

      <div className="mb-4 flex items-center gap-2 text-sm text-navy-500">
        <Link to="/" className="hover:text-navy-800">
          {t('common.home', 'Home')}
        </Link>
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <Link to="/search" className="hover:text-navy-800">
          {t('common.search', 'Search')}
        </Link>
        <ChevronLeft className="h-3 w-3 rotate-180" />
        <span className="text-navy-700">{property.title}</span>
      </div>

            {/* Main 2-Column Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* LEFT COLUMN */}
        <div className="space-y-8 min-w-0">
          {/* Photo Gallery inside Left Column */}
          <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative aspect-video overflow-hidden rounded-2xl bg-navy-100 group cursor-pointer"
              onClick={() => setLightbox(true)}
            >
              <img
                src={images[activeImg]}
                alt={property.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/90 backdrop-blur text-navy-900 font-bold text-xs px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                  <Maximize2 className="h-4 w-4" /> {t('property.expandGallery', 'Expand Gallery')}
                </span>
              </div>
              <div className="absolute left-4 top-4 flex gap-2">
                <Badge variant={property.purpose === 'Rent' ? 'info' : 'gold'}>
                  {t('common.for', 'For')}{' '}
                  {property.purpose === 'Rent' ? t('common.rent', 'Rent') : t('common.sale', 'Sale')}
                </Badge>
              </div>
              <div className="absolute right-4 top-4 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSave(); }}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110',
                    saved ? 'text-error-500' : 'text-navy-400',
                  )}
                  title="Save property"
                >
                  <Heart className={cn('h-4 w-4', saved && 'fill-error-500')} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCompare(); }}
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110',
                    compared ? 'text-secondary-600' : 'text-navy-400',
                  )}
                  title="Compare"
                >
                  <GitCompare className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110 text-navy-500"
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowShare((s) => !s); }}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow backdrop-blur transition hover:scale-110 text-navy-500"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              {showShare && (
                <div className="absolute right-4 top-14 z-20 rounded-xl bg-white p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  {shareLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-navy-50 text-navy-700"
                    >
                      {s.name}
                    </a>
                  ))}
                </div>
              )}
              <div className="absolute bottom-4 left-4">
                <button className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy-800 shadow backdrop-blur hover:bg-white transition-colors" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
                  <Eye className="h-4 w-4" /> View Photos ({images.length})
                </button>
              </div>
            </motion.div>

            {/* Thumbnail Grid */}
            <div className="hidden sm:grid grid-cols-1 grid-rows-4 gap-2 h-full min-h-0">
              {images.slice(1, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveImg(i + 1);
                    setLightbox(true);
                  }}
                  className="relative overflow-hidden rounded-xl bg-navy-100 group h-full min-h-0"
                >
                  <img src={img} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {i === 3 && images.length > 5 && (
                    <div className="absolute inset-0 bg-navy-900/60 flex items-center justify-center text-white font-bold backdrop-blur-sm">
                      +{images.length - 5}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Thumbnail Scroll */}
          <div className="mt-3 flex gap-2 overflow-x-auto sm:hidden no-scrollbar">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveImg(i);
                  setLightbox(true);
                }}
                className={cn('h-16 w-24 shrink-0 overflow-hidden rounded-lg', activeImg === i && 'ring-2 ring-red-500')}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
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
                <a href="#location" className="font-semibold text-red-600 hover:underline flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> View on Map
                </a>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="font-display text-3xl font-extrabold text-navy-900">
                {formatCompactPrice(property.price)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                Negotiable
              </span>
              {property.purpose === 'Rent' && <span className="text-sm font-medium text-navy-500">/mo</span>}
            </div>

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

          {/* Sticky Tabs Navigation */}
          <div className="sticky top-[80px] z-30 flex items-center gap-6 overflow-x-auto border-b border-navy-100 bg-slate-50/90 backdrop-blur pb-px pt-2 no-scrollbar">
            {['Overview', 'Amenities', 'Floor Plan', 'Nearby', 'Reviews'].map((tab, i) => (
              <a
                key={tab}
                href={`#${tab.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  "whitespace-nowrap pb-3 text-sm font-semibold transition-colors border-b-2",
                  i === 0 ? "border-red-600 text-red-600" : "border-transparent text-navy-500 hover:text-navy-900"
                )}
              >
                {tab}
              </a>
            ))}
          </div>

          <div id="overview" className="scroll-mt-32">
            <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
              <h2 className="font-display text-xl font-bold text-navy-900">{t('property.overview', 'Property Overview')}</h2>
              
              {property.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-700">
                  {property.description}
                </p>
              )}

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
                  { label: t('search.furnishingLabel', 'Furnishing'), value: property.furnishing },
                  {
                    label: t('property.floor', 'Floor'),
                    value: property.floor_number != null ? `${property.floor_number} of ${property.total_floors ?? '—'}` : null,
                  },
                  { label: t('search.facingLabel', 'Facing'), value: property.facing },
                  {
                    label: t('property.carpetArea', 'Carpet area'),
                    value: property.carpet_area ? `${property.carpet_area} ${t('property.sqft', 'sqft')}` : null,
                  },
                  {
                    label: t('property.plotArea', 'Plot area'),
                    value: property.plot_area ? `${property.plot_area} ${t('property.sqft', 'sqft')}` : null,
                  },
                  {
                    label: t('property.ageOfProperty', 'Age of property'),
                    value: property.age_of_property ? `${property.age_of_property} yrs` : null,
                  },
                  { label: t('property.ownership', 'Ownership'), value: property.ownership_type },
                  { label: t('property.balconies', 'Balconies'), value: property.balconies },
                ].filter(r => r.value).map((r) => (
                  <div key={r.label} className="flex justify-between border-b border-navy-50 pb-2 text-sm">
                    <span className="text-navy-500">{r.label}</span>
                    <span className="font-medium text-navy-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div id="amenities" className="scroll-mt-32">
              <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                <h2 className="font-display text-xl font-bold text-navy-900">{t('property.amenities', 'Amenities')}</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {property.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-3 text-sm text-navy-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="bg-white p-1.5 rounded shadow-sm">
                         <Zap className="h-4 w-4 text-red-500" />
                      </div>
                      {a}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {property.floor_plans && property.floor_plans.length > 0 && (
            <div id="floor-plan" className="scroll-mt-32">
              <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                <h2 className="font-display text-xl font-bold text-navy-900">{t('property.floorPlans', 'Floor Plans')}</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {property.floor_plans.map((fp, i) => (
                    <a href={fp} target="_blank" rel="noopener noreferrer" key={i} className="group relative overflow-hidden rounded-xl border border-navy-100 block aspect-video">
                      <img src={fp} alt={`Floor plan ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-navy-900/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                        <span className="bg-white px-3 py-1.5 rounded-full text-xs font-bold text-navy-900">View Full Size</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {property.videos && property.videos.length > 0 && (
            <div id="video" className="scroll-mt-32">
              <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                <h2 className="font-display text-xl font-bold text-navy-900">{t('property.videoTitle', 'Property Video')}</h2>
                <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-navy-100">
                  {showVideo ? (
                    <video src={property.videos[0]} controls className="h-full w-full" autoPlay />
                  ) : (
                    <button onClick={() => setShowVideo(true)} className="relative h-full w-full group">
                      <img src={images[0]} className="h-full w-full object-cover opacity-70" alt="Video thumbnail" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition-transform group-hover:scale-110">
                          <Play className="h-8 w-8 ml-1 fill-current" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {property.latitude && property.longitude && (
            <div id="nearby" className="scroll-mt-32">
              <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="font-display text-xl font-bold text-navy-900">{t('property.neighborhood', 'Neighborhood & Map')}</h2>
                   <a href="#map" className="text-sm font-semibold text-red-600 hover:underline flex items-center gap-1">Get Directions <ChevronRight className="h-4 w-4" /></a>
                </div>
                
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
                  {[
                    { label: t('property.schools', 'Schools'), icon: Building, count: '12 nearby' },
                    { label: t('property.hospitals', 'Hospitals'), icon: ShieldCheck, count: '5 nearby' },
                    { label: t('property.metro', 'Metro'), icon: Navigation, count: '1.2 km' },
                    { label: t('property.malls', 'Malls'), icon: Map, count: '3 nearby' },
                  ].map((n) => (
                    <div key={n.label} className="flex flex-col justify-center gap-2 rounded-xl border border-navy-100 bg-slate-50 p-4 text-center items-center">
                      <div className="bg-white p-2 rounded-full shadow-sm">
                         <n.icon className="h-5 w-5 text-navy-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-navy-900">{n.label}</p>
                        <p className="text-xs text-navy-500 mt-0.5">{n.count}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div id="map" className="aspect-video sm:aspect-[21/9] overflow-hidden rounded-xl bg-navy-100 border border-slate-200 shadow-inner">
                  <iframe
                    title="Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.01}%2C${property.longitude + 0.01}%2C${property.latitude + 0.01}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </Card>
            </div>
          )}

          <div id="reviews" className="scroll-mt-32">
            <Card className="p-6 border-0 shadow-sm ring-1 ring-navy-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">{t('property.reviews', 'Reviews')}</h2>
                  {reviews && reviews.length > 0 && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <RatingStars
                        rating={reviews.reduce((a: number, r: { rating: number }) => a + r.rating, 0) / reviews.length}
                      />
                      <span className="text-navy-600">
                        {reviews.length} {t('property.reviewsCount', 'reviews')}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => (user ? setReviewOpen(true) : navigate('/login'))}
                  icon={<Star className="h-4 w-4" />}
                >
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
                            <Avatar
                              name={`${rp?.first_name ?? ''} ${rp?.last_name ?? ''}`.trim() || 'User'}
                              src={(rp?.avatar_url as string) ?? null}
                              size={40}
                            />
                            <div>
                              <p className="text-sm font-bold text-navy-900">{String(rp?.first_name ?? 'Anonymous')}</p>
                              <div className="mt-1">
                                <RatingStars rating={r.rating as number} size={14} />
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-navy-400">
                            {new Date(r.created_at as string).toLocaleDateString()}
                          </span>
                        </div>
                        {r.comment ? <p className="mt-3 text-sm text-navy-700 bg-slate-50 p-4 rounded-xl">{r.comment as string}</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-navy-600">
                    {t('property.noReviews', 'No reviews yet.')}
                  </p>
                  <p className="text-xs text-navy-500 mt-1">Be the first to share your experience!</p>
                </div>
              )}
            </Card>
          </div>
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
              <div className="grid grid-cols-2 gap-3">
                {agent?.phone && (
                  <a href={`tel:${agent.phone}`} className="flex-1">
                    <Button variant="secondary" icon={<Phone className="h-4 w-4" />} className="w-full bg-white border-navy-200 hover:bg-navy-50 text-navy-700">
                      Call
                    </Button>
                  </a>
                )}
                <Button
                  variant="secondary"
                  icon={<Calendar className="h-4 w-4" />}
                  className="w-full bg-white border-navy-200 hover:bg-navy-50 text-navy-700"
                  onClick={() => (user ? setApptOpen(true) : navigate('/login'))}
                >
                  Visit
                </Button>
              </div>
            </div>
            
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-medium text-success-700 border border-success-100">
              <ShieldCheck className="h-4 w-4" /> Verified Professional
            </div>
          </Card>

          <PostPropertyBanner compact />

          {/* EMI Calculator / Home Loan Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-navy-900 p-6 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/20 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <h3 className="font-display text-lg font-bold">Need a Home Loan?</h3>
              <p className="text-indigo-100 text-sm mt-1">Get pre-approved in minutes with lowest interest rates.</p>
              
              <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/20">
                 <div className="flex justify-between text-sm">
                    <span className="text-indigo-200">Estimated EMI</span>
                    <span className="font-bold">₹{(property.price * 0.007).toLocaleString('en-IN')}/mo</span>
                 </div>
              </div>

              <Button variant="secondary" className="w-full mt-4 bg-white text-navy-900 hover:bg-indigo-50 border-0">
                Check Eligibility
              </Button>
            </div>
          </div>

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
                <span className="font-semibold text-navy-800">
                  {new Date(property.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-navy-500">{t('property.propertyId', 'Property ID')}</span>
                <span className="font-mono text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-navy-700">{property.id.slice(0, 8)}</span>
              </div>
            </div>
          </Card>

        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/98 backdrop-blur-xl"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute right-6 top-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-all shadow-lg"
            onClick={() => setLightbox(false)}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white font-semibold text-sm px-5 py-2 rounded-full shadow-md tracking-wide">
            {activeImg + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImg((prev) => (prev - 1 + images.length) % images.length);
              }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 grid h-14 w-14 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all shadow-2xl hover:scale-110 cursor-pointer"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          <img
            src={images[activeImg]}
            alt={`Property image ${activeImg + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveImg((prev) => (prev + 1) % images.length);
              }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 grid h-14 w-14 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all shadow-2xl hover:scale-110 cursor-pointer"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="absolute bottom-6 flex gap-3 overflow-x-auto max-w-[90vw] px-4 py-3 bg-black/50 backdrop-blur-md rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={cn(
                  'h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                  activeImg === i
                    ? 'border-red-500 scale-105 shadow-lg'
                    : 'border-transparent opacity-50 hover:opacity-100',
                )}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}


      {/* Similar properties */}
      {similar && similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-navy-900">
            {t('property.similarProperties', 'Similar Properties')}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentViews && recentViews.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-navy-900">
            {t('property.recentlyViewed', 'Recently Viewed')}
          </h2>
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
          <Button
            loading={enquiryMutation.isPending}
            onClick={() => enquiryMutation.mutate()}
            icon={<Send className="h-4 w-4" />}
            className="w-full"
          >
            {t('forms.sendEnquiry', 'Send enquiry')}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-navy-500">
          {t('property.shareDetailsMsg', 'Share your details. The agent will reach out shortly.')}
        </p>
        <div className="space-y-3">
          <Input
            label={t('forms.name', 'Name')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('forms.yourName', 'Your name')}
          />
          <Input
            label={t('forms.email', 'Email')}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@email.com"
          />
          <Input
            label={t('forms.phone', 'Phone')}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 90000 00000"
          />
          <Textarea
            label={t('forms.message', 'Message')}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder={t('forms.interestedMsg', "I'm interested in this property. Please share more details.")}
          />
          {enquiryMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" />{' '}
              {t('property.enquirySentMsg', 'Enquiry sent! The agent will contact you soon.')}
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
          <Button
            loading={apptMutation.isPending}
            onClick={() => apptMutation.mutate()}
            icon={<Calendar className="h-4 w-4" />}
            className="w-full"
          >
            {t('forms.requestAppointment', 'Request appointment')}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-navy-500">
          {t('property.pickDateMsg', 'Pick a date and time to visit this property. The agent will confirm.')}
        </p>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('forms.date', 'Date')}
              type="date"
              value={apptForm.date}
              onChange={(e) => setApptForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label={t('forms.time', 'Time')}
              type="time"
              value={apptForm.time}
              onChange={(e) => setApptForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
          <Textarea
            label={t('forms.notesOptional', 'Notes (optional)')}
            value={apptForm.notes}
            onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder={t('forms.specificRequests', 'Any specific requests or questions')}
          />
          {apptMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" />{' '}
              {t('property.apptRequestedMsg', 'Appointment requested! Check your portal for updates.')}
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
          <Button
            loading={reviewMutation.isPending}
            onClick={() => reviewMutation.mutate()}
            icon={<Star className="h-4 w-4" />}
            className="w-full"
          >
            {t('forms.submitReview', 'Submit review')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('forms.rating', 'Rating')}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReviewForm((f) => ({ ...f, rating: i }))}
                  className={i <= reviewForm.rating ? 'text-gold-400' : 'text-navy-200'}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label={t('forms.comment', 'Comment')}
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder={t('forms.shareExperience', 'Share your experience with this property')}
          />
          {reviewMutation.isSuccess && (
            <p className="text-sm text-success-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> {t('property.reviewSubmitted', 'Review submitted!')}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

