import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Heart, MessageSquare, Eye, Wallet, TrendingUp, Home, Plus, Clock, CheckCircle2, Star, Crown, Sparkles, Building } from 'lucide-react';
import { PlanDetailsModal } from '../../components/portal/plan-details-modal';
import { PackageRenewalWidget } from '../../components/portal/PackageRenewalWidget';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, StatCard, PageHeader } from '../../components/dashboard-layout';
import { Card, Button, EmptyState, Skeleton, Badge } from '../../components/ui';
import { PropertyCard, PropertyCardSkeleton } from '../../components/property-card';
import { getPortalSections } from './sections';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate , generatePropertyUrl} from '../../lib/utils';
import { useToast } from '../../components/toast';
import { fetchComparedProperties, toggleCompareProperty, clearCompareList } from '../../lib/compare';
import { RemindersWidget } from '../../components/reminders-widget';
import { motion } from 'framer-motion';
import type { Property } from '../../lib/types';
import { getPropertyCoverImage, handleImageError, DEFAULT_PROPERTY_IMAGE } from '../../lib/property-images';

export function PortalDashboard() {
  const { t } = useLanguageContext();
  const { user, profile } = useAuth();
  const sections = getPortalSections(t);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['portal-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const [properties, favorites, enquiries, views] = await Promise.all([
        supabase.from('properties').select('id, status, view_count').eq('owner_id', user.id),
        supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('customer_id', user.id),
        supabase.from('property_views').select('id', { count: 'exact', head: true }),
      ]);
      const props = properties.data ?? [];
      return {
        total: props.length,
        published: props.filter((p) => p.status === 'published').length,
        pending: props.filter((p) => ['submitted', 'pending_verification', 'approved'].includes(p.status)).length,
        drafts: props.filter((p) => p.status === 'draft').length,
        views: props.reduce((a, p) => a + (p.view_count ?? 0), 0),
        favorites: favorites.count ?? 0,
        enquiries: enquiries.count ?? 0,
      };
    },
    enabled: !!user,
  });

  const { data: myProperties } = useQuery({
    queryKey: ['portal-my-latest', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return (data ?? []).map((p) => mapJoined(p as unknown as Record<string, unknown>)) as unknown as Property[];
    },
    enabled: !!user,
  });

  const { data: recentEnquiries } = useQuery({
    queryKey: ['portal-enquiries-latest', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enquiries')
        .select('*, property:properties(title)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout
      sections={sections}
      title={t('nav.dashboard', 'Dashboard')}
      badge={profile?.first_name ?? undefined}
    >
      <PageHeader
        title={`${t('portal.welcomeBack', 'Welcome back')}, ${profile?.first_name ?? ''}`}
        subtitle={t('portal.activityOverview', "Here's an overview of your real estate activity.")}
        action={
          <PostPropertyLink to="/portal/list-property">
            <Button icon={<Plus className="h-4 w-4" />}>{t('forms.postProperty', 'List Property')}</Button>
          </PostPropertyLink>
        }
      />

      <div className="mb-6">
        <PackageRenewalWidget />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label={t('portal.myProperties', 'My Properties')}
              value={stats.total}
              icon={<Building2 className="h-5 w-5" />}
              accent="navy"
              to="/portal/my-properties"
            />
            <StatCard
              label={t('portal.published', 'Published')}
              value={stats.published}
              icon={<Home className="h-5 w-5" />}
              accent="success"
              trend={`${stats.pending} ${t('portal.pending', 'pending')}`}
              to="/portal/my-properties"
            />
            <StatCard
              label={t('portal.totalViews', 'Total Views')}
              value={stats.views}
              icon={<Eye className="h-5 w-5" />}
              accent="gold"
              to="/portal/my-properties"
            />
            <StatCard
              label={t('portal.savedAndEnquiries', 'Saved & Enquiries')}
              value={`${stats.favorites} / ${stats.enquiries}`}
              icon={<Heart className="h-5 w-5" />}
              accent="navy"
              to="/portal/saved-properties"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              {t('portal.latestProps', 'My latest properties')}
            </h3>
            <Link to="/portal/my-properties" className="text-sm font-medium text-navy-700 hover:text-navy-900">
              {t('home.viewAll', 'View all')}
            </Link>
          </div>
          {!myProperties ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <PropertyCardSkeleton />
              <PropertyCardSkeleton />
            </div>
          ) : myProperties.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {myProperties.map((p) => (
                <PropertyCard key={p.id} property={p} compact />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title={t('portal.noPropertiesTitle', 'No properties yet')}
                description={t('portal.noPropertiesDesc', 'List your first property to reach thousands of buyers.')}
                action={
                  <PostPropertyLink to="/portal/list-property">
                    <Button icon={<Plus className="h-4 w-4" />}>{t('forms.postProperty', 'List Property')}</Button>
                  </PostPropertyLink>
                }
              />
            </Card>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              {t('portal.recentEnquiries', 'Recent enquiries')}
            </h3>
            <Link to="/portal/enquiries" className="text-sm font-medium text-navy-700 hover:text-navy-900">
              {t('home.viewAll', 'View all')}
            </Link>
          </div>
          <Card className="divide-y divide-navy-50">
            {!recentEnquiries ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentEnquiries.length > 0 ? (
              recentEnquiries.map((e) => (
                <div key={e.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-navy-900 truncate">
                      {(e as Record<string, unknown>).property
                        ? ((e as { property: { title: string } }).property?.title ??
                          t('portal.propEnquiry', 'Property enquiry'))
                        : t('portal.propEnquiry', 'Property enquiry')}
                    </p>
                    <Badge variant={e.status === 'new' ? 'info' : 'default'}>{e.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-navy-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(e.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<MessageSquare className="h-6 w-6" />}
                title={t('portal.noEnquiries', 'No enquiries yet')}
                description={t('portal.enquiriesAppearHere', 'Enquiries on your listings will appear here.')}
              />
            )}
          </Card>
          <div className="mt-6">
            <RemindersWidget />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function PortalSaved() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const sections = getPortalSections(t);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-saved', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('favorites')
        .select('id, property:properties(*, cities(name), localities(name), property_types(name))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []).map((f) => ({
        ...f,
        property: Array.isArray(f.property) ? f.property[0] : f.property,
      })) as unknown as { id: string; property: Property }[];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={sections} title={t('common.saved', 'Saved Properties')}>
      <PageHeader
        title={t('common.saved', 'Saved properties')}
        subtitle={t('portal.bookmarkedSub', "Properties you've bookmarked for later.")}
      />
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((f) => f.property && <PropertyCard key={f.id} property={f.property} />)}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Heart className="h-6 w-6" />}
            title={t('portal.noSavedProps', 'No saved properties')}
            description={t('portal.heartToSave', 'Tap the heart icon on any listing to save it here.')}
            action={
              <Link to="/search">
                <Button variant="secondary">{t('search.browseAll', 'Browse properties')}</Button>
              </Link>
            }
          />
        </Card>
      )}
    </DashboardLayout>
  );
}

export function PortalCompare() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const { addToast } = useToast();
  const sections = getPortalSections(t);

  const {
    data: properties,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['portal-compare-list', user?.id],
    queryFn: () => fetchComparedProperties(user?.id),
  });

  const items = properties ?? [];

  const handleRemove = async (id: string) => {
    try {
      await toggleCompareProperty(id, user?.id);
      addToast('success', t('compare.removedToast', 'Property removed from comparison'));
      refetch();
    } catch {
      addToast('error', t('common.error', 'Failed to remove property'));
    }
  };

  const handleClearAll = async () => {
    try {
      await clearCompareList(user?.id);
      addToast('success', t('compare.clearedToast', 'Comparison list cleared'));
      refetch();
    } catch {
      addToast('error', t('common.error', 'Failed to clear list'));
    }
  };

  const specs = [
    {
      label: t('property.price', 'Price'),
      render: (p: Property) => <span className="font-bold text-red-600">{formatPrice(p.price, p.purpose)}</span>,
    },
    {
      label: t('search.purposeLabel', 'Purpose'),
      render: (p: Property) => (
        <Badge variant={p.purpose === 'Rent' ? 'info' : 'gold'}>
          {p.purpose === 'Rent' ? t('property.forRent', 'For Rent') : t('property.forSale', 'For Sale')}
        </Badge>
      ),
    },
    { label: t('search.propertyTypeLabel', 'Property Type'), render: (p: Property) => p.property_type_name ?? '—' },
    {
      label: t('property.bedrooms', 'Bedrooms (BHK)'),
      render: (p: Property) => (p.bedrooms ? `${p.bedrooms} BHK` : '—'),
    },
    { label: t('property.bathrooms', 'Bathrooms'), render: (p: Property) => p.bathrooms ?? '—' },
    {
      label: t('property.builtUpArea', 'Built-up Area'),
      render: (p: Property) => (p.built_up_area ? `${p.built_up_area} sqft` : '—'),
    },
    { label: t('search.furnishingLabel', 'Furnishing'), render: (p: Property) => p.furnishing ?? '—' },
    { label: t('search.facingLabel', 'Facing'), render: (p: Property) => p.facing ?? '—' },
    {
      label: t('property.parking', 'Parking'),
      render: (p: Property) => (p.parking ? t('common.yes', 'Available') : t('common.no', 'No')),
    },
    { label: t('search.cityLabel', 'City'), render: (p: Property) => p.city_name ?? '—' },
    { label: t('search.localityLabel', 'Locality'), render: (p: Property) => p.locality_name ?? '—' },
  ];

  return (
    <DashboardLayout sections={sections} title={t('compare.title', 'Compare')}>
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title={t('compare.title', 'Compare Properties')}
          subtitle={t('compare.subtitle', 'Side-by-side comparison of your selected properties (up to 4).')}
        />
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-error-600 hover:bg-error-50">
            {t('search.clearAll', 'Clear All')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="h-8 w-8 text-navy-400" />}
            title={t('compare.emptyTitle', 'No properties selected to compare')}
            description={t(
              'compare.emptyDesc',
              'Click the compare icon on any property card or detail page to add up to 4 properties side-by-side.',
            )}
            action={
              <Link to="/search">
                <Button variant="primary">{t('search.browseAll', 'Browse Properties')}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50">
                <th className="p-4 font-semibold text-navy-500 w-48 sticky left-0 bg-navy-50 z-10">
                  {t('compare.propertyCol', 'Property')}
                </th>
                {items.map((p) => (
                  <th key={p.id} className="p-4 min-w-[240px] max-w-[280px] align-top border-l border-navy-100">
                    <div className="space-y-2">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-navy-100">
                        <img
                          src={getPropertyCoverImage(p)}
                          alt={p.title}
                          onError={(e) => handleImageError(e, DEFAULT_PROPERTY_IMAGE)}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemove(p.id)}
                          className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-navy-950/70 text-white hover:bg-error-600 transition cursor-pointer"
                          title={t('compare.remove', 'Remove from comparison')}
                        >
                          ✕
                        </button>
                      </div>
                      <Link
                        to={generatePropertyUrl(p)}
                        className="font-display font-bold text-navy-900 hover:text-red-600 line-clamp-2 block"
                      >
                        {p.title}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {specs.map((s) => (
                <tr key={s.label} className="hover:bg-navy-50/30">
                  <td className="p-4 font-medium text-navy-700 sticky left-0 bg-white z-10 border-r border-navy-100">
                    {s.label}
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className="p-4 text-navy-800 border-l border-navy-100">
                      {s.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4 font-medium text-navy-700 sticky left-0 bg-white z-10 border-r border-navy-100">
                  {t('portal.actions', 'Action')}
                </td>
                {items.map((p) => (
                  <td key={p.id} className="p-4 border-l border-navy-100">
                    <Link to={generatePropertyUrl(p)}>
                      <Button size="sm" variant="secondary" className="w-full">
                        {t('compare.viewProperty', 'View Details')}
                      </Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </DashboardLayout>
  );
}

import { RazorpayCheckout } from '../../components/payments/razorpay-checkout';
import { PostPropertyLink } from '../../components/post-property-link';

export function PortalSubscription() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const sections = getPortalSections(t);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('packages').select('*').eq('is_active', true).order('tier', { ascending: true });
      return data ?? [];
    },
  });

  const { data: mySub, refetch: refetchMySub } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_packages')
        .select('*, package:packages(*)')
        .eq('agent_id', user!.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={sections} title={t('portal.subscription', 'Subscription')}>
      <PageHeader
        title={t('portal.subscription', 'Subscription')}
        subtitle={t('portal.subSubtitle', 'Upgrade to unlock unlimited listings and AI features.')}
      />
      {mySub && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="mb-8 border-success-200 bg-gradient-to-r from-success-50/80 to-emerald-50/40 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-600">{t('portal.currentPlan', 'Current plan')}</p>
              <p className="font-display text-xl font-bold text-navy-900">
                {(mySub as any)?.package?.name ??
                  t('portal.active', 'Active')}
              </p>
              <p className="text-xs text-navy-500">
                {t('portal.started', 'Started')} {formatDate((mySub as any)?.start_date)}
              </p>
            </div>
            <Badge variant="success" className="px-3 py-1 text-sm shadow-sm">{t('portal.active', 'Active')}</Badge>
          </div>
        </Card>
        </motion.div>
      )}

      {/* NEW PREMIUM HERO BANNER */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="mb-12 relative overflow-hidden rounded-[2rem] bg-navy-950 text-white shadow-2xl"
      >
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000" 
            alt="Luxury Real Estate" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-900/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-bold tracking-wider text-white uppercase">Premium Plans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight mb-4">
              Scale your real estate business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">RealtyNow</span>
            </h2>
            <p className="text-navy-200 text-lg sm:text-xl mb-8 max-w-lg">
              Get more leads, priority listings, and advanced AI tools to close deals faster. Choose the plan that fits your ambition.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success-400" />
                <span className="text-sm font-medium">Verified Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success-400" />
                <span className="text-sm font-medium">Priority Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success-400" />
                <span className="text-sm font-medium">AI Insights</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex relative">
            <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
            <Building className="h-48 w-48 text-white/90 drop-shadow-2xl relative z-10" strokeWidth={1} />
            <Sparkles className="absolute -top-4 -right-4 h-12 w-12 text-yellow-400 animate-pulse z-20" />
          </div>
        </div>
      </motion.div>

      <div className="flex justify-center mb-10">
        <div className="bg-navy-50/80 p-1.5 rounded-xl inline-flex shadow-inner border border-navy-100">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              billingCycle === 'monthly' ? 'bg-white text-navy-900 shadow-md ring-1 ring-black/5' : 'text-navy-500 hover:text-navy-900 hover:bg-navy-100/50'
            }`}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
              billingCycle === 'yearly' ? 'bg-white text-navy-900 shadow-md ring-1 ring-black/5' : 'text-navy-500 hover:text-navy-900 hover:bg-navy-100/50'
            }`}
          >
            Yearly billing <span className="ml-1 text-xs text-success-600 bg-success-100 px-1.5 py-0.5 rounded-md">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto pb-12">
        {plans?.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 bg-white shadow-lg hover:shadow-2xl ${
              i === 1 ? 'border-2 border-primary-500 shadow-primary-500/10' : 'border border-gray-100'
            }`}
          >
            {i === 1 && (
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <div className="bg-gradient-to-r from-primary-500 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" /> {t('portal.mostPopular', 'Most popular')}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="font-display text-2xl font-bold text-navy-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline text-navy-900">
                <span className="text-5xl font-extrabold tracking-tight">
                  {plan.price_monthly === 0 ? t('common.free', 'Free') : `₹${billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly}`}
                </span>
                <span className="ml-1 text-lg font-medium text-navy-500">
                  /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </div>
            </div>

            <ul className="mb-8 space-y-4 flex-1">
              {(plan.features_json as string[] | null)?.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className={`h-5 w-5 shrink-0 ${i === 1 ? 'text-primary-500' : 'text-success-500'}`} />
                  <span className="text-sm font-medium text-navy-700">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3">
              <Button
                variant="secondary"
                className="w-full bg-white text-navy-900 border-navy-200 hover:bg-navy-50 hover:text-navy-900 shadow-sm"
                onClick={() => setSelectedPlan(plan)}
              >
                View Details
              </Button>
              {plan.price_monthly === 0 || (mySub as any)?.package_id === plan.id ? (
                <button 
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                    i === 1 ? 'bg-primary-50 text-primary-700 cursor-default' : 'bg-gray-50 text-gray-500 cursor-default'
                  }`} 
                  disabled
                >
                  {t('portal.current', 'Current Plan')}
                </button>
              ) : (
                <RazorpayCheckout
                  packageId={plan.id}
                  billingCycle={billingCycle}
                  buttonText={t('portal.upgrade', 'Upgrade Now')}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md ${
                    i === 1 
                      ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700' 
                      : 'bg-navy-900 text-white hover:bg-navy-800'
                  }`}
                  onSuccess={() => refetchMySub()}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <PlanDetailsModal
        plan={selectedPlan}
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        billingCycle={billingCycle}
      />
    </DashboardLayout>
  );
}

export function PortalInvoices() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const sections = getPortalSections(t);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-invoices', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={sections} title={t('portal.invoices', 'Invoices')}>
      <PageHeader
        title={t('portal.invoices', 'Invoices')}
        subtitle={t('portal.paymentHistory', 'Your payment history.')}
      />
      <Card className="divide-y divide-navy-50">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          data.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {p.invoice_number ?? p.reference ?? t('portal.payment', 'Payment')}
                </p>
                <p className="text-xs text-navy-500">{formatDate(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-navy-900">{formatPrice(p.amount)}</span>
                <Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'error'}>
                  {p.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={t('portal.noInvoices', 'No invoices yet')}
            description={t('portal.invoicesAppearHere', 'Your payment history will appear here.')}
          />
        )}
      </Card>
    </DashboardLayout>
  );
}

