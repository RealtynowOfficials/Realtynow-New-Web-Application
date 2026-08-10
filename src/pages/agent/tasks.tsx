import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, ListTodo, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Modal, Input, Select, Textarea, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { formatDate } from '../../lib/utils';

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface AgentTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  related_lead_id: string | null;
  created_at: string;
  enquiries: { name: string | null } | null;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

function makeEmptyForm() {
  return {
    id: '',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    related_lead_id: '',
  };
}

function priorityVariant(p: TaskPriority): 'default' | 'warning' | 'error' {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'default';
}

function statusVariant(s: TaskStatus): 'default' | 'info' | 'success' {
  if (s === 'completed') return 'success';
  if (s === 'in_progress') return 'info';
  return 'default';
}

function isOverdue(task: AgentTask): boolean {
  if (task.status === 'completed' || !task.due_date) return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

export function AgentTasks() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AgentTask | null>(null);

  const realtimeTick = useRealtimeCount('agent_tasks', { column: 'agent_id', value: user?.id ?? '' });

  const { data: leads } = useQuery({
    queryKey: ['agent-tasks-leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enquiries')
        .select('id, name')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-tasks', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*, enquiries:related_lead_id(name)')
        .eq('agent_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgentTask[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      inProgress: rows.filter((r) => r.status === 'in_progress').length,
      overdue: rows.filter(isOverdue).length,
    };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      addToast('success', 'Task deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete task'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from('agent_tasks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-tasks'] }),
    onError: (err: Error) => addToast('error', err.message || 'Failed to update status'),
  });

  const openCreate = () => {
    setForm(makeEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (task: AgentTask) => {
    setForm({
      id: task.id,
      title: task.title,
      description: task.description ?? '',
      due_date: task.due_date ?? '',
      priority: task.priority,
      status: task.status,
      related_lead_id: task.related_lead_id ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        agent_id: user!.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        related_lead_id: form.related_lead_id || null,
      };
      if (form.id) {
        const { error } = await supabase.from('agent_tasks').update(payload).eq('id', form.id);
        if (error) throw error;
        addToast('success', 'Task updated');
      } else {
        const { error } = await supabase.from('agent_tasks').insert(payload);
        if (error) throw error;
        addToast('success', 'Task created');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AgentTask>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Task',
        sortable: true,
        render: (task) => (
          <div>
            <p className="font-semibold text-navy-900">{task.title}</p>
            {task.enquiries?.name && <p className="text-xs text-navy-400 mt-0.5">Re: {task.enquiries.name}</p>}
          </div>
        ),
      },
      {
        key: 'due_date',
        header: 'Due',
        sortable: true,
        render: (task) => (
          <span className={isOverdue(task) ? 'text-error-600 font-semibold flex items-center gap-1' : 'text-navy-600'}>
            {isOverdue(task) && <AlertTriangle className="h-3.5 w-3.5" />}
            {task.due_date ? formatDate(task.due_date) : '—'}
          </span>
        ),
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (task) => (
          <Badge variant={priorityVariant(task.priority)} className="capitalize">
            {task.priority}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (task) => (
          <Select
            value={task.status}
            onChange={(e) => statusMutation.mutate({ id: task.id, status: e.target.value as TaskStatus })}
            className="py-1 text-xs w-32"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (task) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(task)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(task)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={agentSections} title="Tasks" badge="Agent">
      <PageHeader
        title="Tasks"
        subtitle="Follow-ups, reminders, and to-dos linked to your leads."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Task
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} icon={<ListTodo className="h-5 w-5" />} accent="navy" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-5 w-5" />} accent="gold" />
        <StatCard label="In Progress" value={stats.inProgress} icon={<Clock className="h-5 w-5" />} accent="navy" />
        <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle className="h-5 w-5" />} accent="error" />
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(t) => t.id}
        searchKeys={['title', 'description']}
        emptyState={
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="No tasks yet"
            description="Create a task to keep track of follow-ups and reminders."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit task' : 'New task'}
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
          <div className="sm:col-span-2">
            <Input
              label="Title"
              value={form.title}
              error={formErrors.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Input
            type="date"
            label="Due date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          <Select
            label="Related lead (optional)"
            value={form.related_lead_id}
            onChange={(e) => setForm((f) => ({ ...f, related_lead_id: e.target.value }))}
          >
            <option value="">No specific lead</option>
            {(leads ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">This will permanently delete this task.</p>
      </Modal>
    </DashboardLayout>
  );
}
