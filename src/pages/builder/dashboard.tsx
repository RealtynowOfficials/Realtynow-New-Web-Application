import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { Card, Skeleton, Badge } from '../../components/ui';
import { Building2, MessageSquare, Briefcase, TrendingUp } from 'lucide-react';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { formatDate } from '../../lib/utils';

export function BuilderDashboard() {
  const { profile, user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['builder-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [projectsRes, leadsRes, wonLeadsRes] = await Promise.all([
        supabase.from('builder_projects').select('id', { count: 'exact' }).eq('builder_id', user.id),
        supabase.from('builder_leads').select('id', { count: 'exact' }).eq('builder_id', user.id).eq('status', 'new'),
        supabase.from('builder_leads').select('id', { count: 'exact' }).eq('builder_id', user.id).eq('status', 'won'),
      ]);

      return {
        projects: projectsRes.count || 0,
        newLeads: leadsRes.count || 0,
        wonLeads: wonLeadsRes.count || 0,
      };
    },
    enabled: !!user,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['builder-dashboard-recent', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [projectsRes, leadsRes] = await Promise.all([
        supabase
          .from('builder_projects')
          .select('id, name, status, created_at')
          .eq('builder_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('builder_leads')
          .select('id, name, status, created_at, builder_projects(name)')
          .eq('builder_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      return {
        projects: projectsRes.data || [],
        leads: leadsRes.data || [],
      };
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={builderSections} title="Dashboard" badge="Builder">
      <PageHeader
        title={`Welcome, ${profile?.first_name || 'Builder'}`}
        subtitle="Manage your projects, track leads, and analyze your portfolio."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Total Projects"
              value={stats.projects}
              icon={<Building2 className="h-5 w-5" />}
              accent="navy"
              to="/builder/projects"
            />
            <StatCard
              label="New Leads"
              value={stats.newLeads}
              icon={<MessageSquare className="h-5 w-5" />}
              accent="gold"
              to="/builder/leads"
            />
            <StatCard
              label="Closed Deals"
              value={stats.wonLeads}
              icon={<Briefcase className="h-5 w-5" />}
              accent="success"
              to="/builder/bookings"
            />
            <StatCard
              label="Conversion"
              value={`${
                stats.newLeads && stats.newLeads > 0
                  ? Math.round((stats.wonLeads / (stats.newLeads + stats.wonLeads)) * 100)
                  : 0
              }%`}
              icon={<TrendingUp className="h-5 w-5" />}
              accent="success"
              to="/builder/analytics"
            />
          </>
        )}
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
           <h3 className="text-lg font-bold text-navy-900 mb-4">Recent Projects</h3>
           {recentLoading ? (
             <div className="space-y-3">
               {Array.from({ length: 3 }).map((_, i) => (
                 <Skeleton key={i} className="h-10 w-full" />
               ))}
             </div>
           ) : !recent?.projects.length ? (
             <p className="text-sm text-gray-500">Your most recently updated projects will appear here.</p>
           ) : (
             <div className="divide-y divide-navy-100">
               {recent.projects.map((p) => (
                 <div key={p.id} className="flex items-center justify-between py-2.5">
                   <div>
                     <p className="text-sm font-medium text-navy-900">{p.name}</p>
                     <p className="text-xs text-navy-500">{formatDate(p.created_at)}</p>
                   </div>
                   <Badge variant={p.status === 'completed' ? 'success' : p.status === 'ongoing' ? 'info' : 'default'} className="capitalize">
                     {p.status}
                   </Badge>
                 </div>
               ))}
             </div>
           )}
        </Card>
        <Card className="p-6">
           <h3 className="text-lg font-bold text-navy-900 mb-4">Recent Leads</h3>
           {recentLoading ? (
             <div className="space-y-3">
               {Array.from({ length: 3 }).map((_, i) => (
                 <Skeleton key={i} className="h-10 w-full" />
               ))}
             </div>
           ) : !recent?.leads.length ? (
             <p className="text-sm text-gray-500">Your latest enquiries will appear here.</p>
           ) : (
             <div className="divide-y divide-navy-100">
               {recent.leads.map((l: any) => (
                 <div key={l.id} className="flex items-center justify-between py-2.5">
                   <div>
                     <p className="text-sm font-medium text-navy-900">{l.name}</p>
                     <p className="text-xs text-navy-500">{l.builder_projects?.name || 'General Inquiry'} • {formatDate(l.created_at)}</p>
                   </div>
                   <Badge variant="gold" className="capitalize">{String(l.status).replace('_', ' ')}</Badge>
                 </div>
               ))}
             </div>
           )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
