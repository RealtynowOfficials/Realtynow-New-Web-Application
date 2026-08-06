import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit3, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Badge, Button, EmptyState, Input, Modal, Select } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import type { BuilderTower, BuilderTowerStatus } from '../../lib/types';

type TowerRow = BuilderTower & { builder_projects: { name: string } | null };

const STATUS_OPTIONS: BuilderTowerStatus[] = ['planned', 'under_construction', 'ready'];

const statusBadgeVariant = (status: BuilderTowerStatus) =>
  status === 'ready' ? 'success' : status === 'under_construction' ? 'warning' : 'default';

const emptyForm = { project_id: '', name: '', total_floors: '1', status: 'planned' as BuilderTowerStatus };

export function BuilderBlocks() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TowerRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<TowerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-my-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);
  const towersTick = useRealtimeCount('builder_towers');

  const {
    data: towers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['builder-towers', user?.id, projectIds.join(','), towersTick],
    queryFn: async () => {
      if (projectIds.length === 0) return [] as TowerRow[];
      const { data, error } = await supabase
        .from('builder_towers')
        .select('*, builder_projects(name)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TowerRow[];
    },
    enabled: !!user && !!projects,
  });

  const stats = useMemo(() => {
    const rows = towers ?? [];
    return {
      total: rows.length,
      ready: rows.filter((r) => r.status === 'ready').length,
      underConstruction: rows.filter((r) => r.status === 'under_construction').length,
      planned: rows.filter((r) => r.status === 'planned').length,
    };
  }, [towers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, project_id: projectIds[0] ?? '' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (row: TowerRow) => {
    setEditing(row);
    setForm({
      project_id: row.project_id,
      name: row.name,
      total_floors: String(row.total_floors),
      status: row.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.project_id) errs.project_id = 'Project is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    const totalFloors = Number(form.total_floors);
    if (!form.total_floors || Number.isNaN(totalFloors) || totalFloors < 1) {
      errs.total_floors = 'Total floors must be at least 1';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveTower = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        project_id: form.project_id,
        name: form.name.trim(),
        total_floors: Number(form.total_floors),
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('builder_towers').update(payload).eq('id', editing.id);
        if (error) throw error;
        logBuilderAudit('update', 'builder_towers', editing.id, { name: payload.name }).catch(() => {});
        addToast('success', 'Block updated');
      } else {
        const { data, error } = await supabase.from('builder_towers').insert(payload).select('id').single();
        if (error) throw error;
        logBuilderAudit('create', 'builder_towers', data?.id ?? null, { name: payload.name }).catch(() => {});
        addToast('success', 'Block created');
      }
      queryClient.invalidateQueries({ queryKey: ['builder-towers'] });
      setShowModal(false);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save block');
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (row: TowerRow) => {
      const { error } = await supabase.from('builder_towers').delete().eq('id', row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      logBuilderAudit('delete', 'builder_towers', row.id, { name: row.name }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['builder-towers'] });
      addToast('success', 'Block deleted');
      setToDelete(null);
    },
    onError: (err) => {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete block');
    },
    onSettled: () => setDeleting(false),
  });

  const columns = useMemo<Column<TowerRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        render: (row) => <span className="font-medium text-navy-900">{row.name}</span>,
      },
      {
        key: 'project',
        header: 'Project',
        render: (row) => <span className="text-sm text-navy-600">{row.builder_projects?.name ?? '—'}</span>,
      },
      { key: 'total_floors', header: 'Total Floors', sortable: true, render: (row) => row.total_floors },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={statusBadgeVariant(row.status)} className="capitalize">
            {row.status.replace('_', ' ')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(row)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(row)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={builderSections} title="Blocks" badge="Builder">
      <PageHeader
        title="Blocks / Towers"
        subtitle="Manage the towers within your projects."
        actions={[{ label: 'Add Block', icon: <Plus className="h-4 w-4" />, primary: true, onClick: openCreate }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Blocks" value={stats.total} icon={<Building2 className="h-5 w-5" />} accent="navy" />
        <StatCard label="Ready" value={stats.ready} icon={<Building2 className="h-5 w-5" />} accent="success" />
        <StatCard
          label="Under Construction"
          value={stats.underConstruction}
          icon={<Building2 className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard label="Planned" value={stats.planned} icon={<Building2 className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={towers ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(row) => row.id}
        searchKeys={['name']}
        selectedIds={selected}
        onToggleSelect={(id) =>
          setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })
        }
        onSelectAll={(ids) =>
          setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
            return next;
          })
        }
        emptyState={
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No blocks yet"
            description="Add your first tower or block to start organizing floors and units."
            action={
              <Button size="sm" onClick={openCreate}>
                Add Block
              </Button>
            }
          />
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Block' : 'Add Block'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveTower} loading={saving}>
              {editing ? 'Save changes' : 'Create block'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Project"
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
            error={formErrors.project_id}
            className="sm:col-span-2"
          >
            <option value="">Select a project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
          />
          <Input
            label="Total Floors"
            type="number"
            min={1}
            value={form.total_floors}
            onChange={(e) => setForm((f) => ({ ...f, total_floors: e.target.value }))}
            error={formErrors.total_floors}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderTowerStatus }))}
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
        title="Delete block"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => {
                if (toDelete) {
                  setDeleting(true);
                  deleteMutation.mutate(toDelete);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">
          This will permanently delete "{toDelete?.name}" along with its floors and units.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
