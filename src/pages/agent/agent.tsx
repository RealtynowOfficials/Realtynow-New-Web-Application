import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { formatPrice, formatDate, formatNumber } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { RemindersWidget } from '../../components/reminders-widget';
import type { Property } from '../../lib/types';

const LEAD_STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
const APPT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export function AgentDashboard() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const realtimeTick = useRealtimeCount('enquiries', { column: 'agent_id', value: user?.id ?? '' });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['agent-stats', user?.id, realtimeTick],
    queryFn: async () => {
      if (!user) return null;
      const [assigned, leads, appointments, pendingAppts] = await Promise.all([
        supabase.from('properties').select('id, view_count, status').eq('assigned_agent_id', user.id),
        supabase.from('enquiries').select('id, status', { count: 'exact' }).eq('agent_id', user.id),
        supabase.from('appointments').select('id, status', { count: 'exact' }).eq('agent_id', user.id),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', user.id)
          .eq('status', 'requested'),
      ]);
      const props = assigned.data ?? [];
      const allLeads = leads.data ?? [];
      return {
        assigned: assigned.count ?? 0,
        views: props.reduce((a, p) => a + (p.view_count ?? 0), 0),
        leads: leads.count ?? 0,
        newLeads: allLeads.filter((l) => l.status === 'new').length,
        appointments: appointments.count ?? 0,
        pendingAppts: pendingAppts.count ?? 0,
        published: props.filter((p) => p.status === 'published').length,
      };
    },
    enabled: !!user,
  });

  const { data: recentLeads } = useQuery({
    queryKey: ['agent-leads-recent', user?.id, realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('enquiries')
        .select('*, property:properties(title, id)')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []).map((e) => ({ ...e, property: Array.isArray(e.property) ? e.property[0] : e.property }));
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={agentSections} title="Agent Dashboard" badge="Agent">
      <PageHeader
        title={`Welcome, ${user?.email?.split('@')[0] ?? 'Agent'}`}
        subtitle="Your performance at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Assigned Properties"
              value={stats.assigned}
              icon={<Building2 className="h-5 w-5" />}
              accent="navy"
              to="/agent/properties"
            />
            <StatCard
              label="Total Views"
              value={formatNumber(stats.views)}
              icon={<Eye className="h-5 w-5" />}
              accent="gold"
              to="/agent/properties"
            />
            <StatCard
              label="New Leads"
              value={stats.newLeads}
              icon={<MessageSquare className="h-5 w-5" />}
              accent="success"
              to="/agent/leads"
            />
            <StatCard
              label="Pending Appts"
              value={stats.pendingAppts}
              icon={<Calendar className="h-5 w-5" />}
              accent="navy"
              to="/agent/appointments"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-navy-900">Recent leads</h3>
          <Card className="divide-y divide-navy-50">
            {!recentLeads ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : recentLeads.length > 0 ? (
              recentLeads.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900 truncate">{e.name}</p>
                    <p className="text-xs text-navy-500 truncate">{e.property?.title ?? 'Enquiry'}</p>
                  </div>
                  <Badge
                    variant={
                      e.status === 'new'
                        ? 'info'
                        : e.status === 'contacted'
                          ? 'success'
                          : e.status === 'closed'
                            ? 'default'
                            : 'error'
                    }
                  >
                    {e.status}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<MessageSquare className="h-6 w-6" />}
                title="No leads yet"
                description="Leads from property enquiries will appear here."
              />
            )}
          </Card>
        </div>
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-navy-900">Quick actions</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/agent/leads" className="card p-4 transition hover:shadow-cardHover">
              <MessageSquare className="h-6 w-6 text-navy-700" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Manage Leads</p>
              <p className="text-xs text-navy-500">Update lead status and follow up</p>
            </Link>
            <Link to="/agent/appointments" className="card p-4 transition hover:shadow-cardHover">
              <Calendar className="h-6 w-6 text-navy-700" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Appointments</p>
              <p className="text-xs text-navy-500">Confirm or cancel visits</p>
            </Link>
            <Link to="/agent/properties" className="card p-4 transition hover:shadow-cardHover">
              <Building2 className="h-6 w-6 text-navy-700" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Properties</p>
              <p className="text-xs text-navy-500">View assigned listings</p>
            </Link>
            <Link to="/agent/analytics" className="card p-4 transition hover:shadow-cardHover">
              <TrendingUp className="h-6 w-6 text-navy-700" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Analytics</p>
              <p className="text-xs text-navy-500">Track performance</p>
            </Link>
          </div>
          <div className="mt-6">
            <RemindersWidget />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AgentProperties() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const realtimeTick = useRealtimeCount('properties', { column: 'assigned_agent_id', value: user?.id ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['agent-properties', user?.id, realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .eq('assigned_agent_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []).map((p) => mapJoined(p as unknown as Record<string, unknown>)) as unknown as Property[];
    },
    enabled: !!user,
  });

  const columns: Column<Property>[] = [
    {
      key: 'title',
      header: 'Property',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <img
            src={p.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
            alt=""
            className="h-10 w-14 rounded object-cover"
          />
          <div className="min-w-0">
            <Link to={`/property/${p.id}`} className="font-medium text-navy-900 hover:underline truncate block">
              {p.title}
            </Link>
            <p className="text-xs text-navy-500">
              {p.locality_name}, {p.city_name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (p) => <span className="font-semibold">{formatPrice(p.price, p.purpose)}</span>,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'view_count', header: 'Views', sortable: true },
    { key: 'created_at', header: 'Created', sortable: true, render: (p) => formatDate(p.created_at) },
  ];

  return (
    <DashboardLayout sections={agentSections} title="Assigned Properties" badge="Agent">
      <PageHeader title="Assigned properties" subtitle="Properties you're managing." />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        getRowId={(p) => p.id}
        searchKeys={['title']}
        dateKey="created_at"
        cardRender={(p) => (
          <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div>
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-navy-100">
                <img
                  src={p.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <h4 className="font-bold text-navy-900 text-base line-clamp-1">{p.title}</h4>
              <p className="text-xs text-navy-500 mt-0.5">
                {p.locality_name ?? '—'}, {p.city_name ?? '—'}
              </p>
              <p className="font-bold text-navy-900 mt-2 text-lg">{formatPrice(p.price, p.purpose)}</p>
              <p className="text-xs text-navy-400 mt-1">Assigned: {formatDate(p.created_at)}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
              <span className="text-xs text-navy-500 font-medium">👁️ {p.view_count ?? 0} Views</span>
              <Link to={`/property/${p.id}`} target="_blank">
                <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />}>
                  View Listing
                </Button>
              </Link>
            </div>
          </Card>
        )}
      />
    </DashboardLayout>
  );
}

export function AgentLeads() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
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
              to={`/property/${l.property.id}`}
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
                  to={`/property/${l.property.id}`}
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
    </DashboardLayout>
  );
}

export function AgentAppointments() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [visitModal, setVisitModal] = useState<null | {
    appointmentId: string;
    customerId: string;
    propertyId: string;
    propertyTitle: string;
  }>(null);
  const [visitForm, setVisitForm] = useState({ feedback: '', rating: 5 });
  const realtimeTick = useRealtimeCount('appointments', { column: 'agent_id', value: user?.id ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['agent-appointments', user?.id, statusFilter, realtimeTick],
    queryFn: async () => {
      let q = supabase
        .from('appointments')
        .select(
          '*, property:properties(title, id), customer:profiles!appointments_customer_id_profiles_fkey(first_name, last_name, email, phone)',
        )
        .eq('agent_id', user!.id)
        .order('scheduled_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data } = await q;
      return (data ?? []).map((a) => ({
        ...a,
        property: Array.isArray(a.property) ? a.property[0] : a.property,
        customer: Array.isArray(a.customer) ? a.customer[0] : a.customer,
      }));
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('appointments').update({ status }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-appointments'] }),
  });

  const logVisit = useMutation({
    mutationFn: async () => {
      if (!visitModal || !user) return;
      await supabase.from('visits').insert({
        property_id: visitModal.propertyId,
        customer_id: visitModal.customerId,
        agent_id: user.id,
        visited_at: new Date().toISOString(),
        feedback: visitForm.feedback,
        rating: visitForm.rating,
      });
      await supabase.from('appointments').update({ status: 'completed' }).eq('id', visitModal.appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-appointments'] });
      setVisitModal(null);
      setVisitForm({ feedback: '', rating: 5 });
    },
  });

  const tabs = ['all', ...APPT_STATUSES];

  return (
    <DashboardLayout sections={agentSections} title="Appointments" badge="Agent">
      <PageHeader title="Appointments" subtitle="Manage scheduled property visits." />
      <div className="mb-4 flex gap-1 rounded-lg border border-navy-200 bg-white p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setStatusFilter(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${statusFilter === t ? 'bg-navy-700 text-white' : 'text-navy-600 hover:bg-navy-50'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <Card className="divide-y divide-navy-50">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          data.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-900">{a.property?.title ?? 'Appointment'}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-500">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(a.scheduled_at).toLocaleString('en-IN')}
                  </p>
                  {a.customer && (
                    <p className="mt-1 text-xs text-navy-600">
                      {a.customer.first_name} {a.customer.last_name} · {a.customer.email} ·{' '}
                      {a.customer.phone ?? 'No phone'}
                    </p>
                  )}
                  {a.notes && <p className="mt-1.5 text-sm text-navy-600">{a.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      a.status === 'confirmed'
                        ? 'success'
                        : a.status === 'cancelled'
                          ? 'error'
                          : a.status === 'completed'
                            ? 'default'
                            : 'warning'
                    }
                  >
                    {a.status}
                  </Badge>
                  {a.status === 'requested' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'confirmed' })}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<XCircle className="h-4 w-4" />}
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'cancelled' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {a.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ClipboardList className="h-4 w-4" />}
                        onClick={() =>
                          setVisitModal({
                            appointmentId: a.id,
                            customerId: a.customer_id,
                            propertyId: a.property_id,
                            propertyTitle: a.property?.title ?? '',
                          })
                        }
                      >
                        Log Visit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'cancelled' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="No appointments"
            description="Scheduled visits will appear here."
          />
        )}
      </Card>

      <Modal
        open={!!visitModal}
        onClose={() => setVisitModal(null)}
        title={`Log visit — ${visitModal?.propertyTitle ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVisitModal(null)}>
              Cancel
            </Button>
            <Button loading={logVisit.isPending} onClick={() => logVisit.mutate()}>
              Save visit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVisitForm((f) => ({ ...f, rating: i }))}
                  className={i <= visitForm.rating ? 'text-gold-400' : 'text-navy-200'}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Feedback"
            placeholder="Visit notes and customer feedback..."
            value={visitForm.feedback}
            onChange={(e) => setVisitForm((f) => ({ ...f, feedback: e.target.value }))}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export function AgentAnalytics() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const { data: properties } = useQuery({
    queryKey: ['agent-properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, view_count, status, purpose, price, created_at')
        .eq('assigned_agent_id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: leads } = useQuery({
    queryKey: ['agent-leads-analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('enquiries').select('status, created_at').eq('agent_id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalViews = (properties ?? []).reduce((a, p) => a + (p.view_count ?? 0), 0);
  const published = (properties ?? []).filter((p) => p.status === 'published').length;
  const newLeads = (leads ?? []).filter((l) => l.status === 'new').length;
  const closedLeads = (leads ?? []).filter((l) => l.status === 'closed').length;
  const conversionRate = leads && leads.length > 0 ? ((closedLeads / leads.length) * 100).toFixed(1) : '0.0';
  const totalValue = (properties ?? []).filter((p) => p.status === 'published').reduce((a, p) => a + (p.price ?? 0), 0);

  const topProperties = (properties ?? []).sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 8);

  return (
    <DashboardLayout sections={agentSections} title="Analytics" badge="Agent">
      <PageHeader title="Performance analytics" subtitle="Track your portfolio performance with real data." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Views"
          value={formatNumber(totalViews)}
          icon={<Eye className="h-5 w-5" />}
          accent="navy"
          to="/agent/properties"
        />
        <StatCard
          label="Published"
          value={published}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
          to="/agent/properties"
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="gold"
          to="/agent/leads"
        />
        <StatCard
          label="Portfolio Value"
          value={formatPrice(totalValue, 'Sale')}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/agent/properties"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900">Lead funnel</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: 'New', count: newLeads, color: 'bg-navy-700' },
              {
                label: 'Contacted',
                count: (leads ?? []).filter((l) => l.status === 'contacted').length,
                color: 'bg-gold-400',
              },
              { label: 'Closed', count: closedLeads, color: 'bg-success-500' },
              { label: 'Spam', count: (leads ?? []).filter((l) => l.status === 'spam').length, color: 'bg-error-500' },
            ].map((s) => {
              const max = leads?.length ?? 1;
              const pct = max > 0 ? (s.count / max) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-700">{s.label}</span>
                    <span className="font-semibold text-navy-900">{s.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-100">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900">Top performing properties</h3>
          <div className="mt-4 space-y-2">
            {topProperties.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-navy-50/40 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-navy-800 truncate flex-1">
                  <span className="text-xs text-navy-400">#{i + 1}</span>
                  {p.title ?? p.id.slice(0, 8)}
                </span>
                <span className="flex items-center gap-1 text-sm text-navy-600">
                  <Eye className="h-4 w-4" /> {p.view_count ?? 0}
                </span>
              </div>
            ))}
            {topProperties.length === 0 && <p className="py-6 text-center text-sm text-navy-400">No data yet.</p>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export function AgentSettings() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
    company: profile?.company ?? '',
    license_number: profile?.license_number ?? '',
    specialization: profile?.specialization ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update(form).eq('id', user!.id);
    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout sections={agentSections} title="Settings" badge="Agent">
      <PageHeader title="Agent settings" subtitle="Update your professional profile." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={profile?.avatar_url}
              name={`${profile?.first_name ?? 'A'} ${profile?.last_name ?? ''}`}
              size={80}
            />
            <p className="mt-3 font-display font-semibold text-navy-900">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-sm text-navy-500">{profile?.email}</p>
            <Badge variant="success" className="mt-2">
              Agent
            </Badge>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-navy-900">Professional profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
            <Input
              label="Last name"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Input
              label="License number"
              value={form.license_number}
              onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
            />
            <Input
              label="Specialization"
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
            {saved && (
              <span className="text-sm text-success-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
