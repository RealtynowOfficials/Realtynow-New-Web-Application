import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Edit3, Trash2, Send, Eye, Building2, Share2, MapPin, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { SharePropertyModal } from '../../components/ui/share-property-modal';
import { useToast } from '../../components/toast';

import { getPortalSections, getAgentSections } from './sections';
import { Button, Card, EmptyState, Modal, Badge, Select, Input } from '../../components/ui';
import { StatusBadge } from '../../components/property-card';
import { DataTable, type Column, BulkActionsBar } from '../../components/data-table';
import { submitPropertyForReview } from '../../lib/properties';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate, generatePropertyUrl, getPropertyPrice } from '../../lib/utils';
import { getPriceUnitLabel } from '../../lib/plot-pricing';
import { PropertyPriceCell } from '../../components/ui/property-price-cell';
import { formatPropertyLocation } from '../../lib/location-formatter';
import type { Property } from '../../lib/types';
import { getPropertyCoverImage, handleImageError, DEFAULT_PROPERTY_IMAGE } from '../../lib/property-images';
import { ExportMenu } from '../../components/export-menu';
import { SavedFiltersMenu } from '../../components/saved-filters-menu';
import { useSavedFilters } from '../../lib/saved-filters';
import { PostPropertyLink } from '../../components/post-property-link';
import { EditPropertyModal } from '../../components/portal/edit-property-modal';
import { EnableNotificationsCard } from '../../components/enable-notifications-card';
import { fetchActiveCustomerSubscription } from '../../lib/subscriptions';
import { CITY_AREAS_MASTER } from '../../lib/location-service';
import { DEFAULT_PROPERTY_TYPES, fetchAllPropertyTypes } from '../../lib/indian-cities';

const MY_PROPERTIES_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Property' },
  { key: 'locality_name', label: 'Locality' },
  { key: 'city_name', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
];

interface MyPropertiesFilterState {
  city: string;
  area: string;
  type: string;
  purpose: string;
  minPrice: string;
  maxPrice: string;
}

export function PortalMyProperties() {
  const { t } = useLanguageContext();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<string>(() => searchParams.get('tab') || 'all');

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab && ['all', 'draft', 'pending', 'published', 'rejected'].includes(paramTab)) {
      setTab(paramTab);
    }
  }, [searchParams]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [propertyToSubmit, setPropertyToSubmit] = useState<Property | null>(null);
  const [shareProperty, setShareProperty] = useState<Property | null>(null);
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleRows, setVisibleRows] = useState<Property[]>([]);
  const [rich, setRich] = useState<MyPropertiesFilterState>({
    city: '',
    area: '',
    type: '',
    purpose: '',
    minPrice: '',
    maxPrice: '',
  });
  const savedFilters = useSavedFilters<MyPropertiesFilterState>('portal-my-properties');

  const sections = profile?.role === 'agent' ? getAgentSections(t) : getPortalSections(t);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-my-properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(id, name), localities(id, name), property_types(id, name, category)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []).map((p) => mapJoined(p as unknown as Record<string, unknown>)) as unknown as Property[];
    },
    enabled: !!user,
  });

  // Query DB property types to merge with defaults
  const { data: dbTypes } = useQuery({
    queryKey: ['portal-property-types-list'],
    queryFn: async () => {
      return await fetchAllPropertyTypes();
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: mySub } = useQuery({
    queryKey: ['my-active-subscription', user?.id],
    queryFn: () => (user ? fetchActiveCustomerSubscription(user.id) : null),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('portal-properties-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const tabs = [
    { key: 'all', label: t('blog.allCategories', 'All') },
    { key: 'draft', label: t('portal.drafts', 'Drafts') },
    { key: 'pending', label: t('portal.pending', 'Pending') },
    { key: 'published', label: t('portal.published', 'Published') },
    { key: 'rejected', label: t('portal.rejected', 'Rejected') },
  ];

  const getTabCount = (key: string) => {
    return (data ?? []).filter((p) => {
      if (key === 'all') return true;
      if (key === 'draft') return p.status === 'draft';
      if (key === 'pending')
        return p.status !== 'draft' && (['submitted', 'pending_verification'].includes(p.status) || p.approval_status === 'Pending');
      if (key === 'published') return (p.status === 'published' || p.is_live) && p.status !== 'rejected';
      if (key === 'rejected')
        return p.status !== 'draft' && (['rejected', 'changes_requested'].includes(p.status) || p.approval_status === 'Rejected');
      return p.status === key;
    }).length;
  };

  // Master lists for Hyderabad areas and property types
  const filterOptions = useMemo(() => {
    // 1. Hyderabad Master Localities + user dynamic localities
    const areaSet = new Set<string>(CITY_AREAS_MASTER.hyderabad || []);
    (data ?? []).forEach((p) => {
      if (p.locality_name) areaSet.add(p.locality_name.trim());
      if ((p as any).locality?.name) areaSet.add((p as any).locality.name.trim());
    });
    const sortedAreas = Array.from(areaSet).filter(Boolean).sort((a, b) => a.localeCompare(b));

    // 2. Property types roster (defaults + db + user records)
    const typeMap = new Map<string, string>();
    DEFAULT_PROPERTY_TYPES.forEach((pt) => typeMap.set(pt.name.toLowerCase().trim(), pt.name));
    (dbTypes ?? []).forEach((pt) => typeMap.set(pt.name.toLowerCase().trim(), pt.name));
    (data ?? []).forEach((p) => {
      if (p.property_type_name) typeMap.set(p.property_type_name.toLowerCase().trim(), p.property_type_name.trim());
      if ((p as any).property_types?.name) typeMap.set((p as any).property_types.name.toLowerCase().trim(), (p as any).property_types.name.trim());
    });
    const sortedTypes = Array.from(typeMap.values()).sort((a, b) => a.localeCompare(b));

    return {
      areas: sortedAreas,
      types: sortedTypes,
      cities: [
        { value: '', label: 'All Hyderabad Regions' },
        { value: 'Hyderabad', label: 'Hyderabad (City-Wide)' },
        { value: 'Secunderabad', label: 'Secunderabad' },
      ],
      purposes: [
        { value: '', label: 'All Purposes' },
        { value: 'For Sale', label: 'For Sale' },
        { value: 'For Rent', label: 'For Rent / Lease' },
      ],
    };
  }, [data, dbTypes]);

  const filtered = useMemo(() => {
    return (data ?? []).filter((p) => {
      // 1. Status Tab filter
      if (tab === 'all') {
        /* no-op */
      } else if (tab === 'draft') {
        if (p.status !== 'draft') return false;
      } else if (tab === 'pending') {
        if (p.status === 'draft' || !(['submitted', 'pending_verification'].includes(p.status) || p.approval_status === 'Pending')) return false;
      } else if (tab === 'published') {
        if (!((p.status === 'published' || p.is_live) && p.status !== 'rejected')) return false;
      } else if (tab === 'rejected') {
        if (p.status === 'draft' || !(['rejected', 'changes_requested'].includes(p.status) || p.approval_status === 'Rejected')) return false;
      } else if (p.status !== tab) return false;

      // 2. Hyderabad Area / Locality filter
      if (rich.area) {
        const areaLower = rich.area.toLowerCase().trim();
        const pLoc = (p.locality_name || (p as any).locality?.name || '').toLowerCase();
        const pAddr = (p.address || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const pDesc = (p.description || '').toLowerCase();
        const match =
          pLoc.includes(areaLower) ||
          pAddr.includes(areaLower) ||
          pTitle.includes(areaLower) ||
          pDesc.includes(areaLower);
        if (!match) return false;
      }

      // 3. City / Region filter
      if (rich.city) {
        const cityLower = rich.city.toLowerCase().trim();
        const pCity = (p.city_name || (p as any).cities?.name || (p as any).city || 'Hyderabad').toLowerCase();
        const pAddr = (p.address || '').toLowerCase();
        const pLoc = (p.locality_name || '').toLowerCase();
        const match = pCity.includes(cityLower) || pAddr.includes(cityLower) || pLoc.includes(cityLower) || !p.city_name;
        if (!match) return false;
      }

      // 4. Property Type filter
      if (rich.type) {
        const typeLower = rich.type.toLowerCase().trim();
        const pTypeName = (p.property_type_name || (p as any).property_types?.name || (p as any).property_type || '').toLowerCase();
        const pTypeId = (p.property_type_id || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const pCat = ((p as any).category || '').toLowerCase();
        const match =
          pTypeId === typeLower ||
          pTypeName.includes(typeLower) ||
          typeLower.includes(pTypeName) ||
          pTitle.includes(typeLower) ||
          pCat.includes(typeLower);
        if (!match) return false;
      }

      // 5. Purpose filter
      if (rich.purpose) {
        const purpLower = rich.purpose.toLowerCase().trim();
        const pPurp = (p.purpose || 'For Sale').toLowerCase().trim();
        if (!pPurp.includes(purpLower) && !purpLower.includes(pPurp)) return false;
      }

      // 6. Price filters
      const effectivePrice = getPropertyPrice(p) || p.price || 0;
      if (rich.minPrice && Number(rich.minPrice) > 0 && effectivePrice < Number(rich.minPrice)) return false;
      if (rich.maxPrice && Number(rich.maxPrice) > 0 && effectivePrice > Number(rich.maxPrice)) return false;

      return true;
    });
  }, [data, tab, rich]);

  const hasActiveFilters = Boolean(
    rich.area || rich.city || rich.type || rich.purpose || rich.minPrice || rich.maxPrice,
  );

  const resetFilters = () => {
    setRich({
      city: '',
      area: '',
      type: '',
      purpose: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitPropertyForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });
      toast.addToast('success', 'Property submitted for admin review!');
    },
    onError: (err: any) => {
      toast.addToast('error', err?.message || 'Failed to submit property.');
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { resubmitProperty } = await import('../../lib/properties');
      return resubmitProperty(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });
      toast.addToast('success', 'Property resubmitted for admin review!');
    },
    onError: (err: any) => {
      toast.addToast('error', err?.message || 'Failed to resubmit property.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('properties').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      setToDelete(null);
    },
  });

  const bulkDelete = async () => {
    await Promise.all([...selected].map((id) => supabase.from('properties').delete().eq('id', id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const columns: Column<Property>[] = [
    {
      key: 'title',
      header: t('common.property', 'Property'),
      sortable: true,
      className: 'min-w-[280px]',
      render: (p) => (
        <div className="flex items-center gap-3">
          <img
            src={getPropertyCoverImage(p)}
            alt=""
            onError={(e) => handleImageError(e, DEFAULT_PROPERTY_IMAGE)}
            className="h-12 w-16 rounded-xl object-cover ring-1 ring-navy-100 shrink-0"
          />
          <div className="min-w-0">
            <Link to={generatePropertyUrl(p)} className="font-bold text-navy-900 hover:text-red-600 truncate block text-sm transition-colors">
              {p.title}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-navy-500">
              <span className="font-semibold text-navy-700">{p.property_type_name || 'Property'}</span>
              <span>•</span>
              <span className="truncate flex items-center gap-0.5" title={formatPropertyLocation(p)}>
                <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                {formatPropertyLocation(p)}
              </span>
            </div>
            {(p as any).rera_number && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-1 inline-block">
                RERA: {(p as any).rera_number}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: t('property.purpose', 'Purpose'),
      render: (p) => {
        const isSale = p.purpose === 'Sale' || p.purpose === 'Resale';
        return (
          <Badge variant={isSale ? 'default' : 'info'}>
            {isSale ? t('common.forSale', 'For Sale') : t('common.forRent', 'For Rent')}
          </Badge>
        );
      },
    },
    {
      key: 'price',
      header: `${t('property.price', 'Price')} / ${t('property.rent', 'Rent')}`,
      sortable: true,
      className: 'whitespace-nowrap min-w-[170px]',
      render: (p) => <PropertyPriceCell property={p} />,
    },
    {
      key: 'status',
      header: t('portal.workflowProgress', 'Workflow Progress'),
      className: 'min-w-[220px]',
      render: (p) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={p.status} />
            {p.is_live && p.status !== 'rejected' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ {t('portal.liveOnPortal', 'Live on Portal')}
              </span>
            )}
          </div>
          <div>
            {p.status === 'draft' ? (
              <span className="text-[11px] text-navy-500 font-medium italic">
                Draft (Not Submitted)
              </span>
            ) : p.status === 'rejected' ? (
              <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 whitespace-normal max-w-[280px]">
                <span className="font-bold">{t('portal.rejected', 'Rejected')}:</span>{' '}
                {p.rejection_reason || 'Needs corrections'}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 rounded-md ${['submitted', 'pending_verification', 'approved', 'published'].includes(p.status) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`}
                >
                  {t('portal.submitted', 'Submitted')}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${['pending_verification', 'changes_requested', 'approved', 'published'].includes(p.status) ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-500'}`}
                >
                  {t('portal.underReview', 'Under Review')}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${['approved', 'published'].includes(p.status) || p.is_live ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-500'}`}
                >
                  {p.is_live || p.status === 'published' ? t('portal.live', 'Live') : t('portal.approved', 'Approved')}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'view_count',
      header: t('property.views', 'Views'),
      sortable: true,
      className: 'whitespace-nowrap min-w-[130px]',
      render: (p) => (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50/90 px-3 py-1 text-xs font-black text-red-600 border border-red-100/90 shadow-2xs whitespace-nowrap">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>{p.view_count || 0} {p.view_count === 1 ? 'View' : 'Views'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: t('portal.created', 'Created'),
      sortable: true,
      className: 'whitespace-nowrap min-w-[130px] text-slate-700 font-semibold text-xs',
      render: (p) => <span className="whitespace-nowrap">{formatDate(p.created_at)}</span>,
    },
    {
      key: 'actions',
      header: t('portal.actions', 'Actions'),
      className: 'whitespace-nowrap min-w-[180px] text-right',
      render: (p) => (
        <div className="flex items-center gap-1 justify-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {p.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Send className="h-4 w-4" />}
              onClick={() => {
                const price = p.purpose === 'Rent' ? (p.rent_amount ?? p.price) : p.price;
                const hasMinDetails = (Number(price) > 0 || (p as any).price_per_unit) && p.title && p.address;
                if (!hasMinDetails) {
                  toast.addToast('error', 'Please enter price, title, and location before submitting.');
                  setEditPropertyId(p.id);
                  return;
                }
                setPropertyToSubmit(p);
              }}
              loading={submitMutation.isPending && propertyToSubmit?.id === p.id}
            >
              {t('portal.submit', 'Submit')}
            </Button>
          )}
          {(p.status === 'rejected' || p.status === 'changes_requested') && (
            <Button
              size="sm"
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              onClick={() => resubmitMutation.mutate(p.id)}
              loading={resubmitMutation.isPending}
            >
              {t('portal.resubmit', 'Resubmit')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<Edit3 className="h-4 w-4" />}
            title="Edit property"
            onClick={() => setEditPropertyId(p.id)}
          />
          <Link to={generatePropertyUrl(p)}>
            <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} />
          </Link>
          {p.status !== 'draft' && (
            <Button 
              size="sm" 
              variant="ghost" 
              icon={<Share2 className="h-4 w-4" />} 
              onClick={() => setShareProperty(p)} 
              title="Share Property"
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-error-600"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setToDelete(p.id)}
            disabled={
              !['draft', 'submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(p.status)
            }
          />
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout sections={sections} title={t('portal.myProperties', 'My Properties')}>
      <PageHeader
        title={t('portal.myProperties', 'My Properties')}
        subtitle={t('portal.managePropertiesSub', 'Track submissions, edit verified listings, view live engagement, and publish properties in Hyderabad.')}
        action={
          <div className="flex items-center gap-2">
            <SavedFiltersMenu
              presets={savedFilters.presets}
              onApply={(f: MyPropertiesFilterState) => setRich(f)}
              onSave={(name: string) => savedFilters.save(name, rich)}
              onRemove={(id: string) => savedFilters.remove(id)}
            />
            <ExportMenu
              rows={visibleRows as unknown as Record<string, unknown>[]}
              filename="my-properties"
              columns={MY_PROPERTIES_EXPORT_COLUMNS}
            />
            <PostPropertyLink
              to={profile?.role === 'agent' ? '/agent/list-property' : '/portal/list-property'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>{t('forms.postProperty', 'Post Property')}</span>
              <span className="bg-amber-300 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                FREE
              </span>
            </PostPropertyLink>
          </div>
        }
      />

      {/* Subscription Quota & Plan Status Banner */}
      {mySub && (
        <div className="mb-4 p-4 rounded-2xl bg-white border border-navy-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-navy-900">{mySub.plan_name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  {mySub.status}
                </span>
                <span className="text-[11px] text-navy-400 font-semibold">• {mySub.visibility_level} Visibility</span>
              </div>
              <p className="text-xs text-navy-600 mt-0.5">
                Using <strong>{mySub.listings_used}</strong> of <strong>{mySub.listing_limit}</strong> listing quota ({mySub.remaining_days} days remaining)
              </p>
            </div>
          </div>
          <Link
            to="/portal/subscription"
            className="px-3.5 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-xs self-start sm:self-auto transition-all"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      <EnableNotificationsCard context="your listings" className="mb-4" />

      {/* Status Tabs & Hyderabad Filter Bar */}
      <div className="sticky top-16 z-20 -mx-1 mb-4 space-y-3 bg-navy-50/95 px-1 pb-3 pt-1 backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tItem) => {
            const count = getTabCount(tItem.key);
            return (
              <button
                key={tItem.key}
                onClick={() => setTab(tItem.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${tab === tItem.key ? 'bg-navy-900 text-white shadow-md' : 'text-navy-600 hover:bg-navy-100 bg-white border border-slate-200'}`}
              >
                {tItem.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === tItem.key ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-600'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Hyderabad Area, Property Type, Purpose & Price Filter Bar */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* 1. Hyderabad Area / Locality Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>Hyderabad Area</span>
              </label>
              <Select
                value={rich.area}
                onChange={(e) => setRich((f) => ({ ...f, area: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="">All Hyderabad Areas</option>
                {filterOptions.areas.map((areaName) => (
                  <option key={areaName} value={areaName}>
                    {areaName}
                  </option>
                ))}
              </Select>
            </div>

            {/* 2. Property Type Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-navy-500" />
                <span>Property Type</span>
              </label>
              <Select
                value={rich.type}
                onChange={(e) => setRich((f) => ({ ...f, type: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="">All Property Types</option>
                {filterOptions.types.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {typeName}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Purpose Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Purpose</label>
              <Select
                value={rich.purpose}
                onChange={(e) => setRich((f) => ({ ...f, purpose: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              >
                {filterOptions.purposes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* 4. Min Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Min Price (₹)</label>
              <Input
                type="number"
                placeholder="₹ Min price"
                value={rich.minPrice}
                onChange={(e) => setRich((f) => ({ ...f, minPrice: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* 5. Max Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Max Price (₹)</label>
              <Input
                type="number"
                placeholder="₹ Max price"
                value={rich.maxPrice}
                onChange={(e) => setRich((f) => ({ ...f, maxPrice: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* 6. Filter Controls / Reset */}
            <div className="space-y-1 flex flex-col justify-end">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all border border-red-200 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset ({filtered.length})</span>
                </button>
              ) : (
                <div className="h-9 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  <span>{filtered.length} Properties</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {selected.size > 0 && <BulkActionsBar count={selected.size} onDelete={bulkDelete} />}
      
      {filtered.length === 0 && !isLoading ? (
        <Card className="p-8 text-center rounded-2xl border border-slate-200">
          <EmptyState
            icon={<Building2 className="h-8 w-8 text-red-500" />}
            title={hasActiveFilters ? "No matching properties found" : t('portal.noPropertiesTitle', 'No properties here')}
            description={
              hasActiveFilters
                ? "Try adjusting your area, property type, or price filters."
                : t('portal.noPropertiesDesc', 'List your first property to see it here.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <PostPropertyLink to="/portal/list-property">
                  <Button variant="primary">{t('forms.postProperty', 'List Property')}</Button>
                </PostPropertyLink>
              )
            }
          />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error instanceof Error ? error.message : null}
          getRowId={(p) => p.id}
          searchPlaceholder="Search your properties by title, locality, address, ID..."
          searchKeys={['title', 'locality_name', 'city_name', 'address', 'property_type_name', 'id']}
          dateKey="created_at"
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onSelectAll={(ids) =>
            setSelected((s) => {
              const n = new Set(s);
              ids.forEach((id) => (n.has(id) ? n.delete(id) : n.add(id)));
              return n;
            })
          }
          onVisibleRowsChange={setVisibleRows}
          cardRender={(p) => (
            <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
              <div>
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-navy-100">
                  <img
                    src={getPropertyCoverImage(p)}
                    alt=""
                    onError={(e) => handleImageError(e, DEFAULT_PROPERTY_IMAGE)}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <h4 className="font-bold text-navy-900 text-base line-clamp-1">{p.title}</h4>
                <p className="text-xs text-navy-500 mt-0.5">
                  {p.property_type_name ?? 'Property'} {p.locality_name ? `• ${p.locality_name}` : ''}
                </p>
                
                {p.status === 'draft' ? (
                  <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-navy-900">{p.completion_percentage ?? 0}% Complete</span>
                      <span className="text-[10px] text-navy-500 font-medium">Last Saved: {formatDate(p.updated_at || p.created_at)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-500 to-rose-500 h-1.5 rounded-full" style={{ width: `${p.completion_percentage ?? 0}%` }}></div>
                    </div>
                    <p className="text-[11px] text-navy-600">
                      Current Step: <span className="font-bold">Step {((p.current_step ?? 0) + 1)}</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-navy-900 mt-2 text-lg">{formatPrice(getPropertyPrice(p), p.purpose)}</p>
                    {p.price_per_unit != null && (
                      <p className="text-xs font-semibold text-navy-500">{formatPrice(p.price_per_unit)} / {getPriceUnitLabel(p.area_unit)}</p>
                    )}
                    <p className="text-xs text-navy-400 mt-1">
                      {t('portal.submitted', 'Submitted')}: {formatDate(p.created_at)}
                    </p>
                    {p.rejection_reason && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                        {t('portal.reason', 'Reason')}: {p.rejection_reason}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
                {(p.status === 'rejected' || p.status === 'changes_requested') && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Send className="h-4 w-4" />}
                    onClick={() => resubmitMutation.mutate(p.id)}
                    loading={resubmitMutation.isPending}
                  >
                    {t('portal.resubmit', 'Resubmit')}
                  </Button>
                )}
                {p.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1"
                    onClick={() => setEditPropertyId(p.id)}
                  >
                    Continue Listing
                  </Button>
                ) : null}
                <div className="flex gap-1 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Edit3 className="h-4 w-4" />}
                    title="Edit property"
                    onClick={() => setEditPropertyId(p.id)}
                  />
                  <Link to={generatePropertyUrl(p)}>
                    <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} />
                  </Link>
                  {p.status !== 'draft' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      icon={<Share2 className="h-4 w-4" />} 
                      onClick={() => setShareProperty(p)} 
                      title="Share Property"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setToDelete(p.id)}
                    disabled={
                      !['draft', 'submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(
                        p.status,
                      )
                    }
                  />
                </div>
              </div>
            </Card>
          )}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('portal.deletePropTitle', 'Delete property')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              loading={deleteMutation.isPending}
            >
              {t('portal.delete', 'Delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">
          {t('portal.deleteConfirm', 'Are you sure you want to delete this property? This action cannot be undone.')}
        </p>
      </Modal>

      {/* ─── EXPLICIT SUBMIT CONFIRMATION MODAL ─── */}
      <Modal
        open={!!propertyToSubmit}
        onClose={() => setPropertyToSubmit(null)}
        title="Submit Property for Approval"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPropertyToSubmit(null)} disabled={submitMutation.isPending}>
              Cancel / Keep Draft
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              loading={submitMutation.isPending}
              onClick={() => {
                if (propertyToSubmit) {
                  submitMutation.mutate(propertyToSubmit.id);
                  setPropertyToSubmit(null);
                }
              }}
            >
              Confirm & Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-navy-700">
            Are you sure you want to submit <strong>"{propertyToSubmit?.title || 'this property'}"</strong> to the admin team for review?
          </p>
          <div className="bg-navy-50 p-3.5 rounded-xl border border-navy-100 text-xs text-navy-600 space-y-1">
            <p>• Once submitted, your property will move to the <strong>Pending</strong> tab.</p>
            <p>• Our quality assurance team will verify details before publishing it live.</p>
          </div>
        </div>
      </Modal>

      {shareProperty && (
        <SharePropertyModal
          isOpen={!!shareProperty}
          onClose={() => setShareProperty(null)}
          property={{
            id: shareProperty.id,
            title: shareProperty.title,
            price: shareProperty.price,
            location: `${shareProperty.locality_name}, ${shareProperty.city_name}`,
            purpose: shareProperty.purpose,
            imageUrl: shareProperty.images?.[0],
            slug: (shareProperty as any).slug || shareProperty.id
          }}
        />
      )}

      <EditPropertyModal propertyId={editPropertyId} onClose={() => setEditPropertyId(null)} />
    </DashboardLayout>
  );
}
