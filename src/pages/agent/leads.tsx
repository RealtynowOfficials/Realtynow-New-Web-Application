import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentKanbanBoard } from '../../components/agent/AgentKanbanBoard';
import { AgentAnalyticsDashboard } from '../../components/agent/AgentAnalyticsDashboard';
import { AiLeadAssistant } from '../../components/agent/AiLeadAssistant';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  MessageSquare,
  Eye,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Star,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, StatCard, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Skeleton, Badge, Button, EmptyState, Modal, Input, Textarea, Select, Avatar } from '../../components/ui';
import { StatusBadge } from '../../components/property-card';
import { DataTable, type Column } from '../../components/data-table';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate, formatNumber , generatePropertyUrl} from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { RemindersWidget } from '../../components/reminders-widget';
import type { Property } from '../../lib/types';
import { ExportMenu } from '../../components/export-menu';
import { SavedFiltersMenu } from '../../components/saved-filters-menu';
import { useSavedFilters } from '../../lib/saved-filters';

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
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
}

const LEAD_STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
const APPT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export function AgentLeads() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const realtimeTick = useRealtimeCount('enquiries', { column: 'agent_id', value: user?.id ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['agent-leads', user?.id, realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('enquiries')
        .select('*, property:properties(title, id)')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []).map((e) => ({ ...e, property: Array.isArray(e.property) ? e.property[0] : e.property }));
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('enquiries').update({ status, lead_status: status }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-leads'] }),
  });

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return data ?? [];
    return (data ?? []).filter((l) => l.lead_status === statusFilter || l.status === statusFilter);
  }, [data, statusFilter]);

  const tabs = ['all', ...LEAD_STATUSES];

  const getTabCount = (st: string) => {
    if (st === 'all') return (data ?? []).length;
    return (data ?? []).filter((l) => l.lead_status === st || l.status === st).length;
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-bold text-navy-900">{l.name}</p>
          {l.property?.title && (
            <Link
              to={generatePropertyUrl(l.property)}
              className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
            >
              <Building2 className="h-3 w-3" /> {l.property.title}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (l) => (
        <div className="text-xs space-y-1">
          {l.email && (
            <a href={`mailto:${l.email}`} className="text-navy-700 hover:text-navy-900 flex items-center gap-1">
              <Mail className="h-3 w-3 text-navy-400" /> {l.email}
            </a>
          )}
          {l.phone && (
            <a
              href={`tel:${l.phone}`}
              className="text-navy-700 hover:text-navy-900 flex items-center gap-1 font-semibold"
            >
              <Phone className="h-3 w-3 text-navy-400" /> {l.phone}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Inquiry Message',
      render: (l) => (
        <p className="text-xs text-navy-600 line-clamp-2 max-w-xs italic">
          {l.message ? `"${l.message}"` : 'No message provided'}
        </p>
      ),
    },
    {
      key: 'created_at',
      header: 'Submitted',
      sortable: true,
      render: (l) => <span className="text-xs text-navy-500 whitespace-nowrap">{formatDate(l.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (l) => (
        <Badge
          variant={
            (l.lead_status || l.status) === 'new'
              ? 'info'
              : (l.lead_status || l.status) === 'contacted'
                ? 'success'
                : (l.lead_status || l.status) === 'closed'
                  ? 'default'
                  : 'error'
          }
        >
          {l.lead_status || l.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Select
            value={l.lead_status || l.status}
            onChange={(ev) => updateStatus.mutate({ id: l.id, status: ev.target.value })}
            className="py-1 text-xs w-32"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
          {l.phone && (
            <a
              href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
              title="Chat on WhatsApp"
            >
              💬
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout sections={agentSections} title="Leads" badge="Agent">
      <PageHeader title="Leads Management" subtitle="Manage enquiries from interested buyers and renters." />

      {/* Status Filter Badges */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const count = getTabCount(t);
          return (
            <button
              key={t}
              onClick={() => {
                setStatusFilter(t);
                setSearchParams(t === 'all' ? {} : { status: t });
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize whitespace-nowrap transition flex items-center gap-2 ${statusFilter === t ? 'bg-navy-900 text-white shadow-sm' : 'bg-white text-navy-600 hover:bg-navy-100 border border-navy-200'}`}
            >
              {t}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === t ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-700'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setViewMode('kanban')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-navy-600 border border-navy-200 hover:bg-navy-50'}`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-navy-600 border border-navy-200 hover:bg-navy-50'}`}
        >
          List View
        </button>
      </div>

      {viewMode === 'kanban' ? (
        <AgentKanbanBoard 
          leads={data ?? []} 
          onStatusChange={(id, status) => updateStatus.mutate({ id, status })} 
        />
      ) : (
        <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        getRowId={(l) => l.id}
        searchable={true}
        searchKeys={['name', 'email', 'phone', 'message']}
        dateKey="created_at"
        cardRender={(l) => (
          <Card className="p-5 flex flex-col justify-between h-full border border-navy-200 hover:shadow-md transition-all">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-navy-900 text-base">{l.name}</h4>
                  <p className="text-xs text-navy-400 mt-0.5">{formatDate(l.created_at)}</p>
                </div>
                <Badge
                  variant={
                    l.status === 'new'
                      ? 'info'
                      : l.status === 'contacted'
                        ? 'success'
                        : l.status === 'closed'
                          ? 'default'
                          : 'error'
                  }
                >
                  {l.status}
                </Badge>
              </div>

              {l.property?.title && (
                <Link
                  to={generatePropertyUrl(l.property)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition mb-3"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="line-clamp-1">{l.property.title}</span>
                </Link>
              )}

              {l.message && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-navy-700 italic mb-4">
                  "{l.message}"
                </div>
              )}

              <div className="space-y-1.5 text-xs text-navy-600 mb-4">
                {l.email && (
                  <a href={`mailto:${l.email}`} className="flex items-center gap-2 hover:text-navy-900">
                    <Mail className="h-3.5 w-3.5 text-navy-400" /> {l.email}
                  </a>
                )}
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="flex items-center gap-2 font-semibold hover:text-navy-900">
                    <Phone className="h-3.5 w-3.5 text-navy-400" /> {l.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
              <Select
                value={l.status}
                onChange={(ev) => updateStatus.mutate({ id: l.id, status: ev.target.value })}
                className="py-1 text-xs w-32"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </Select>
              {l.phone && (
                <a
                  href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </Card>
        )}
      />
      )}
    </DashboardLayout>
  );
}

