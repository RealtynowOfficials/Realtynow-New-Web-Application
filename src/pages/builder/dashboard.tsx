import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState, Skeleton } from '../../components/ui';
import { Building2, MessageSquare, Calendar } from 'lucide-react';
import type { NavSection } from '../../components/dashboard-layout';

export const builderSections: NavSection[] = [
  {
    items: [{ to: '/builder', label: 'Dashboard', icon: Building2, end: true }],
  },
];

export function BuilderDashboard() {
  const { profile, user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['builder-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Get builder's properties
      const { data: properties } = await supabase.from('properties').select('id').eq('owner_id', user.id);
      const propertyIds = properties?.map((p) => p.id) || [];
      
      let leadsCount = 0;
      let visitsCount = 0;

      if (propertyIds.length > 0) {
        const [leadsRes, visitsRes] = await Promise.all([
          supabase.from('enquiries').select('id', { count: 'exact' }).in('property_id', propertyIds),
          supabase.from('appointments').select('id', { count: 'exact' }).in('property_id', propertyIds).eq('status', 'scheduled')
        ]);
        leadsCount = leadsRes.count || 0;
        visitsCount = visitsRes.count || 0;
      }

      return {
        projects: propertyIds.length,
        leads: leadsCount,
        visits: visitsCount,
      };
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout sections={builderSections} title="Dashboard">
      <PageHeader
        title={`Welcome, ${profile?.first_name || 'Builder'}`}
        subtitle="Manage your projects, leads, and analytics."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-navy-100 p-3 text-navy-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-600">Active Projects</p>
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
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-navy-900">{stats?.leads || 0}</p>}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-success-100 p-3 text-success-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-600">Upcoming Site Visits</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-navy-900">{stats?.visits || 0}</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="p-12 text-center">
          <EmptyState
            icon={<Building2 className="h-10 w-10 text-navy-300" />}
            title="Projects module coming soon"
            description="We are integrating the CRM module for builders to manage projects and leads."
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
