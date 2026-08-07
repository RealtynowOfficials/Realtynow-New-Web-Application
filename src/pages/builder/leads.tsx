import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Button, Select } from '../../components/ui';
import { useToast } from '../../components/toast';
import { formatDate } from '../../lib/utils';
import { Activity, LayoutList, Trello } from 'lucide-react';
import { BuilderKanbanBoard } from '../../components/builder/BuilderKanbanBoard';

const BUILDER_LEAD_STATUSES = ['new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost', 'closed'];

export function BuilderLeads() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_leads')
        .select('*, builder_projects(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('builder_leads').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-leads', user?.id] });
      addToast('success', 'Lead status updated');
    },
    onError: (err) => {
      addToast('error', err.message);
    },
  });

  const columns = useMemo<Column<any>[]>(() => [
    {
      key: 'name',
      header: 'Lead Name',
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-medium text-navy-900">{l.name}</p>
          <p className="text-xs text-navy-500">{l.email || l.phone || 'No contact info'}</p>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Project Interest',
      render: (l) => <span className="text-sm font-medium">{l.builder_projects?.name || 'General Inquiry'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Select
          value={l.status}
          onChange={(ev) => updateStatus.mutate({ id: l.id, status: ev.target.value })}
          className="py-1 text-xs w-32 capitalize"
        >
          {BUILDER_LEAD_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: 'created_at',
      header: 'Received On',
      sortable: true,
      render: (l) => formatDate(l.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Activity className="h-4 w-4" />}
          onClick={() => navigate(`/builder/crm/${l.id}`)}
        >
          Activity
        </Button>
      ),
    },
  ], [updateStatus, navigate]);

  return (
    <DashboardLayout sections={builderSections} title="Leads CRM" badge="Builder">
      <PageHeader
        title="Leads & Inquiries"
        subtitle="Manage leads for your projects."
        actions={[
          {
            icon: viewMode === 'list' ? <Trello className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />,
            label: viewMode === 'list' ? 'Kanban View' : 'List View',
            onClick: () => setViewMode(v => v === 'list' ? 'kanban' : 'list'),
          }
        ]}
      />
      
      <div className="mt-6">
        {viewMode === 'kanban' ? (
          <BuilderKanbanBoard leads={data || []} onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })} />
        ) : (
          <DataTable
            columns={columns}
            rows={data || []}
            loading={isLoading}
            error={error instanceof Error ? error.message : null}
            getRowId={(row) => row.id}
            searchKeys={['name', 'email', 'phone']}
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
        )}
      </div>
    </DashboardLayout>
  );
}
