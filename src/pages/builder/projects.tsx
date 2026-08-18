import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Layers,
  FileText,
  MapPin,
  CheckCircle2,
  Calendar,
  Eye,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Input, Modal, Select, Textarea, Card, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { formatDate } from '../../lib/utils';
import { logBuilderAudit } from '../../lib/builder-audit';
import type { BuilderProject, BuilderProjectStatus } from '../../lib/types';

const STATUS_OPTIONS: BuilderProjectStatus[] = ['upcoming', 'ongoing', 'completed'];

const emptyForm = {
  name: '',
  rera_id: '',
  description: '',
  status: 'ongoing' as BuilderProjectStatus,
  city_id: '',
  locality_id: '',
  cover_image: '',
};

export function BuilderProjects() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BuilderProject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<BuilderProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Cities & Localities
  const { data: cities } = useQuery({
    queryKey: ['builder-cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data: localities } = useQuery({
    queryKey: ['builder-localities', form.city_id],
    queryFn: async () => {
      if (!form.city_id) return [];
      const { data } = await supabase
        .from('localities')
        .select('id, name')
        .eq('city_id', form.city_id)
        .order('name');
      return data ?? [];
    },
    enabled: !!form.city_id,
  });

  // Fetch Builder's Projects
  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('*, cities(name), localities(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as (BuilderProject & {
        cities: { name: string } | null;
        localities: { name: string } | null;
      })[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      ongoing: rows.filter((r) => r.status === 'ongoing').length,
      completed: rows.filter((r) => r.status === 'completed').length,
      upcoming: rows.filter((r) => r.status === 'upcoming').length,
    };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      city_id: cities?.[0]?.id || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (row: BuilderProject) => {
    setEditing(row);
    setForm({
      name: row.name,
      rera_id: row.rera_id || '',
      description: row.description || '',
      status: row.status,
      city_id: row.city_id || '',
      locality_id: row.locality_id || '',
      cover_image: row.cover_image || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);
    try {
      const payload = {
        builder_id: user.id,
        name: form.name.trim(),
        rera_id: form.rera_id.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        city_id: form.city_id || null,
        locality_id: form.locality_id || null,
        cover_image: form.cover_image.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase.from('builder_projects').update(payload).eq('id', editing.id);
        if (error) throw error;
        await logBuilderAudit('update_project', 'builder_projects', editing.id, {
          name: payload.name,
          status: payload.status,
        });
        addToast('success', 'Project updated successfully');
      } else {
        const { data: inserted, error } = await supabase.from('builder_projects').insert(payload).select().single();
        if (error) throw error;
        await logBuilderAudit('create_project', 'builder_projects', inserted.id, {
          name: payload.name,
          status: payload.status,
        });
        addToast('success', 'Project created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['builder-projects'] });
      setShowModal(false);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('builder_projects').delete().eq('id', toDelete.id);
      if (error) throw error;
      await logBuilderAudit('delete_project', 'builder_projects', toDelete.id, { name: toDelete.name });
      addToast('success', 'Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['builder-projects'] });
      setToDelete(null);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to delete project. Please delete associated towers & units first.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        key: 'name',
        header: 'Project Name',
        sortable: true,
        render: (p) => (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-400 overflow-hidden shrink-0 border border-navy-100">
              {p.cover_image ? (
                <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-navy-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-navy-900">{p.name}</p>
              <p className="text-xs text-navy-500">RERA: {p.rera_id || 'Under Application'}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        render: (p) => (
          <span className="text-xs text-navy-700">
            📍 {[p.localities?.name, p.cities?.name].filter(Boolean).join(', ') || 'Hyderabad'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (p) => (
          <Badge
            variant={p.status === 'completed' ? 'success' : p.status === 'ongoing' ? 'gold' : 'info'}
            className="capitalize text-xs"
          >
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
      {
        key: 'actions',
        header: 'Actions',
        render: (p) => (
          <div className="flex items-center gap-1.5">
            <Link
              to="/builder/blocks"
              className="p-1.5 text-navy-600 hover:bg-navy-50 rounded-lg text-xs flex items-center gap-1 font-medium transition"
              title="Manage Towers"
            >
              <Layers className="h-3.5 w-3.5" /> Towers
            </Link>
            <Link
              to="/builder/inventory"
              className="p-1.5 text-navy-600 hover:bg-navy-50 rounded-lg text-xs flex items-center gap-1 font-medium transition"
              title="Manage Inventory"
            >
              <Package className="h-3.5 w-3.5" /> Units
            </Link>
            <button
              onClick={() => openEdit(p)}
              className="p-1.5 text-navy-600 hover:bg-navy-50 rounded-lg transition"
              title="Edit Project"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setToDelete(p)}
              className="p-1.5 text-error-500 hover:bg-error-50 rounded-lg transition"
              title="Delete Project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <DashboardLayout sections={builderSections} title="Projects" badge="Builder">
      <PageHeader
        title="Developer Project Portfolio"
        subtitle="Manage large-scale residential and commercial developments, track RERA registrations, towers, and inventory."
        action={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add Project
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
        <StatCard
          label="Total Developments"
          value={stats.total}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Under Construction"
          value={stats.ongoing}
          icon={<Layers className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label="Completed & Handed Over"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Upcoming Launches"
          value={stats.upcoming}
          icon={<Calendar className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <div className="mt-8">
        <Card className="p-0 overflow-hidden border-navy-100">
          <DataTable
            columns={columns}
            rows={data || []}
            loading={isLoading}
            error={error instanceof Error ? error.message : null}
            getRowId={(row) => row.id}
            searchKeys={['name', 'rera_id']}
            selectedIds={selected}
            emptyState={
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="No projects created yet"
                description="Click 'Add Project' above to launch your first master development project."
              />
            }
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
          />
        </Card>
      </div>

      {/* Project Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Project Details' : 'Add New Development Project'}
        size="lg"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">Project Name *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Prestige High Fields / My Home Bhooja"
              required
            />
            {formErrors.name && <p className="text-xs text-error-600 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">RERA Registration Number</label>
              <Input
                value={form.rera_id}
                onChange={(e) => setForm((f) => ({ ...f, rera_id: e.target.value }))}
                placeholder="e.g. P02400001234"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">Project Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderProjectStatus }))}
                className="w-full text-sm rounded-lg border border-navy-200 p-2.5 bg-white text-navy-900 focus:ring-2 focus:ring-gold-400 outline-none capitalize"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">City</label>
              <select
                value={form.city_id}
                onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value, locality_id: '' }))}
                className="w-full text-sm rounded-lg border border-navy-200 p-2.5 bg-white text-navy-900 focus:ring-2 focus:ring-gold-400 outline-none"
              >
                <option value="">-- Select City --</option>
                {cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">Locality</label>
              <select
                value={form.locality_id}
                onChange={(e) => setForm((f) => ({ ...f, locality_id: e.target.value }))}
                className="w-full text-sm rounded-lg border border-navy-200 p-2.5 bg-white text-navy-900 focus:ring-2 focus:ring-gold-400 outline-none"
                disabled={!form.city_id}
              >
                <option value="">-- Select Locality --</option>
                {localities?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">Cover Image URL</label>
            <Input
              value={form.cover_image}
              onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))}
              placeholder="https://images.pexels.com/..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-700 mb-1">Project Overview & Highlights</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the architectural design, master plan acres, clubhouse area, and connectivity..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-navy-100">
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Confirm Project Deletion" size="sm">
        <div className="py-2 space-y-4">
          <p className="text-sm text-navy-700">
            Are you sure you want to delete <strong className="text-navy-900">{toDelete?.name}</strong>? This action is
            permanent and requires that all towers and units are removed first.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
