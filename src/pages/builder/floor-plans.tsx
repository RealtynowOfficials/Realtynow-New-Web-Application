import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Plus, Edit3, Trash2, ImageOff, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { Card, Button, Modal, Input, Select, EmptyState, Skeleton } from '../../components/ui';
import { uploadFile } from '../../lib/storage';
import { logBuilderAudit } from '../../lib/builder-audit';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import type { BuilderFloorPlan, BuilderProject, BuilderTower } from '../../lib/types';

interface FloorPlanForm {
  project_id: string;
  tower_id: string;
  unit_type: string;
  name: string;
  size_sqft: string;
  bedrooms: string;
  image_url: string;
}

const emptyForm: FloorPlanForm = {
  project_id: '',
  tower_id: '',
  unit_type: '',
  name: '',
  size_sqft: '',
  bedrooms: '',
  image_url: '',
};

export function BuilderFloorPlans() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const realtimeTick = useRealtimeCount('builder_floor_plans');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BuilderFloorPlan | null>(null);
  const [form, setForm] = useState<FloorPlanForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<BuilderFloorPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-floor-plans-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Pick<BuilderProject, 'id' | 'name'>[];
    },
    enabled: !!user,
  });

  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);

  const { data: towers } = useQuery({
    queryKey: ['builder-floor-plans-towers', projectIds.join(',')],
    queryFn: async () => {
      if (!projectIds.length) return [] as Pick<BuilderTower, 'id' | 'name' | 'project_id'>[];
      const { data, error } = await supabase
        .from('builder_towers')
        .select('id, name, project_id')
        .in('project_id', projectIds)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Pick<BuilderTower, 'id' | 'name' | 'project_id'>[];
    },
    enabled: projectIds.length > 0,
  });

  const { data: floorPlans, isLoading, error } = useQuery({
    queryKey: ['builder-floor-plans', projectIds.join(','), realtimeTick],
    queryFn: async () => {
      if (!projectIds.length) return [] as BuilderFloorPlan[];
      const { data, error } = await supabase
        .from('builder_floor_plans')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderFloorPlan[];
    },
    enabled: projectIds.length > 0,
  });

  const projectName = (id: string) => (projects ?? []).find((p) => p.id === id)?.name ?? '—';
  const towerName = (id: string | null) => (id ? ((towers ?? []).find((t) => t.id === id)?.name ?? '—') : '—');

  const towersForProject = useMemo(
    () => (towers ?? []).filter((t) => t.project_id === form.project_id),
    [towers, form.project_id],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, project_id: projects?.[0]?.id ?? '' });
    setFile(null);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (fp: BuilderFloorPlan) => {
    setEditing(fp);
    setForm({
      project_id: fp.project_id,
      tower_id: fp.tower_id ?? '',
      unit_type: fp.unit_type ?? '',
      name: fp.name,
      size_sqft: fp.size_sqft != null ? String(fp.size_sqft) : '',
      bedrooms: fp.bedrooms != null ? String(fp.bedrooms) : '',
      image_url: fp.image_url,
    });
    setFile(null);
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.project_id) next.project_id = 'Project is required';
    if (!form.name.trim()) next.name = 'Name is required';
    if (!editing && !file && !form.image_url) next.image_url = 'Image is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = form.image_url;
      if (file) {
        const res = await uploadFile('builder-media', file);
        if (res.error) throw new Error(res.error);
        imageUrl = res.url;
      }
      const payload = {
        project_id: form.project_id,
        tower_id: form.tower_id || null,
        unit_type: form.unit_type.trim() || null,
        name: form.name.trim(),
        image_url: imageUrl,
        size_sqft: form.size_sqft ? Number(form.size_sqft) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      };
      if (editing) {
        const { error } = await supabase.from('builder_floor_plans').update(payload).eq('id', editing.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_floor_plans', editing.id, payload);
      } else {
        const { data, error } = await supabase.from('builder_floor_plans').insert(payload).select('id').single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_floor_plans', data?.id ?? null, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-floor-plans'] });
      addToast('success', editing ? 'Floor plan updated' : 'Floor plan created');
      setShowForm(false);
    },
    onError: (e: unknown) => {
      addToast('error', e instanceof Error ? e.message : 'Failed to save floor plan');
    },
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    saveMutation.mutate();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('builder_floor_plans').delete().eq('id', toDelete.id);
      if (error) throw error;
      await logBuilderAudit('delete', 'builder_floor_plans', toDelete.id, { name: toDelete.name });
      queryClient.invalidateQueries({ queryKey: ['builder-floor-plans'] });
      addToast('success', 'Floor plan deleted');
      setToDelete(null);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to delete floor plan');
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const rows = floorPlans ?? [];
    const withBedrooms = rows.filter((r) => r.bedrooms != null);
    const avgSize = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + (r.size_sqft ?? 0), 0) / rows.length)
      : 0;
    return {
      total: rows.length,
      unitTypes: new Set(rows.map((r) => r.unit_type).filter(Boolean)).size,
      avgSize,
      avgBedrooms: withBedrooms.length
        ? (withBedrooms.reduce((sum, r) => sum + (r.bedrooms ?? 0), 0) / withBedrooms.length).toFixed(1)
        : '—',
    };
  }, [floorPlans]);

  return (
    <DashboardLayout sections={builderSections} title="Floor Plans" badge="Builder">
      <PageHeader
        title="Floor Plans"
        subtitle="Manage floor plan images and unit specifications across your projects."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!projects?.length}>
            Add Floor Plan
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Floor Plans" value={stats.total} icon={<LayoutGrid className="h-5 w-5" />} accent="navy" />
        <StatCard label="Unit Types" value={stats.unitTypes} icon={<Building2 className="h-5 w-5" />} accent="gold" />
        <StatCard label="Avg. Size (sqft)" value={stats.avgSize || '—'} icon={<LayoutGrid className="h-5 w-5" />} accent="navy" />
        <StatCard label="Avg. Bedrooms" value={stats.avgBedrooms} icon={<Building2 className="h-5 w-5" />} accent="success" />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
          {error instanceof Error ? error.message : 'Failed to load floor plans'}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !floorPlans?.length ? (
        <Card>
          <EmptyState
            icon={<LayoutGrid className="h-6 w-6" />}
            title="No floor plans yet"
            description="Add your first floor plan to showcase unit layouts to buyers."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!projects?.length}>
                Add Floor Plan
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {floorPlans.map((fp) => (
            <Card key={fp.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-navy-100">
                {fp.image_url ? (
                  <img src={fp.image_url} alt={fp.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-navy-300">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-navy-900 text-base line-clamp-1">{fp.name}</h4>
                  <p className="text-xs text-navy-500 mt-0.5">
                    {projectName(fp.project_id)}
                    {fp.tower_id ? ` · ${towerName(fp.tower_id)}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-navy-600">
                    {fp.unit_type && <span className="badge bg-navy-100 text-navy-700">{fp.unit_type}</span>}
                    {fp.size_sqft != null && <span className="badge bg-navy-100 text-navy-700">{fp.size_sqft} sqft</span>}
                    {fp.bedrooms != null && <span className="badge bg-navy-100 text-navy-700">{fp.bedrooms} BHK</span>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(fp)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setToDelete(fp)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit floor plan' : 'Add floor plan'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Project"
            value={form.project_id}
            error={errors.project_id}
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
            <option value="">None</option>
            {towersForProject.map((tw) => (
              <option key={tw.id} value={tw.id}>
                {tw.name}
              </option>
            ))}
          </Select>
          <Input
            label="Unit type"
            placeholder="e.g. 2BHK"
            value={form.unit_type}
            onChange={(e) => setForm((f) => ({ ...f, unit_type: e.target.value }))}
          />
          <Input
            label="Name"
            error={errors.name}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Size (sqft)"
            type="number"
            value={form.size_sqft}
            onChange={(e) => setForm((f) => ({ ...f, size_sqft: e.target.value }))}
          />
          <Input
            label="Bedrooms"
            type="number"
            value={form.bedrooms}
            onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <label className="label">Floor plan image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input"
            />
            {errors.image_url && <p className="mt-1 text-xs text-error-600">{errors.image_url}</p>}
            {(file || form.image_url) && !errors.image_url && (
              <p className="mt-1 text-xs text-navy-400">
                {file ? file.name : 'Current image will be kept unless a new file is selected.'}
              </p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete floor plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">
          This will permanently delete “{toDelete?.name}”. This action cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
