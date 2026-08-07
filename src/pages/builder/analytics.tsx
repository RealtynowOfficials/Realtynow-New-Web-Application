import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { Card } from '../../components/ui';
import { TrendingUp, Target, Users, Building2 } from 'lucide-react';

export function BuilderAnalytics() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['builder-analytics', user?.id],
    queryFn: async () => {
      const { data: projects } = await supabase.from('builder_projects').select('id').eq('builder_id', user!.id);
      const projectIds = (projects ?? []).map((p) => p.id);

      const { data: towers } = projectIds.length
        ? await supabase.from('builder_towers').select('id').in('project_id', projectIds)
        : { data: [] as { id: string }[] };
      const towerIds = (towers ?? []).map((t) => t.id);

      const { data: units } = towerIds.length
        ? await supabase.from('builder_units').select('id, status').in('tower_id', towerIds)
        : { data: [] as { id: string; status: string }[] };
      const unitIds = (units ?? []).map((u) => u.id);
      const soldCount = (units ?? []).filter((u) => u.status === 'sold').length;

      const [leadsRes, bookingsRes, customersRes] = await Promise.all([
        supabase.from('builder_leads').select('id', { count: 'exact', head: true }).eq('builder_id', user!.id),
        unitIds.length
          ? supabase.from('builder_bookings').select('id', { count: 'exact', head: true }).in('unit_id', unitIds)
          : Promise.resolve({ count: 0 }),
        supabase.from('builder_customers').select('id', { count: 'exact', head: true }).eq('builder_id', user!.id),
      ]);

      return {
        totalProjects: projectIds.length,
        totalTowers: towerIds.length,
        totalUnits: unitIds.length,
        soldUnits: soldCount,
        totalLeads: leadsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        totalCustomers: customersRes.count || 0,
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
        <StatCard
          label="Active Bookings"
          value={stats?.totalBookings || 0}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/builder/bookings"
        />
        <StatCard
          label="Customers"
          value={stats?.totalCustomers || 0}
          icon={<Users className="h-5 w-5" />}
          accent="gold"
          to="/builder/customers"
        />
        <StatCard
          label="Total Units"
          value={stats?.totalUnits || 0}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/builder/units"
        />
        <StatCard
          label="Total Towers"
          value={stats?.totalTowers || 0}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/builder/blocks"
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
