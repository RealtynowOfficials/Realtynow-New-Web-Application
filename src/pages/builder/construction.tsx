import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, HardHat, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Modal, Input, Select, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { formatDate, cn } from '../../lib/utils';
import type { BuilderConstructionMilestone, BuilderMilestoneStatus } from '../../lib/types';

type MilestoneRow = BuilderConstructionMilestone & {
  builder_projects: { name: string } | null;
  builder_towers: { name: string } | null;
};

interface ProjectOption {
  id: string;
  name: string;
}

interface TowerOption {
  id: string;
  name: string;
  project_id: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold';

const STATUS_OPTIONS: BuilderMilestoneStatus[] = ['pending', 'in_progress', 'completed', 'delayed'];

const emptyForm = {
  id: '',
  project_id: '',
  tower_id: '',
  title: '',
  planned_date: '',
  actual_date: '',
  percent_complete: '0',
  status: 'pending' as BuilderMilestoneStatus,
};

function statusVariant(status: BuilderMilestoneStatus): BadgeVariant {
  if (status === 'completed') return 'success';
  if (status === 'delayed') return 'error';
  if (status === 'in_progress') return 'gold';
  return 'default';
}

export function BuilderConstruction() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | BuilderMilestoneStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const realtimeTick = useRealtimeCount('builder_construction_milestones');

  const { data: projects } = useQuery({
    queryKey: ['builder-construction-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ProjectOption[];
    },
    enabled: !!user,
  });

  const { data: towers } = useQuery({
    queryKey: ['builder-construction-towers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_towers').select('id, name, project_id').order('name');
      if (error) throw error;
      return (data ?? []) as TowerOption[];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-construction-milestones', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_construction_milestones')
        .select('*, builder_projects(name), builder_towers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MilestoneRow[];
    },
    enabled: !!user,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    if (statusFilter === 'all') return data;
    return data.filter((m) => m.status === statusFilter);
  }, [data, statusFilter]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const avg = list.length ? Math.round(list.reduce((sum, m) => sum + m.percent_complete, 0) / list.length) : 0;
    return {
      total: list.length,
      completed: list.filter((m) => m.status === 'completed').length,
      delayed: list.filter((m) => m.status === 'delayed').length,
      avg,
    };
  }, [data]);

  const towersForProject = useMemo(
    () => (towers ?? []).filter((tw) => tw.project_id === form.project_id),
    [towers, form.project_id],
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('builder_construction_milestones').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_construction_milestone', id);
      addToast('success', 'Milestone deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['builder-construction-milestones'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete milestone'),
  });

  const openCreate = () => {
    setForm({ ...emptyForm, project_id: projects?.[0]?.id ?? '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (m: MilestoneRow) => {
    setForm({
      id: m.id,
      project_id: m.project_id,
      tower_id: m.tower_id ?? '',
      title: m.title,
      planned_date: m.planned_date ?? '',
      actual_date: m.actual_date ?? '',
      percent_complete: String(m.percent_complete),
      status: m.status,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.project_id) errs.project_id = 'Project is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    const pct = Number(form.percent_complete);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) errs.percent_complete = 'Must be between 0 and 100';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        project_id: form.project_id,
        tower_id: form.tower_id || null,
        title: form.title.trim(),
        planned_date: form.planned_date || null,
        actual_date: form.actual_date || null,
        percent_complete: Number(form.percent_complete),
        status: form.status,
      };
      if (form.id) {
        const { error } = await supabase.from('builder_construction_milestones').update(payload).eq('id', form.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_construction_milestone', form.id, payload);
        addToast('success', 'Milestone updated');
      } else {
        const { data: inserted, error } = await supabase
          .from('builder_construction_milestones')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_construction_milestone', inserted?.id ?? null, payload);
        addToast('success', 'Milestone created');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['builder-construction-milestones'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MilestoneRow>[] = useMemo(
    () => [
      { key: 'project', header: 'Project', render: (m) => m.builder_projects?.name ?? '—' },
      { key: 'tower', header: 'Tower', render: (m) => m.builder_towers?.name ?? '—' },
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (m) => <span className="font-medium text-navy-900">{m.title}</span>,
      },
      { key: 'planned_date', header: 'Planned Date', sortable: true, render: (m) => formatDate(m.planned_date) },
      { key: 'actual_date', header: 'Actual Date', sortable: true, render: (m) => formatDate(m.actual_date) },
      {
        key: 'percent_complete',
        header: 'Progress',
        render: (m) => (
          <div className="flex w-32 items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-100">
              <div
                className={cn(
                  'h-full rounded-full',
                  m.status === 'completed' ? 'bg-success-500' : m.status === 'delayed' ? 'bg-error-500' : 'bg-navy-600',
                )}
                style={{ width: `${m.percent_complete}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-navy-600">{m.percent_complete}%</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (m) => (
          <Badge variant={statusVariant(m.status)} className="capitalize">
            {m.status.replace('_', ' ')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (m) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(m)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(m.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={builderSections} title="Construction" badge="Builder">
      <PageHeader
        title="Construction Progress"
        subtitle="Track milestones across your projects and towers."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!projects?.length}>
            Add Milestone
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Milestones" value={stats.total} icon={<HardHat className="h-5 w-5" />} accent="navy" />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Delayed" value={stats.delayed} icon={<AlertTriangle className="h-5 w-5" />} accent="error" />
        <StatCard label="Avg. Progress" value={`${stats.avg}%`} icon={<Clock className="h-5 w-5" />} accent="gold" />
      </div>

      <div className="mb-4 max-w-xs">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | BuilderMilestoneStatus)}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(m) => m.id}
        searchKeys={['title']}
        emptyState={
          <EmptyState
            icon={<HardHat className="h-6 w-6" />}
            title="No milestones yet"
            description="Add your first construction milestone to start tracking progress."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit milestone' : 'Add milestone'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Project"
            value={form.project_id}
            error={formErrors.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, tower_id: '' }))}
          >
            <option value="">Select project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Tower (optional)"
            value={form.tower_id}
            onChange={(e) => setForm((f) => ({ ...f, tower_id: e.target.value }))}
          >
            <option value="">No specific tower</option>
            {towersForProject.map((tw) => (
              <option key={tw.id} value={tw.id}>
                {tw.name}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Input
              label="Title"
              value={form.title}
              error={formErrors.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <Input
            label="Planned date"
            type="date"
            value={form.planned_date}
            onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))}
          />
          <Input
            label="Actual date"
            type="date"
            value={form.actual_date}
            onChange={(e) => setForm((f) => ({ ...f, actual_date: e.target.value }))}
          />
          <Input
            label="Percent complete"
            type="number"
            min={0}
            max={100}
            value={form.percent_complete}
            error={formErrors.percent_complete}
            onChange={(e) => setForm((f) => ({ ...f, percent_complete: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderMilestoneStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete milestone"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => toDelete && deleteMutation.mutate(toDelete)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">This will permanently delete this construction milestone.</p>
      </Modal>
    </DashboardLayout>
  );
}
