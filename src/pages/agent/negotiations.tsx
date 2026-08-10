import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Tag, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Modal, Input, Select, Textarea, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { formatPrice, formatDate } from '../../lib/utils';

type NegotiationStatus = 'open' | 'countered' | 'accepted' | 'rejected' | 'withdrawn';

interface Negotiation {
  id: string;
  lead_id: string;
  property_id: string | null;
  round_number: number;
  offer_amount: number;
  counter_amount: number | null;
  status: NegotiationStatus;
  notes: string | null;
  created_at: string;
  enquiries: { name: string | null } | null;
  properties: { title: string } | null;
}

const STATUSES: NegotiationStatus[] = ['open', 'countered', 'accepted', 'rejected', 'withdrawn'];

function makeEmptyForm() {
  return {
    id: '',
    lead_id: '',
    property_id: '',
    round_number: '1',
    offer_amount: '',
    counter_amount: '',
    status: 'open' as NegotiationStatus,
    notes: '',
  };
}

function statusVariant(s: NegotiationStatus): 'default' | 'info' | 'success' | 'error' | 'warning' {
  if (s === 'accepted') return 'success';
  if (s === 'rejected' || s === 'withdrawn') return 'error';
  if (s === 'countered') return 'warning';
  return 'info';
}

export function AgentNegotiations() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Negotiation | null>(null);

  const realtimeTick = useRealtimeCount('agent_negotiations', { column: 'agent_id', value: user?.id ?? '' });

  const { data: leads } = useQuery({
    queryKey: ['agent-negotiations-leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enquiries')
        .select('id, name, property_id')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-negotiations', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_negotiations')
        .select('*, enquiries:lead_id(name), properties:property_id(title)')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Negotiation[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      open: rows.filter((r) => r.status === 'open' || r.status === 'countered').length,
      accepted: rows.filter((r) => r.status === 'accepted').length,
      rejected: rows.filter((r) => r.status === 'rejected' || r.status === 'withdrawn').length,
    };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_negotiations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      addToast('success', 'Negotiation deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['agent-negotiations'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete'),
  });

  const openCreate = () => {
    setForm(makeEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (n: Negotiation) => {
    setForm({
      id: n.id,
      lead_id: n.lead_id,
      property_id: n.property_id ?? '',
      round_number: String(n.round_number),
      offer_amount: String(n.offer_amount),
      counter_amount: n.counter_amount != null ? String(n.counter_amount) : '',
      status: n.status,
      notes: n.notes ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.lead_id) errs.lead_id = 'Select a lead';
    if (!form.offer_amount || Number(form.offer_amount) <= 0) errs.offer_amount = 'Enter a valid offer amount';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const selectedLead = leads?.find((l) => l.id === form.lead_id);
      const payload = {
        agent_id: user!.id,
        lead_id: form.lead_id,
        property_id: form.property_id || selectedLead?.property_id || null,
        round_number: Number(form.round_number) || 1,
        offer_amount: Number(form.offer_amount),
        counter_amount: form.counter_amount ? Number(form.counter_amount) : null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (form.id) {
        const { error } = await supabase.from('agent_negotiations').update(payload).eq('id', form.id);
        if (error) throw error;
        addToast('success', 'Negotiation updated');
      } else {
        const { error } = await supabase.from('agent_negotiations').insert(payload);
        if (error) throw error;
        addToast('success', 'Negotiation recorded');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agent-negotiations'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save negotiation');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Negotiation>[] = useMemo(
    () => [
      {
        key: 'lead',
        header: 'Lead',
        render: (n) => (
          <div>
            <p className="font-semibold text-navy-900">{n.enquiries?.name ?? '—'}</p>
            {n.properties?.title && <p className="text-xs text-navy-400 mt-0.5">{n.properties.title}</p>}
          </div>
        ),
      },
      { key: 'round', header: 'Round', render: (n) => <span className="text-navy-600">#{n.round_number}</span> },
      { key: 'offer', header: 'Offer', sortable: true, render: (n) => <span className="font-semibold">{formatPrice(n.offer_amount)}</span> },
      {
        key: 'counter',
        header: 'Counter',
        render: (n) => <span className="text-navy-600">{n.counter_amount != null ? formatPrice(n.counter_amount) : '—'}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (n) => (
          <Badge variant={statusVariant(n.status)} className="capitalize">
            {n.status}
          </Badge>
        ),
      },
      { key: 'created_at', header: 'Updated', sortable: true, render: (n) => formatDate(n.created_at) },
      {
        key: 'actions',
        header: 'Actions',
        render: (n) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(n)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(n)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={agentSections} title="Negotiations" badge="Agent">
      <PageHeader
        title="Negotiations"
        subtitle="Track offers and counter-offers through to close."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Log Offer
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Negotiations" value={stats.total} icon={<Tag className="h-5 w-5" />} accent="navy" />
        <StatCard label="In Progress" value={stats.open} icon={<TrendingUp className="h-5 w-5" />} accent="gold" />
        <StatCard label="Accepted" value={stats.accepted} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Rejected/Withdrawn" value={stats.rejected} icon={<XCircle className="h-5 w-5" />} accent="error" />
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(n) => n.id}
        emptyState={
          <EmptyState
            icon={<Tag className="h-6 w-6" />}
            title="No negotiations yet"
            description="Log an offer from a lead to start tracking the negotiation."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit negotiation' : 'Log offer'}
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
            <Select
              label="Lead"
              value={form.lead_id}
              error={formErrors.lead_id}
              onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))}
              disabled={!!form.id}
            >
              <option value="">Select a lead</option>
              {(leads ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            type="number"
            label="Round number"
            value={form.round_number}
            onChange={(e) => setForm((f) => ({ ...f, round_number: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as NegotiationStatus }))}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            label="Offer amount (₹)"
            value={form.offer_amount}
            error={formErrors.offer_amount}
            onChange={(e) => setForm((f) => ({ ...f, offer_amount: e.target.value }))}
          />
          <Input
            type="number"
            label="Counter amount (₹, optional)"
            value={form.counter_amount}
            onChange={(e) => setForm((f) => ({ ...f, counter_amount: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete negotiation"
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
        <p className="text-sm text-navy-700">This will permanently delete this negotiation record.</p>
      </Modal>
    </DashboardLayout>
  );
}
