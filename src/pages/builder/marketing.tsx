import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Megaphone, IndianRupee, Activity, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { Button, Modal, Input, Select, Textarea, Badge } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { logBuilderAudit } from '../../lib/builder-audit';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { formatDate, formatPrice } from '../../lib/utils';
import type {
  BuilderMarketingCampaign,
  BuilderProject,
  BuilderCampaignChannel,
  BuilderCampaignStatus,
} from '../../lib/types';

interface CampaignRow extends BuilderMarketingCampaign {
  builder_projects?: { name: string } | null;
}

interface CampaignForm {
  title: string;
  project_id: string;
  channel: BuilderCampaignChannel;
  status: BuilderCampaignStatus;
  content: string;
  budget: string;
  start_date: string;
  end_date: string;
}

const emptyForm: CampaignForm = {
  title: '',
  project_id: '',
  channel: 'social',
  status: 'draft',
  content: '',
  budget: '',
  start_date: '',
  end_date: '',
};

const statusVariant: Record<BuilderCampaignStatus, 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold'> = {
  draft: 'default',
  scheduled: 'info',
  active: 'success',
  completed: 'gold',
  paused: 'warning',
};

export function BuilderMarketing() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const realtimeTick = useRealtimeCount('builder_marketing_campaigns');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-marketing-projects', user?.id],
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

  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['builder-marketing-campaigns', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_marketing_campaigns')
        .select('*, builder_projects(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
    enabled: !!user,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (c: CampaignRow) => {
    setEditing(c);
    setForm({
      title: c.title,
      project_id: c.project_id ?? '',
      channel: c.channel,
      status: c.status,
      content: c.content ?? '',
      budget: c.budget != null ? String(c.budget) : '',
      start_date: c.start_date ?? '',
      end_date: c.end_date ?? '',
    });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      next.end_date = 'End date cannot be before start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        builder_id: user!.id,
        title: form.title.trim(),
        project_id: form.project_id || null,
        channel: form.channel,
        status: form.status,
        content: form.content.trim() || null,
        budget: form.budget ? Number(form.budget) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editing) {
        const { error } = await supabase.from('builder_marketing_campaigns').update(payload).eq('id', editing.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_marketing_campaigns', editing.id, payload);
      } else {
        const { data, error } = await supabase
          .from('builder_marketing_campaigns')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_marketing_campaigns', data?.id ?? null, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-marketing-campaigns'] });
      addToast('success', editing ? 'Campaign updated' : 'Campaign created');
      setShowForm(false);
    },
    onError: (e: unknown) => {
      addToast('error', e instanceof Error ? e.message : 'Failed to save campaign');
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
      const { error } = await supabase.from('builder_marketing_campaigns').delete().eq('id', toDelete.id);
      if (error) throw error;
      await logBuilderAudit('delete', 'builder_marketing_campaigns', toDelete.id, { title: toDelete.title });
      queryClient.invalidateQueries({ queryKey: ['builder-marketing-campaigns'] });
      addToast('success', 'Campaign deleted');
      setToDelete(null);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const rows = campaigns ?? [];
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      totalBudget: rows.reduce((sum, r) => sum + (r.budget ?? 0), 0),
      channels: new Set(rows.map((r) => r.channel)).size,
    };
  }, [campaigns]);

  const columns: Column<CampaignRow>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (c) => <span className="font-medium text-navy-900">{c.title}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      render: (c) => <span className="text-sm text-navy-600">{c.builder_projects?.name ?? '—'}</span>,
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (c) => (
        <Badge variant="info" className="capitalize">
          {c.channel}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={statusVariant[c.status]} className="capitalize">
          {c.status}
        </Badge>
      ),
    },
    { key: 'budget', header: 'Budget', render: (c) => formatPrice(c.budget) },
    {
      key: 'dates',
      header: 'Start / End',
      render: (c) => (
        <span className="text-xs text-navy-600">
          {formatDate(c.start_date)} – {formatDate(c.end_date)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(c)} />
          <Button
            size="sm"
            variant="ghost"
            className="text-error-600"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setToDelete(c)}
          />
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout sections={builderSections} title="Marketing" badge="Builder">
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Plan and track campaigns across channels for your projects."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Campaign
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Campaigns" value={stats.total} icon={<Megaphone className="h-5 w-5" />} accent="navy" />
        <StatCard label="Active" value={stats.active} icon={<Radio className="h-5 w-5" />} accent="success" />
        <StatCard label="Total Budget" value={formatPrice(stats.totalBudget)} icon={<IndianRupee className="h-5 w-5" />} accent="gold" />
        <StatCard label="Channels Used" value={stats.channels} icon={<Activity className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={campaigns ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(c) => c.id}
        searchKeys={['title']}
        emptyState={
          <div className="px-4 py-10 text-center text-sm text-navy-400">
            No campaigns yet. Create your first marketing campaign.
          </div>
        }
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit campaign' : 'New campaign'}
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
          <div className="sm:col-span-2">
            <Input
              label="Title"
              error={errors.title}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <Select
            label="Project (optional)"
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
          >
            <option value="">None</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Channel"
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as BuilderCampaignChannel }))}
          >
            <option value="social">Social</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="print">Print</option>
            <option value="other">Other</option>
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderCampaignStatus }))}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </Select>
          <Input
            label="Budget"
            type="number"
            value={form.budget}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
          />
          <Input
            label="Start date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
          />
          <Input
            label="End date"
            type="date"
            error={errors.end_date}
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Content / notes"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete campaign"
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
          This will permanently delete “{toDelete?.title}”. This action cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
