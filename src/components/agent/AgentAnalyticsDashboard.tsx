import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { StatCard } from '../dashboard-layout';
import { Card } from '../ui';
import { Target, TrendingUp, Users, DollarSign, Calendar, Clock } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export function AgentAnalyticsDashboard() {
  const { user } = useAuth();

  const { data: crmStats, isLoading: crmLoading } = useQuery({
    queryKey: ['agent-crm-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_crm_dashboard_stats', { p_agent_id: user?.id });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['agent-recent-activities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*, enquiries(name)')
        .eq('actor_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: upcomingFollowUps, isLoading: followUpsLoading } = useQuery({
    queryKey: ['agent-upcoming-followups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_scheduler')
        .select('*, enquiries(name, phone)')
        .eq('assigned_to', user?.id)
        .is('completed_at', null)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      {/* CRM Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={crmStats?.total || 0}
          icon={<Users className="h-5 w-5" />}
          trend={crmStats?.total > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Conversion Rate"
          value={`${crmStats?.conversion_rate || 0}%`}
          icon={<Target className="h-5 w-5" />}
          trend={crmStats?.conversion_rate > 5 ? "up" : "neutral"}
        />
        <StatCard
          label="Expected Revenue"
          value={formatPrice(crmStats?.total_revenue || 0)}
          icon={<DollarSign className="h-5 w-5" />}
          trend="up"
        />
        <StatCard
          label="Active Negotiations"
          value={crmStats?.negotiation || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow Ups */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-500" /> Upcoming Follow-ups
            </h3>
          </div>
          <div className="space-y-3">
            {followUpsLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
              </div>
            ) : upcomingFollowUps?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming follow-ups scheduled.</p>
            ) : (
              upcomingFollowUps?.map((f: any) => (
                <div key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-sm text-navy-900">{f.title}</h4>
                    <p className="text-xs text-navy-600 mt-0.5">{f.enquiries?.name} • {f.type}</p>
                  </div>
                  <div className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                    {new Date(f.scheduled_at).toLocaleDateString()} {new Date(f.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-500" /> Recent Activities
            </h3>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
            {activitiesLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}
              </div>
            ) : recentActivities?.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
            ) : (
              recentActivities?.map((act: any) => (
                <div key={act.id} className="relative pl-4 border-l-2 border-gray-200 py-1">
                  <div className="absolute w-2 h-2 bg-primary-500 rounded-full -left-[5px] top-2"></div>
                  <h4 className="font-medium text-sm text-navy-900">{act.title}</h4>
                  <div className="flex gap-2 text-xs text-navy-500 mt-0.5">
                    <span>{new Date(act.created_at).toLocaleDateString()}</span>
                    {act.enquiries?.name && <span>• {act.enquiries?.name}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
