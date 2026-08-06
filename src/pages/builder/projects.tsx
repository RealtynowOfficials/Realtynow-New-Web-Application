import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Badge } from '../../components/ui';
import { Building2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function BuilderProjects() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('*, cities(name), localities(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const columns = useMemo<Column<any>[]>(() => [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-400">
            {p.cover_image ? (
              <img src={p.cover_image} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-navy-900">{p.name}</p>
            <p className="text-xs text-navy-500">RERA: {p.rera_id || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (p) => <span className="text-sm">{p.localities?.name || ''}, {p.cities?.name || ''}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.status === 'completed' ? 'success' : p.status === 'ongoing' ? 'info' : 'default'} className="capitalize">
          {p.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Added On',
      sortable: true,
      render: (p) => formatDate(p.created_at),
    },
  ], []);

  return (
    <DashboardLayout sections={builderSections} title="Projects" badge="Builder">
      <PageHeader
        title="My Projects"
        subtitle="Manage your developments, towers, and units."
        actions={[
          {
            label: 'Add Project',
            primary: true,
            onClick: () => alert('Project creation wizard would open here.'),
          }
        ]}
      />
      
      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={data || []}
          loading={isLoading}
          error={error instanceof Error ? error.message : null}
          getRowId={(row) => row.id}
          searchKeys={['name', 'rera_id']}
          selectedIds={selected}
          onToggleSelect={(id) => setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          onSelectAll={(ids) => setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach(id => next.has(id) ? next.delete(id) : next.add(id));
            return next;
          })}
        />
      </div>
    </DashboardLayout>
  );
}
