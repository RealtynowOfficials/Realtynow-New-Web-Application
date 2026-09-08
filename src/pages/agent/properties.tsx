import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Eye,
  Edit3,
  Trash2,
  MapPin,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Button, Input, Select, Modal } from '../../components/ui';
import { StatusBadge } from '../../components/property-card';
import { DataTable, type Column } from '../../components/data-table';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate, generatePropertyUrl, getPropertyPrice } from '../../lib/utils';
import { getPriceUnitLabel } from '../../lib/plot-pricing';
import { PropertyPriceCell } from '../../components/ui/property-price-cell';
import { formatPropertyLocation } from '../../lib/location-formatter';
import { useRealtimeCount } from '../../lib/realtime';
import type { Property } from '../../lib/types';
import { getPropertyCoverImage, handleImageError, DEFAULT_PROPERTY_IMAGE } from '../../lib/property-images';
import { ExportMenu } from '../../components/export-menu';
import { SavedFiltersMenu } from '../../components/saved-filters-menu';
import { useSavedFilters } from '../../lib/saved-filters';
import { useToast } from '../../components/toast';
import { EditPropertyModal } from '../../components/portal/edit-property-modal';
import { CITY_AREAS_MASTER } from '../../lib/location-service';
import { DEFAULT_PROPERTY_TYPES, fetchAllPropertyTypes } from '../../lib/indian-cities';

const AGENT_PROPERTIES_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Property' },
  { key: 'locality_name', label: 'Locality' },
  { key: 'city_name', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'status', label: 'Status' },
  { key: 'view_count', label: 'Views' },
  { key: 'created_at', label: 'Created' },
];

interface AgentPropertiesFilterState {
  status: string;
  area: string;
  city: string;
  type: string;
  purpose: string;
  minPrice: string;
  maxPrice: string;
}

export function AgentProperties() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const realtimeTick = useRealtimeCount('properties', { column: 'assigned_agent_id', value: user?.id ?? '' });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Property | null>(null);
  const deletingRef = useRef(false);

  const [filters, setFilters] = useState<AgentPropertiesFilterState>({
    status: '',
    area: '',
    city: '',
    type: '',
    purpose: '',
    minPrice: '',
    maxPrice: '',
  });
  const savedFilters = useSavedFilters<AgentPropertiesFilterState>('agent-properties');

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-properties', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .or(`assigned_agent_id.eq.${user!.id},owner_id.eq.${user!.id}`)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => mapJoined(p as unknown as Record<string, unknown>)) as unknown as Property[];
    },
    enabled: !!user,
  });

  const { data: dbTypes } = useQuery({
    queryKey: ['agent-property-types-list'],
    queryFn: async () => {
      return await fetchAllPropertyTypes();
    },
    staleTime: 1000 * 60 * 30,
  });

  // Delete mutation with double-click guard
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });
      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      addToast('success', 'Property deleted successfully.');
      setToDelete(null);
    },
    onError: (err) => {
      console.error('Property delete error:', err);
      addToast('error', 'Unable to delete this property. Please try again.');
    },
    onSettled: () => {
      deletingRef.current = false;
    },
  });

  const handleDeleteConfirm = () => {
    if (!toDelete || deletingRef.current || deleteMutation.isPending) return;
    deletingRef.current = true;
    deleteMutation.mutate(toDelete.id);
  };

  // Filter option lists with full Hyderabad areas and property types
  const filterOptions = useMemo(() => {
    // 1. Areas (Hyderabad Master + dynamic)
    const areaSet = new Set<string>(CITY_AREAS_MASTER.hyderabad || []);
    (data ?? []).forEach((p) => {
      if (p.locality_name) areaSet.add(p.locality_name.trim());
      if ((p as any).locality?.name) areaSet.add((p as any).locality.name.trim());
    });
    const sortedAreas = Array.from(areaSet).filter(Boolean).sort((a, b) => a.localeCompare(b));

    // 2. Property types
    const typeMap = new Map<string, string>();
    DEFAULT_PROPERTY_TYPES.forEach((pt) => typeMap.set(pt.name.toLowerCase().trim(), pt.name));
    (dbTypes ?? []).forEach((pt) => typeMap.set(pt.name.toLowerCase().trim(), pt.name));
    (data ?? []).forEach((p) => {
      if (p.property_type_name) typeMap.set(p.property_type_name.toLowerCase().trim(), p.property_type_name.trim());
      if ((p as any).property_types?.name) typeMap.set((p as any).property_types.name.toLowerCase().trim(), (p as any).property_types.name.trim());
    });
    const sortedTypes = Array.from(typeMap.values()).sort((a, b) => a.localeCompare(b));

    // 3. Statuses
    const statuses = new Set<string>(['published', 'submitted', 'pending_verification', 'draft', 'rejected']);
    (data ?? []).forEach((p) => {
      if (p.status) statuses.add(p.status);
    });

    return {
      areas: sortedAreas,
      types: sortedTypes,
      statuses: Array.from(statuses),
      purposes: [
        { value: '', label: 'All Purposes' },
        { value: 'For Sale', label: 'For Sale' },
        { value: 'For Rent', label: 'For Rent / Lease' },
      ],
    };
  }, [data, dbTypes]);

  const filteredRows = useMemo(() => {
    return (data ?? []).filter((p) => {
      if (filters.status && p.status !== filters.status) return false;

      // Area / Locality filter
      if (filters.area) {
        const areaLower = filters.area.toLowerCase().trim();
        const pLoc = (p.locality_name || (p as any).locality?.name || '').toLowerCase();
        const pAddr = (p.address || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const match = pLoc.includes(areaLower) || pAddr.includes(areaLower) || pTitle.includes(areaLower);
        if (!match) return false;
      }

      // Property type filter
      if (filters.type) {
        const typeLower = filters.type.toLowerCase().trim();
        const pTypeName = (p.property_type_name || (p as any).property_types?.name || (p as any).property_type || '').toLowerCase();
        const pTypeId = (p.property_type_id || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const match = pTypeId === typeLower || pTypeName.includes(typeLower) || typeLower.includes(pTypeName) || pTitle.includes(typeLower);
        if (!match) return false;
      }

      // Purpose filter
      if (filters.purpose) {
        const purpLower = filters.purpose.toLowerCase().trim();
        const pPurp = (p.purpose || 'For Sale').toLowerCase().trim();
        if (!pPurp.includes(purpLower) && !purpLower.includes(pPurp)) return false;
      }

      // Price filters
      const effectivePrice = getPropertyPrice(p) || p.price || 0;
      if (filters.minPrice && Number(filters.minPrice) > 0 && effectivePrice < Number(filters.minPrice)) return false;
      if (filters.maxPrice && Number(filters.maxPrice) > 0 && effectivePrice > Number(filters.maxPrice)) return false;

      return true;
    });
  }, [data, filters]);

  const hasActiveFilters = Boolean(
    filters.status || filters.area || filters.type || filters.purpose || filters.minPrice || filters.maxPrice,
  );

  const resetFilters = () => {
    setFilters({
      status: '',
      area: '',
      city: '',
      type: '',
      purpose: '',
      minPrice: '',
      maxPrice: '',
    });
  };

  const [visibleRows, setVisibleRows] = useState<Property[]>([]);

  const columns = useMemo<Column<Property>[]>(() => [
    {
      key: 'title',
      header: 'Property',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <img
            src={getPropertyCoverImage(p)}
            alt=""
            onError={(e) => handleImageError(e, DEFAULT_PROPERTY_IMAGE)}
            className="h-10 w-14 rounded object-cover ring-1 ring-navy-100"
          />
          <div className="min-w-0">
            <Link to={generatePropertyUrl(p)} className="font-medium text-navy-900 hover:text-red-600 hover:underline truncate block">
              {p.title}
            </Link>
            <p className="text-xs text-navy-500 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-red-500 shrink-0" />
              <span title={formatPropertyLocation(p)} className="truncate">{formatPropertyLocation(p)}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (p) => <PropertyPriceCell property={p} showInvalidWarning={false} />,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'view_count',
      header: 'Views',
      sortable: true,
      render: (p) => (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50/90 px-2.5 py-1 text-xs font-black text-red-600 border border-red-100/90 shadow-2xs">
          <Eye className="h-3.5 w-3.5" />
          <span>{p.view_count || 0} {p.view_count === 1 ? 'View' : 'Views'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (p) => <span className="text-xs text-navy-600">{formatDate(p.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            icon={<Edit3 className="h-4 w-4" />}
            title="Edit property"
            onClick={() => setEditPropertyId(p.id)}
          />
          <Link to={generatePropertyUrl(p)}>
            <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} title="View property" />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-error-600"
            icon={<Trash2 className="h-4 w-4" />}
            title="Delete property"
            onClick={() => setToDelete(p)}
          />
        </div>
      ),
    },
  ], []);

  return (
    <DashboardLayout sections={agentSections} title="Assigned Properties" badge="Agent">
      <PageHeader
        title="Assigned Properties"
        subtitle="Manage and track properties assigned to you by administrators and clients in Hyderabad."
        action={
          <div className="flex items-center gap-2">
            <SavedFiltersMenu
              presets={savedFilters.presets}
              onApply={(f: AgentPropertiesFilterState) => setFilters(f)}
              onSave={(name: string) => savedFilters.save(name, filters)}
              onRemove={(id: string) => savedFilters.remove(id)}
            />
            <ExportMenu
              rows={visibleRows as unknown as Record<string, unknown>[]}
              filename="agent-assigned-properties"
              columns={AGENT_PROPERTIES_EXPORT_COLUMNS}
            />
            <Link to="/agent/list-property">
              <Button variant="primary">List Property</Button>
            </Link>
          </div>
        }
      />

      {/* Filter Card */}
      <div className="sticky top-0 z-20 -mx-1 mb-4 bg-navy-50/95 px-1 pb-1 pt-1 backdrop-blur-sm">
        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Status</label>
              <Select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="">All statuses</option>
                {filterOptions.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            {/* Hyderabad Area Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-red-500" />
                <span>Hyderabad Area</span>
              </label>
              <Select
                value={filters.area}
                onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
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

            {/* Property Type Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-navy-500" />
                <span>Property Type</span>
              </label>
              <Select
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              >
                <option value="">All types</option>
                {filterOptions.types.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {typeName}
                  </option>
                ))}
              </Select>
            </div>

            {/* Min Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Min Price (₹)</label>
              <Input
                type="number"
                placeholder="₹ Min price"
                value={filters.minPrice}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Max Price */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-navy-500">Max Price (₹)</label>
              <Input
                type="number"
                placeholder="₹ Max price"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                className="text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Reset / Count */}
            <div className="space-y-1 flex flex-col justify-end">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all border border-red-200 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset ({filteredRows.length})</span>
                </button>
              ) : (
                <div className="h-9 flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  <span>{filteredRows.length} Properties</span>
                </div>
              )}
            </div>
          </div>
          {selected.size > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2">
              <span className="text-xs font-bold text-navy-600">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-navy-400 hover:text-red-600">
                Clear selection
              </button>
            </div>
          )}
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(p) => p.id}
        searchPlaceholder={t('agent.searchAssignedProperties', 'Search assigned properties by title, locality, city...')}
        searchKeys={['title', 'locality_name', 'city_name', 'property_type_name']}
        dateKey="created_at"
        selectedIds={selected}
        onToggleSelect={(id) =>
          setSelected((s) => {
            const n = new Set(s);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
          })
        }
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
              <p className="font-bold text-navy-900 mt-2 text-lg">{formatPrice(getPropertyPrice(p), p.purpose)}</p>
              {p.price_per_unit != null && (
                <p className="text-xs font-semibold text-navy-500">{formatPrice(p.price_per_unit)} / {getPriceUnitLabel(p.area_unit)}</p>
              )}
              <p className="text-xs text-navy-400 mt-1">Date: {formatDate(p.created_at)}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
              <Link to={generatePropertyUrl(p)} className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">
                  View
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                icon={<Edit3 className="h-4 w-4" />}
                title="Edit property"
                onClick={() => setEditPropertyId(p.id)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-error-600"
                icon={<Trash2 className="h-4 w-4" />}
                title="Delete property"
                onClick={() => setToDelete(p)}
              />
            </div>
          </Card>
        )}
      />

      <Modal
        open={!!toDelete}
        onClose={() => {
          if (deletingRef.current || deleteMutation.isPending) return;
          setToDelete(null);
        }}
        title="Delete property"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">
          Are you sure you want to delete <span className="font-semibold text-navy-900">{toDelete?.title}</span>? This action cannot be undone.
        </p>
      </Modal>

      <EditPropertyModal propertyId={editPropertyId} onClose={() => setEditPropertyId(null)} />
    </DashboardLayout>
  );
}
