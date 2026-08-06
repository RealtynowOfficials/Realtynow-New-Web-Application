import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit3, Percent, Trash2, UserCog, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Badge, Button, EmptyState, Input, Modal, Select } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeMulti } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { formatDate } from '../../lib/utils';

type BuilderAgentStatus = 'active' | 'inactive';

interface BuilderAgent {
  id: string;
  builder_id: string;
  agent_profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percent: number;
  status: BuilderAgentStatus;
  created_at: string;
  updated_at: string;
}

interface BuilderProjectLite {
  id: string;
  name: string;
}

interface BuilderProjectAgentRow {
  id: string;
  project_id: string;
  agent_id: string;
  assigned_at: string;
  builder_projects: { id: string; name: string } | null;
}

interface AgentForm {
  name: string;
  email: string;
  phone: string;
  commission_percent: string;
  status: BuilderAgentStatus;
}

const EMPTY_FORM: AgentForm = { name: '', email: '', phone: '', commission_percent: '', status: 'active' };

export function BuilderAgents() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const realtimeTick = useRealtimeMulti(['builder_agents', 'builder_project_agents']);

  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<BuilderAgent | 'new' | null>(null);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [assigningAgent, setAssigningAgent] = useState<BuilderAgent | null>(null);
  const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set());
  const [assignSaving, setAssignSaving] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-projects-lite', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_projects').select('id, name').eq('builder_id', user!.id).order('name');
      if (error) throw error;
      return (data ?? []) as BuilderProjectLite[];
    },
    enabled: !!user,
  });

  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['builder-agents-full', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_agents').select('*').eq('builder_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderAgent[];
    },
    enabled: !!user,
  });

  const { data: projectAgents } = useQuery({
    queryKey: ['builder-project-agents', user?.id, projectIds.join(','), realtimeTick],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const { data, error } = await supabase
        .from('builder_project_agents')
        .select('*, builder_projects(id, name)')
        .in('project_id', projectIds);
      if (error) throw error;
      return (data ?? []) as BuilderProjectAgentRow[];
    },
    enabled: !!user && projects !== undefined,
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditing('new');
  };

  const openEdit = (a: BuilderAgent) => {
    setForm({
      name: a.name,
      email: a.email ?? '',
      phone: a.phone ?? '',
      commission_percent: String(a.commission_percent ?? ''),
      status: a.status,
    });
    setFormErrors({});
    setEditing(a);
  };

  const save = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    const commission = Number(form.commission_percent);
    if (form.commission_percent === '' || Number.isNaN(commission) || commission < 0 || commission > 100) {
      errors.commission_percent = 'Enter a value between 0 and 100';
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        commission_percent: commission,
        status: form.status,
      };

      if (editing && editing !== 'new') {
        const { error } = await supabase.from('builder_agents').update(payload).eq('id', editing.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_agents', editing.id, payload);
        addToast('success', 'Agent updated');
      } else {
        const { data: inserted, error } = await supabase
          .from('builder_agents')
          .insert({ ...payload, builder_id: user!.id })
          .select('id')
          .single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_agents', inserted?.id ?? null, payload);
        addToast('success', 'Agent added');
      }

      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['builder-agents-full'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('builder_agents').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_agents', id);
      queryClient.invalidateQueries({ queryKey: ['builder-agents-full'] });
      queryClient.invalidateQueries({ queryKey: ['builder-project-agents'] });
      setToDelete(null);
      addToast('success', 'Agent removed');
    },
    onError: (err) => addToast('error', err instanceof Error ? err.message : 'Failed to delete agent'),
  });

  const openAssign = (a: BuilderAgent) => {
    const current = new Set((projectAgents ?? []).filter((pa) => pa.agent_id === a.id).map((pa) => pa.project_id));
    setAssignSelected(current);
    setAssigningAgent(a);
  };

  const toggleAssignProject = (projectId: string) => {
    setAssignSelected((prev) => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assigningAgent) return;
    setAssignSaving(true);
    try {
      const current = new Set((projectAgents ?? []).filter((pa) => pa.agent_id === assigningAgent.id).map((pa) => pa.project_id));
      const toAdd = [...assignSelected].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !assignSelected.has(id));

      if (toAdd.length) {
        const { error } = await supabase
          .from('builder_project_agents')
          .insert(toAdd.map((project_id) => ({ project_id, agent_id: assigningAgent.id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const rowIds = (projectAgents ?? [])
          .filter((pa) => pa.agent_id === assigningAgent.id && toRemove.includes(pa.project_id))
          .map((pa) => pa.id);
        if (rowIds.length) {
          const { error } = await supabase.from('builder_project_agents').delete().in('id', rowIds);
          if (error) throw error;
        }
      }

      await logBuilderAudit('assign_projects', 'builder_agents', assigningAgent.id, { added: toAdd, removed: toRemove });
      addToast('success', 'Project assignments updated');
      setAssigningAgent(null);
      queryClient.invalidateQueries({ queryKey: ['builder-project-agents'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update assignments');
    } finally {
      setAssignSaving(false);
    }
  };

  const columns = useMemo<Column<BuilderAgent>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        render: (a) => <p className="font-medium text-navy-900">{a.name}</p>,
      },
      { key: 'email', header: 'Email', render: (a) => a.email ?? '—' },
      { key: 'phone', header: 'Phone', render: (a) => a.phone ?? '—' },
      {
        key: 'commission_percent',
        header: 'Commission %',
        sortable: true,
        render: (a) => `${a.commission_percent ?? 0}%`,
      },
      {
        key: 'status',
        header: 'Status',
        render: (a) => (
          <Badge variant={a.status === 'active' ? 'success' : 'default'} className="capitalize">
            {a.status}
          </Badge>
        ),
      },
      {
        key: 'projects',
        header: 'Assigned Projects',
        render: (a) => {
          const count = (projectAgents ?? []).filter((pa) => pa.agent_id === a.id).length;
          return (
            <button
              type="button"
              onClick={() => openAssign(a)}
              className="text-xs font-bold text-navy-700 hover:underline inline-flex items-center gap-1"
            >
              <Building2 className="h-3.5 w-3.5" />
              {count} project{count === 1 ? '' : 's'}
            </button>
          );
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (a) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<UserCog className="h-4 w-4" />} onClick={() => openAssign(a)}>
              Assign
            </Button>
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(a)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(a.id)}
            />
          </div>
        ),
      },
    ],
    [projectAgents],
  );

  const stats = useMemo(() => {
    const rows = agents ?? [];
    const active = rows.filter((a) => a.status === 'active').length;
    const avgCommission = rows.length ? rows.reduce((sum, a) => sum + (a.commission_percent || 0), 0) / rows.length : 0;
    return { total: rows.length, active, assignedProjects: (projectAgents ?? []).length, avgCommission };
  }, [agents, projectAgents]);

  return (
    <DashboardLayout sections={builderSections} title="Agents" badge="Builder">
      <PageHeader
        title="Sales Agents"
        subtitle="Manage agents and assign them to your projects."
        action={
          <Button onClick={openCreate} icon={<Users className="h-4 w-4" />}>
            Add agent
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Agents" value={stats.total} icon={<Users className="h-5 w-5" />} accent="navy" />
        <StatCard label="Active" value={stats.active} icon={<UserCog className="h-5 w-5" />} accent="success" />
        <StatCard label="Project Assignments" value={stats.assignedProjects} icon={<Building2 className="h-5 w-5" />} accent="gold" />
        <StatCard label="Avg. Commission" value={`${stats.avgCommission.toFixed(1)}%`} icon={<Percent className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={agents ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(a) => a.id}
        searchKeys={['name', 'email', 'phone']}
        emptyState={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No agents yet"
            description="Add sales agents and assign them to your projects."
            action={
              <Button onClick={openCreate} icon={<Users className="h-4 w-4" />}>
                Add agent
              </Button>
            }
          />
        }
      />

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remove agent"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => toDelete && deleteMutation.mutate(toDelete)}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">This will permanently remove this agent and their project assignments.</p>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add agent' : 'Edit agent'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save agent
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              error={formErrors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              error={formErrors.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Commission %"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.commission_percent}
              error={formErrors.commission_percent}
              onChange={(e) => setForm((f) => ({ ...f, commission_percent: e.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderAgentStatus }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        )}
      </Modal>

      <Modal
        open={!!assigningAgent}
        onClose={() => setAssigningAgent(null)}
        title={`Assign projects — ${assigningAgent?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigningAgent(null)}>
              Cancel
            </Button>
            <Button onClick={saveAssignments} loading={assignSaving}>
              Save assignments
            </Button>
          </>
        }
      >
        {(projects ?? []).length === 0 ? (
          <p className="text-sm text-navy-500">You have no projects yet.</p>
        ) : (
          <div className="space-y-2">
            {(projects ?? []).map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-navy-100 px-3 py-2 text-sm hover:bg-navy-50/60"
              >
                <input
                  type="checkbox"
                  checked={assignSelected.has(p.id)}
                  onChange={() => toggleAssignProject(p.id)}
                  className="rounded border-navy-300 text-navy-700 focus:ring-navy-400"
                />
                <span className="font-medium text-navy-900">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
