import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { Card } from '../../components/ui/card';
import { TrendingUp, Target, Users, Building2 } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export function BuilderAnalytics() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['builder-analytics', user?.id],
    queryFn: async () => {
      const [projectsRes, towersRes, unitsRes, leadsRes] = await Promise.all([
        supabase.from('builder_projects').select('id', { count: 'exact' }).eq('builder_id', user!.id),
        supabase.from('builder_towers').select('id', { count: 'exact' }).eq('project_id', user!.id), // approximate
        supabase.from('builder_units').select('status', { count: 'exact' }).eq('status', 'sold'), // approximate
        supabase.from('builder_leads').select('status', { count: 'exact' }).eq('builder_id', user!.id),
      ]);

      return {
        totalProjects: projectsRes.count || 0,
        totalTowers: towersRes.count || 0,
        soldUnits: unitsRes.count || 0,
        totalLeads: leadsRes.count || 0,
      };
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={builderSections} title="Analytics" badge="Builder">
      <PageHeader
        title="Portfolio Analytics"
        subtitle="Track the performance of your entire property portfolio."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <StatCard
          label="Total Projects"
          value={stats?.totalProjects || 0}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/builder/projects"
        />
        <StatCard
          label="Sold Units"
          value={stats?.soldUnits || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
          to="/builder/projects"
        />
        <StatCard
          label="Total Leads"
          value={stats?.totalLeads || 0}
          icon={<Users className="h-5 w-5" />}
          accent="gold"
          to="/builder/leads"
        />
        <StatCard
          label="Conversion Target"
          value="12%"
          icon={<Target className="h-5 w-5" />}
          accent="navy"
          to="/builder/analytics"
        />
      </div>
      
      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <Card className="p-6 h-64 flex items-center justify-center border-dashed">
          <p className="text-gray-500 font-medium">Sales chart will appear here</p>
        </Card>
        <Card className="p-6 h-64 flex items-center justify-center border-dashed">
          <p className="text-gray-500 font-medium">Lead sources chart will appear here</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
