import { useQuery } from '@tanstack/react-query';
import { AiLeadAssistant } from '../../components/agent/AiLeadAssistant';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import {
  Building2,
  MessageSquare,
  Eye,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, StatCard, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Skeleton, Badge, EmptyState } from '../../components/ui';
import { formatNumber } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { RemindersWidget } from '../../components/reminders-widget';

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

export function AgentDashboard() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user, profile } = useAuth();
  const agentDisplayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Agent';
  const navigate = useNavigate();
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
        title={`Welcome, ${agentDisplayName}`}
        subtitle="Your performance at a glance."
        actions={[
          {
            label: 'List Property',
            icon: <PlusCircle className="h-4 w-4" />,
            primary: true,
            onClick: () => navigate('/agent/list-property'),
          },
        ]}
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

      <div className="mt-6">
        <AiLeadAssistant />
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

