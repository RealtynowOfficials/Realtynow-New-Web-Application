import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Wallet, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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
import { formatDate, formatPrice } from '../../lib/utils';
import type { BuilderPayment, BuilderPaymentStatus } from '../../lib/types';

type PaymentRow = BuilderPayment & {
  builder_bookings: { id: string; booking_date: string; builder_units: { unit_number: string } | null } | null;
};

interface BookingOption {
  id: string;
  booking_date: string;
  amount: number | null;
  builder_units: { unit_number: string } | null;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold';

const STATUS_OPTIONS: BuilderPaymentStatus[] = ['pending', 'paid', 'overdue', 'partial'];

const emptyForm = {
  id: '',
  booking_id: '',
  amount: '',
  due_date: '',
  paid_date: '',
  status: 'pending' as BuilderPaymentStatus,
  payment_mode: '',
  reference_no: '',
};

function statusVariant(status: BuilderPaymentStatus): BadgeVariant {
  if (status === 'paid') return 'success';
  if (status === 'overdue') return 'error';
  return 'warning';
}

function bookingLabel(b: BookingOption): string {
  const unit = b.builder_units?.unit_number ?? 'Unit N/A';
  return `${unit} · ${formatDate(b.booking_date)} · ${formatPrice(b.amount)}`;
}

export function BuilderPayments() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const realtimeTick = useRealtimeCount('builder_payments');

  const { data: bookings } = useQuery({
    queryKey: ['builder-payments-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_bookings')
        .select('id, booking_date, amount, builder_units(unit_number)')
        .order('booking_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingOption[];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-payments', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_payments')
        .select('*, builder_bookings(id, booking_date, builder_units(unit_number))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentRow[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const collected = list.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = list
      .filter((p) => p.status === 'pending' || p.status === 'partial')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const overdueCount = list.filter((p) => p.status === 'overdue').length;
    return { collected, pending, overdueCount, total: list.length };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('builder_payments').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_payment', id);
      addToast('success', 'Payment deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['builder-payments'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete payment'),
  });

  const openCreate = () => {
    setForm({ ...emptyForm, booking_id: bookings?.[0]?.id ?? '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: PaymentRow) => {
    setForm({
      id: p.id,
      booking_id: p.booking_id,
      amount: String(p.amount),
      due_date: p.due_date ?? '',
      paid_date: p.paid_date ?? '',
      status: p.status,
      payment_mode: p.payment_mode ?? '',
      reference_no: p.reference_no ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.booking_id) errs.booking_id = 'Booking is required';
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        booking_id: form.booking_id,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        status: form.status,
        payment_mode: form.payment_mode.trim() || null,
        reference_no: form.reference_no.trim() || null,
      };
      if (form.id) {
        const { error } = await supabase.from('builder_payments').update(payload).eq('id', form.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_payment', form.id, payload);
        addToast('success', 'Payment updated');
      } else {
        const { data: inserted, error } = await supabase.from('builder_payments').insert(payload).select('id').single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_payment', inserted?.id ?? null, payload);
        addToast('success', 'Payment recorded');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['builder-payments'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<PaymentRow>[] = useMemo(
    () => [
      {
        key: 'booking',
        header: 'Booking',
        render: (p) => (
          <div>
            <p className="font-medium text-navy-900">{p.builder_bookings?.builder_units?.unit_number ?? '—'}</p>
            <p className="text-xs text-navy-500">{formatDate(p.builder_bookings?.booking_date)}</p>
          </div>
        ),
      },
      { key: 'amount', header: 'Amount', sortable: true, render: (p) => formatPrice(p.amount) },
      { key: 'due_date', header: 'Due Date', sortable: true, render: (p) => formatDate(p.due_date) },
      { key: 'paid_date', header: 'Paid Date', sortable: true, render: (p) => formatDate(p.paid_date) },
      {
        key: 'status',
        header: 'Status',
        render: (p) => (
          <Badge variant={statusVariant(p.status)} className="capitalize">
            {p.status}
          </Badge>
        ),
      },
      { key: 'payment_mode', header: 'Payment Mode', render: (p) => p.payment_mode ?? '—' },
      { key: 'reference_no', header: 'Reference No', render: (p) => p.reference_no ?? '—' },
      {
        key: 'actions',
        header: 'Actions',
        render: (p) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(p)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(p.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={builderSections} title="Payments" badge="Builder">
      <PageHeader
        title="Payments"
        subtitle="Track payment schedules and receipts across bookings."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!bookings?.length}>
            Record Payment
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Collected" value={formatPrice(stats.collected)} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Pending" value={formatPrice(stats.pending)} icon={<Clock className="h-5 w-5" />} accent="gold" />
        <StatCard label="Overdue" value={stats.overdueCount} icon={<AlertTriangle className="h-5 w-5" />} accent="error" />
        <StatCard label="Total Payments" value={stats.total} icon={<Wallet className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(p) => p.id}
        searchKeys={['reference_no', 'payment_mode']}
        emptyState={
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="No payments yet"
            description="Record a payment against a booking to start tracking collections."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit payment' : 'Record payment'}
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
              label="Booking"
              value={form.booking_id}
              error={formErrors.booking_id}
              onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value }))}
            >
              <option value="">Select booking</option>
              {(bookings ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {bookingLabel(b)}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Amount"
            type="number"
            min={0}
            value={form.amount}
            error={formErrors.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderPaymentStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
          <Input
            label="Paid date"
            type="date"
            value={form.paid_date}
            onChange={(e) => setForm((f) => ({ ...f, paid_date: e.target.value }))}
          />
          <Input
            label="Payment mode"
            placeholder="Cash, UPI, Cheque, Bank Transfer…"
            value={form.payment_mode}
            onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
          />
          <Input
            label="Reference no."
            value={form.reference_no}
            onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete payment"
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
        <p className="text-sm text-navy-700">This will permanently delete this payment record.</p>
      </Modal>
    </DashboardLayout>
  );
}
