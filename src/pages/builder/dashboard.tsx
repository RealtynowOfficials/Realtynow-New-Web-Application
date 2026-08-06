import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, Skeleton } from '../../components/ui';
import { Building2, MessageSquare, Briefcase, TrendingUp } from 'lucide-react';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';

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

  return (
    <DashboardLayout sections={builderSections} title="Dashboard" badge="Builder">
      <PageHeader
        title={`Welcome, ${profile?.first_name || 'Builder'}`}
        subtitle="Manage your projects, track leads, and analyze your portfolio."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-navy-100 p-3 text-navy-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-600">Total Projects</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-navy-900">{stats?.projects || 0}</p>}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold-100 p-3 text-gold-600">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-600">New Leads</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-navy-900">{stats?.newLeads || 0}</p>}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success-100 p-3 text-success-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-600">Closed Deals</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-navy-900">{stats?.wonLeads || 0}</p>}
            </div>
          </div>
        </Card>
        <Card className="p-6 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">Conversion</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-emerald-900">
                {stats?.newLeads && stats?.newLeads > 0 
                  ? Math.round((stats.wonLeads / (stats.newLeads + stats.wonLeads)) * 100) 
                  : 0}%
              </p>}
            </div>
          </div>
        </Card>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
           <h3 className="text-lg font-bold text-navy-900 mb-4">Recent Projects</h3>
           <p className="text-sm text-gray-500">Your most recently updated projects will appear here.</p>
        </Card>
        <Card className="p-6">
           <h3 className="text-lg font-bold text-navy-900 mb-4">Recent Leads</h3>
           <p className="text-sm text-gray-500">Your latest enquiries will appear here.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
