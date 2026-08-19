import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, Percent, Plus, Tag, Trash2, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Button, EmptyState, Input, Modal, Select, Textarea } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { formatDate, formatPrice } from '../../lib/utils';
import { BuilderWorkflowBar } from '../../components/builder/BuilderWorkflowBar';
import type { BuilderPricingRule } from '../../lib/types';

type PricingRow = BuilderPricingRule & {
  builder_projects: { name: string } | null;
  builder_towers: { name: string } | null;
};

const emptyForm = {
  project_id: '',
  tower_id: '',
  unit_type: '',
  base_price: '',
  price_per_sqft: '',
  discount_percent: '0',
  effective_from: new Date().toISOString().slice(0, 10),
  notes: '',
};

export function BuilderPricing() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PricingRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PricingRow | null>(null);
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

  const { data: towers } = useQuery({
    queryKey: ['builder-my-towers', user?.id, projectIds.join(',')],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('builder_towers')
        .select('id, name, project_id')
        .in('project_id', projectIds)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!projects,
  });

  const pricingTick = useRealtimeCount('builder_pricing_rules');

  const {
    data: rules,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['builder-pricing-rules', user?.id, projectIds.join(','), pricingTick],
    queryFn: async () => {
      if (projectIds.length === 0) return [] as PricingRow[];
      const { data, error } = await supabase
        .from('builder_pricing_rules')
        .select('*, builder_projects(name), builder_towers(name)')
        .in('project_id', projectIds)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PricingRow[];
    },
    enabled: !!user && !!projects,
  });

  const stats = useMemo(() => {
    const rows = rules ?? [];
    const avgDiscount = rows.length
      ? rows.reduce((sum, r) => sum + Number(r.discount_percent || 0), 0) / rows.length
      : 0;
    const unitTypes = new Set(rows.map((r) => r.unit_type)).size;
    const towerSpecific = rows.filter((r) => !!r.tower_id).length;
    return { total: rows.length, avgDiscount, unitTypes, towerSpecific };
  }, [rules]);

  const towersForProject = useMemo(
    () => (towers ?? []).filter((tw) => tw.project_id === form.project_id),
    [towers, form.project_id],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, project_id: projectIds[0] ?? '' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (row: PricingRow) => {
    setEditing(row);
    setForm({
      project_id: row.project_id,
      tower_id: row.tower_id ?? '',
      unit_type: row.unit_type,
      base_price: String(row.base_price),
      price_per_sqft: row.price_per_sqft != null ? String(row.price_per_sqft) : '',
      discount_percent: String(row.discount_percent),
      effective_from: row.effective_from,
      notes: row.notes ?? '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.project_id) errs.project_id = 'Project is required';
    if (!form.unit_type.trim()) errs.unit_type = 'Unit type is required';
    const basePrice = Number(form.base_price);
    if (!form.base_price || Number.isNaN(basePrice) || basePrice <= 0) {
      errs.base_price = 'Base price must be greater than 0';
    }
    if (form.price_per_sqft && (Number.isNaN(Number(form.price_per_sqft)) || Number(form.price_per_sqft) < 0)) {
      errs.price_per_sqft = 'Price per sqft must be a positive number';
    }
    const discount = Number(form.discount_percent);
    if (form.discount_percent === '' || Number.isNaN(discount) || discount < 0 || discount > 100) {
      errs.discount_percent = 'Discount must be between 0 and 100';
    }
    if (!form.effective_from) errs.effective_from = 'Effective date is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveRule = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        project_id: form.project_id,
        tower_id: form.tower_id || null,
        unit_type: form.unit_type.trim(),
        base_price: Number(form.base_price),
        price_per_sqft: form.price_per_sqft ? Number(form.price_per_sqft) : null,
        discount_percent: Number(form.discount_percent),
        effective_from: form.effective_from,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from('builder_pricing_rules').update(payload).eq('id', editing.id);
        if (error) throw error;
        logBuilderAudit('update', 'builder_pricing_rules', editing.id, { unit_type: payload.unit_type }).catch(
          () => {},
        );
        addToast('success', 'Pricing rule updated');
      } else {
        const { data, error } = await supabase.from('builder_pricing_rules').insert(payload).select('id').single();
        if (error) throw error;
        logBuilderAudit('create', 'builder_pricing_rules', data?.id ?? null, {
          unit_type: payload.unit_type,
        }).catch(() => {});
        addToast('success', 'Pricing rule created');
      }
      queryClient.invalidateQueries({ queryKey: ['builder-pricing-rules'] });
      setShowModal(false);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (row: PricingRow) => {
      const { error } = await supabase.from('builder_pricing_rules').delete().eq('id', row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      logBuilderAudit('delete', 'builder_pricing_rules', row.id, { unit_type: row.unit_type }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['builder-pricing-rules'] });
      addToast('success', 'Pricing rule deleted');
      setToDelete(null);
    },
    onError: (err) => {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete pricing rule');
    },
    onSettled: () => setDeleting(false),
  });

  const columns = useMemo<Column<PricingRow>[]>(
    () => [
      {
        key: 'project',
        header: 'Project',
        render: (row) => <span className="font-medium text-navy-900">{row.builder_projects?.name ?? '—'}</span>,
      },
      {
        key: 'tower',
        header: 'Block / Tower',
        render: (row) => <span className="text-sm text-navy-600">{row.builder_towers?.name ?? 'All towers'}</span>,
      },
      { key: 'unit_type', header: 'Unit Type', render: (row) => row.unit_type },
      { key: 'base_price', header: 'Base Price', sortable: true, render: (row) => formatPrice(row.base_price) },
      { key: 'price_per_sqft', header: 'Price / sqft', render: (row) => formatPrice(row.price_per_sqft) },
      { key: 'discount_percent', header: 'Discount %', render: (row) => `${row.discount_percent}%` },
      {
        key: 'effective_from',
        header: 'Effective From',
        sortable: true,
        render: (row) => formatDate(row.effective_from),
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
    <DashboardLayout sections={builderSections} title="Pricing" badge="Builder">
      <PageHeader
        title="Pricing Rules"
        subtitle="Manage base pricing and discounts across your projects."
        actions={[{ label: 'Add Pricing Rule', icon: <Plus className="h-4 w-4" />, primary: true, onClick: openCreate }]}
      />

      {/* Contextual Workflow Progression */}
      <BuilderWorkflowBar
        currentStage="pricing"
        counts={{
          projects: projects?.length,
          blocks: towers?.length,
          pricingRules: rules?.length,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Rules" value={stats.total} icon={<Tag className="h-5 w-5" />} accent="navy" />
        <StatCard label="Unit Types" value={stats.unitTypes} icon={<Tag className="h-5 w-5" />} accent="gold" />
        <StatCard
          label="Avg. Discount"
          value={`${stats.avgDiscount.toFixed(1)}%`}
          icon={<Percent className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Tower-Specific Rules"
          value={stats.towerSpecific}
          icon={<Tag className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rules ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(row) => row.id}
        searchKeys={['unit_type']}
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
          !projects || projects.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="No projects yet"
              description="Create your first project before setting pricing rules."
              action={
                <Link to="/builder/projects">
                  <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                    Create Project
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Tag className="h-6 w-6" />}
              title="No pricing rules yet"
              description="Set base pricing and discounts for unit types across your projects."
              action={
                <Button size="sm" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                  Add Pricing Rule
                </Button>
              }
            />
          )
        }
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveRule} loading={saving}>
              {editing ? 'Save changes' : 'Create rule'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Project"
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, tower_id: '' }))}
            error={formErrors.project_id}
          >
            <option value="">Select a project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Block / Tower (optional)"
            value={form.tower_id}
            onChange={(e) => setForm((f) => ({ ...f, tower_id: e.target.value }))}
          >
            <option value="">All towers in project</option>
            {towersForProject.map((tw) => (
              <option key={tw.id} value={tw.id}>
                {tw.name}
              </option>
            ))}
          </Select>
          <Input
            label="Unit Type"
            placeholder="e.g. 2BHK"
            value={form.unit_type}
            onChange={(e) => setForm((f) => ({ ...f, unit_type: e.target.value }))}
            error={formErrors.unit_type}
          />
          <Input
            label="Base Price"
            type="number"
            min={0}
            value={form.base_price}
            onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
            error={formErrors.base_price}
          />
          <Input
            label="Price per sqft (optional)"
            type="number"
            min={0}
            value={form.price_per_sqft}
            onChange={(e) => setForm((f) => ({ ...f, price_per_sqft: e.target.value }))}
            error={formErrors.price_per_sqft}
          />
          <Input
            label="Discount %"
            type="number"
            min={0}
            max={100}
            value={form.discount_percent}
            onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
            error={formErrors.discount_percent}
          />
          <Input
            label="Effective From"
            type="date"
            value={form.effective_from}
            onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
            error={formErrors.effective_from}
            containerClassName="sm:col-span-2"
          />
          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            containerClassName="sm:col-span-2"
          />
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete pricing rule"
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
          This will permanently delete the pricing rule for "{toDelete?.unit_type}".
        </p>
      </Modal>
    </DashboardLayout>
  );
}
