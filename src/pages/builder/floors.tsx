import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, Layers, Plus, Trash2 } from 'lucide-react';
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
import type { BuilderFloor, BuilderTowerStatus } from '../../lib/types';

type FloorRow = BuilderFloor & { builder_towers: { name: string } | null };

const STATUS_OPTIONS: BuilderTowerStatus[] = ['planned', 'under_construction', 'ready'];

const statusBadgeVariant = (status: BuilderTowerStatus) =>
  status === 'ready' ? 'success' : status === 'under_construction' ? 'warning' : 'default';

const emptyForm = { tower_id: '', floor_number: '', name: '', status: 'planned' as BuilderTowerStatus };

export function BuilderFloors() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FloorRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<FloorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-my-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_projects').select('id').eq('builder_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);

  const { data: towers } = useQuery({
    queryKey: ['builder-my-towers', user?.id, projectIds.join(',')],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('builder_towers')
        .select('id, name')
        .in('project_id', projectIds)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!projects,
  });

  const towerIds = useMemo(() => (towers ?? []).map((tw) => tw.id), [towers]);
  const floorsTick = useRealtimeCount('builder_floors');

  const {
    data: floors,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['builder-floors', user?.id, towerIds.join(','), floorsTick],
    queryFn: async () => {
      if (towerIds.length === 0) return [] as FloorRow[];
      const { data, error } = await supabase
        .from('builder_floors')
        .select('*, builder_towers(name)')
        .in('tower_id', towerIds)
        .order('floor_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FloorRow[];
    },
    enabled: !!user && !!towers,
  });

  const stats = useMemo(() => {
    const rows = floors ?? [];
    return {
      total: rows.length,
      ready: rows.filter((r) => r.status === 'ready').length,
      underConstruction: rows.filter((r) => r.status === 'under_construction').length,
      planned: rows.filter((r) => r.status === 'planned').length,
    };
  }, [floors]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, tower_id: towerIds[0] ?? '' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (row: FloorRow) => {
    setEditing(row);
    setForm({
      tower_id: row.tower_id,
      floor_number: String(row.floor_number),
      name: row.name ?? '',
      status: row.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.tower_id) errs.tower_id = 'Block/tower is required';
    if (form.floor_number.trim() === '' || Number.isNaN(Number(form.floor_number))) {
      errs.floor_number = 'Floor number is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveFloor = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        tower_id: form.tower_id,
        floor_number: Number(form.floor_number),
        name: form.name.trim() || null,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('builder_floors').update(payload).eq('id', editing.id);
        if (error) throw error;
        logBuilderAudit('update', 'builder_floors', editing.id, { floor_number: payload.floor_number }).catch(
          () => {},
        );
        addToast('success', 'Floor updated');
      } else {
        const { data, error } = await supabase.from('builder_floors').insert(payload).select('id').single();
        if (error) throw error;
        logBuilderAudit('create', 'builder_floors', data?.id ?? null, { floor_number: payload.floor_number }).catch(
          () => {},
        );
        addToast('success', 'Floor created');
      }
      queryClient.invalidateQueries({ queryKey: ['builder-floors'] });
      setShowModal(false);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save floor');
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (row: FloorRow) => {
      const { error } = await supabase.from('builder_floors').delete().eq('id', row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      logBuilderAudit('delete', 'builder_floors', row.id, { floor_number: row.floor_number }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['builder-floors'] });
      addToast('success', 'Floor deleted');
      setToDelete(null);
    },
    onError: (err) => {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete floor');
    },
    onSettled: () => setDeleting(false),
  });

  const columns = useMemo<Column<FloorRow>[]>(
    () => [
      { key: 'floor_number', header: 'Floor #', sortable: true, render: (row) => row.floor_number },
      { key: 'name', header: 'Name', render: (row) => row.name ?? '—' },
      {
        key: 'tower',
        header: 'Block / Tower',
        render: (row) => <span className="text-sm text-navy-600">{row.builder_towers?.name ?? '—'}</span>,
      },
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
    <DashboardLayout sections={builderSections} title="Floors" badge="Builder">
      <PageHeader
        title="Floors"
        subtitle="Manage floors within your blocks and towers."
        actions={[{ label: 'Add Floor', icon: <Plus className="h-4 w-4" />, primary: true, onClick: openCreate }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Floors" value={stats.total} icon={<Layers className="h-5 w-5" />} accent="navy" />
        <StatCard label="Ready" value={stats.ready} icon={<Layers className="h-5 w-5" />} accent="success" />
        <StatCard
          label="Under Construction"
          value={stats.underConstruction}
          icon={<Layers className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard label="Planned" value={stats.planned} icon={<Layers className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={floors ?? []}
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
            icon={<Layers className="h-6 w-6" />}
            title="No floors yet"
            description="Add floors to a block to start placing units on them."
            action={
              <Button size="sm" onClick={openCreate}>
                Add Floor
              </Button>
            }
          />
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Floor' : 'Add Floor'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveFloor} loading={saving}>
              {editing ? 'Save changes' : 'Create floor'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Block / Tower"
            value={form.tower_id}
            onChange={(e) => setForm((f) => ({ ...f, tower_id: e.target.value }))}
            error={formErrors.tower_id}
            className="sm:col-span-2"
          >
            <option value="">Select a block/tower</option>
            {(towers ?? []).map((tw) => (
              <option key={tw.id} value={tw.id}>
                {tw.name}
              </option>
            ))}
          </Select>
          <Input
            label="Floor Number"
            type="number"
            value={form.floor_number}
            onChange={(e) => setForm((f) => ({ ...f, floor_number: e.target.value }))}
            error={formErrors.floor_number}
          />
          <Input
            label="Name (optional)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderTowerStatus }))}
            className="sm:col-span-2"
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
        title="Delete floor"
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
          This will permanently delete floor {toDelete?.floor_number} and unlink any units placed on it.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
