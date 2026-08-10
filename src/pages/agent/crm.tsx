import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, MessageSquare, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Badge, EmptyState, Skeleton } from '../../components/ui';
import { useRealtimeCount } from '../../lib/realtime';
import { relativeTime } from '../../lib/utils';

interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

interface ActivityItem {
  id: string;
  type: 'enquiry' | 'appointment' | 'negotiation';
  title: string;
  subtitle: string;
  timestamp: string;
}

export function AgentCrm() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  const enquiriesTick = useRealtimeCount('enquiries', { column: 'agent_id', value: user?.id ?? '' });
  const appointmentsTick = useRealtimeCount('appointments', { column: 'agent_id', value: user?.id ?? '' });
  const negotiationsTick = useRealtimeCount('agent_negotiations', { column: 'agent_id', value: user?.id ?? '' });

  const { data: enquiries, isLoading: enquiriesLoading } = useQuery({
    queryKey: ['agent-crm-enquiries', user?.id, enquiriesTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enquiries')
        .select('id, name, status, created_at')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['agent-crm-appointments', user?.id, appointmentsTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, scheduled_at, customer:profiles!appointments_customer_id_profiles_fkey(first_name, last_name)')
        .eq('agent_id', user!.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const { data: negotiations, isLoading: negotiationsLoading } = useQuery({
    queryKey: ['agent-crm-negotiations', user?.id, negotiationsTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_negotiations')
        .select('id, status, offer_amount, created_at, enquiries:lead_id(name)')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  const isLoading = enquiriesLoading || appointmentsLoading || negotiationsLoading;

  const stages: PipelineStage[] = useMemo(() => {
    const e = enquiries ?? [];
    const a = appointments ?? [];
    const n = negotiations ?? [];
    return [
      { label: 'New Enquiries', count: e.filter((x) => x.status === 'new').length, color: 'bg-blue-500' },
      { label: 'Contacted', count: e.filter((x) => x.status === 'contacted').length, color: 'bg-amber-500' },
      { label: 'Site Visits Scheduled', count: a.filter((x) => x.status === 'requested' || x.status === 'confirmed').length, color: 'bg-purple-500' },
      { label: 'Negotiating', count: n.filter((x) => x.status === 'open' || x.status === 'countered').length, color: 'bg-orange-500' },
      { label: 'Closed Won', count: n.filter((x) => x.status === 'accepted').length, color: 'bg-success-500' },
    ];
  }, [enquiries, appointments, negotiations]);

  const maxStage = Math.max(1, ...stages.map((s) => s.count));

  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    (enquiries ?? []).slice(0, 10).forEach((e) =>
      items.push({ id: `enq-${e.id}`, type: 'enquiry', title: `New enquiry from ${e.name ?? 'a lead'}`, subtitle: e.status, timestamp: e.created_at }),
    );
    (appointments ?? []).slice(0, 10).forEach((a) =>
      items.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        title: `Site visit with ${[a.customer?.first_name, a.customer?.last_name].filter(Boolean).join(' ') || 'a client'}`,
        subtitle: a.status,
        timestamp: a.scheduled_at,
      }),
    );
    (negotiations ?? []).slice(0, 10).forEach((n) =>
      items.push({
        id: `neg-${n.id}`,
        type: 'negotiation',
        title: `Offer with ${n.enquiries?.name ?? 'a lead'}`,
        subtitle: n.status,
        timestamp: n.created_at,
      }),
    );
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);
  }, [enquiries, appointments, negotiations]);

  const activityIcon = (type: ActivityItem['type']) => {
    if (type === 'appointment') return <Calendar className="h-4 w-4 text-purple-600" />;
    if (type === 'negotiation') return <Tag className="h-4 w-4 text-orange-600" />;
    return <MessageSquare className="h-4 w-4 text-blue-600" />;
  };

  return (
    <DashboardLayout sections={agentSections} title="CRM" badge="Agent">
      <PageHeader title="CRM Pipeline" subtitle="Track lead progression from first contact to closed deal." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Leads" value={enquiries?.length ?? 0} icon={<MessageSquare className="h-5 w-5" />} accent="navy" />
        <StatCard label="Site Visits" value={appointments?.length ?? 0} icon={<Calendar className="h-5 w-5" />} accent="gold" />
        <StatCard
          label="Active Negotiations"
          value={(negotiations ?? []).filter((n) => n.status === 'open' || n.status === 'countered').length}
          icon={<Tag className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Deals Closed"
          value={(negotiations ?? []).filter((n) => n.status === 'accepted').length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900 mb-4">Pipeline Funnel</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs font-semibold text-navy-600 mb-1">
                    <span>{s.label}</span>
                    <span>{s.count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-navy-50">
                    <div
                      className={`h-2.5 rounded-full ${s.color}`}
                      style={{ width: `${Math.max(4, (s.count / maxStage) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900 mb-4">Recent Activity</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : activity.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-navy-50 p-1.5">{activityIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900 line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="default" className="capitalize text-[10px]">
                        {item.subtitle}
                      </Badge>
                      <span className="text-xs text-navy-400">{relativeTime(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" description="Lead, visit, and negotiation activity will appear here." />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
