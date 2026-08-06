import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Receipt, IndianRupee, Clock, ExternalLink } from 'lucide-react';
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
import type { BuilderInvoice, BuilderInvoiceStatus } from '../../lib/types';

type InvoiceRow = BuilderInvoice & {
  builder_bookings: { id: string; booking_date: string; builder_units: { unit_number: string } | null } | null;
  builder_customers: { name: string } | null;
};

interface BookingOption {
  id: string;
  booking_date: string;
  builder_units: { unit_number: string } | null;
}

interface CustomerOption {
  id: string;
  name: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold';

const STATUS_OPTIONS: BuilderInvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

function makeEmptyForm() {
  return {
    id: '',
    invoice_number: `INV-${Date.now()}`,
    booking_id: '',
    customer_id: '',
    amount: '',
    tax_amount: '0',
    status: 'draft' as BuilderInvoiceStatus,
    due_date: '',
    issued_date: new Date().toISOString().slice(0, 10),
    pdf_url: '',
  };
}

function statusVariant(status: BuilderInvoiceStatus): BadgeVariant {
  if (status === 'paid') return 'success';
  if (status === 'overdue') return 'error';
  if (status === 'sent') return 'info';
  if (status === 'cancelled') return 'warning';
  return 'default';
}

export function BuilderInvoices() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const realtimeTick = useRealtimeCount('builder_invoices');

  const { data: bookings } = useQuery({
    queryKey: ['builder-invoices-bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_bookings')
        .select('id, booking_date, builder_units(unit_number)')
        .order('booking_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingOption[];
    },
    enabled: !!user,
  });

  const { data: customers } = useQuery({
    queryKey: ['builder-invoices-customers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_customers')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as CustomerOption[];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-invoices', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_invoices')
        .select('*, builder_bookings(id, booking_date, builder_units(unit_number)), builder_customers(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const totalInvoiced = list.reduce((sum, i) => sum + Number(i.total_amount ?? i.amount + i.tax_amount), 0);
    const totalPaid = list
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total_amount ?? i.amount + i.tax_amount), 0);
    const outstanding = list
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .reduce((sum, i) => sum + Number(i.total_amount ?? i.amount + i.tax_amount), 0);
    const overdueCount = list.filter((i) => i.status === 'overdue').length;
    return { totalInvoiced, totalPaid, outstanding, overdueCount };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('builder_invoices').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_invoice', id);
      addToast('success', 'Invoice deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['builder-invoices'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete invoice'),
  });

  const openCreate = () => {
    setForm(makeEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (i: InvoiceRow) => {
    setForm({
      id: i.id,
      invoice_number: i.invoice_number,
      booking_id: i.booking_id ?? '',
      customer_id: i.customer_id ?? '',
      amount: String(i.amount),
      tax_amount: String(i.tax_amount),
      status: i.status,
      due_date: i.due_date ?? '',
      issued_date: i.issued_date,
      pdf_url: i.pdf_url ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const totalPreview = useMemo(() => {
    const amt = Number(form.amount) || 0;
    const tax = Number(form.tax_amount) || 0;
    return amt + tax;
  }, [form.amount, form.tax_amount]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.invoice_number.trim()) errs.invoice_number = 'Invoice number is required';
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) errs.amount = 'Enter a valid amount';
    const tax = Number(form.tax_amount);
    if (form.tax_amount !== '' && (Number.isNaN(tax) || tax < 0)) errs.tax_amount = 'Tax cannot be negative';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const amount = Number(form.amount);
      const tax_amount = Number(form.tax_amount) || 0;
      const payload = {
        builder_id: user!.id,
        invoice_number: form.invoice_number.trim(),
        booking_id: form.booking_id || null,
        customer_id: form.customer_id || null,
        amount,
        tax_amount,
        total_amount: amount + tax_amount,
        status: form.status,
        due_date: form.due_date || null,
        issued_date: form.issued_date,
        pdf_url: form.pdf_url || null,
      };
      if (form.id) {
        const { error } = await supabase.from('builder_invoices').update(payload).eq('id', form.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_invoice', form.id, payload);
        addToast('success', 'Invoice updated');
      } else {
        const { data: inserted, error } = await supabase.from('builder_invoices').insert(payload).select('id').single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_invoice', inserted?.id ?? null, payload);
        addToast('success', 'Invoice created');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['builder-invoices'] });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        addToast('error', 'That invoice number is already in use. Choose a different number.');
      } else {
        addToast('error', err instanceof Error ? err.message : 'Failed to save invoice');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<InvoiceRow>[] = useMemo(
    () => [
      { key: 'invoice_number', header: 'Invoice #', sortable: true, render: (i) => <span className="font-mono text-sm font-semibold text-navy-900">{i.invoice_number}</span> },
      {
        key: 'party',
        header: 'Booking / Customer',
        render: (i) => (
          <div>
            <p className="font-medium text-navy-900">{i.builder_customers?.name ?? '—'}</p>
            <p className="text-xs text-navy-500">
              {i.builder_bookings?.builder_units?.unit_number
                ? `${i.builder_bookings.builder_units.unit_number} · ${formatDate(i.builder_bookings.booking_date)}`
                : 'No booking linked'}
            </p>
          </div>
        ),
      },
      { key: 'amount', header: 'Amount', sortable: true, render: (i) => formatPrice(i.amount) },
      { key: 'tax_amount', header: 'Tax', render: (i) => formatPrice(i.tax_amount) },
      { key: 'total_amount', header: 'Total', sortable: true, render: (i) => formatPrice(i.total_amount ?? i.amount + i.tax_amount) },
      {
        key: 'status',
        header: 'Status',
        render: (i) => (
          <Badge variant={statusVariant(i.status)} className="capitalize">
            {i.status}
          </Badge>
        ),
      },
      { key: 'due_date', header: 'Due Date', sortable: true, render: (i) => formatDate(i.due_date) },
      {
        key: 'actions',
        header: 'Actions',
        render: (i) => (
          <div className="flex gap-1">
            {i.pdf_url && (
              <Button
                size="sm"
                variant="ghost"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open(i.pdf_url!, '_blank')}
                title="Preview / Download"
              />
            )}
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(i)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(i.id)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={builderSections} title="Invoices" badge="Builder">
      <PageHeader
        title="Invoices"
        subtitle="Issue and track invoices for bookings and customers."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Invoice
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoiced" value={formatPrice(stats.totalInvoiced)} icon={<Receipt className="h-5 w-5" />} accent="navy" />
        <StatCard label="Total Paid" value={formatPrice(stats.totalPaid)} icon={<IndianRupee className="h-5 w-5" />} accent="success" />
        <StatCard label="Outstanding" value={formatPrice(stats.outstanding)} icon={<Clock className="h-5 w-5" />} accent="gold" />
        <StatCard label="Overdue" value={stats.overdueCount} icon={<Clock className="h-5 w-5" />} accent="error" />
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(i) => i.id}
        searchKeys={['invoice_number']}
        emptyState={
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="No invoices yet"
            description="Create your first invoice for a booking or customer."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit invoice' : 'New invoice'}
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
          <Input
            label="Invoice number"
            value={form.invoice_number}
            error={formErrors.invoice_number}
            onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderInvoiceStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Booking (optional)"
            value={form.booking_id}
            onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value }))}
          >
            <option value="">No booking linked</option>
            {(bookings ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.builder_units?.unit_number ?? 'Unit N/A'} · {formatDate(b.booking_date)}
              </option>
            ))}
          </Select>
          <Select
            label="Customer (optional)"
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
          >
            <option value="">No customer linked</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min={0}
            value={form.amount}
            error={formErrors.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Input
            label="Tax amount"
            type="number"
            min={0}
            value={form.tax_amount}
            error={formErrors.tax_amount}
            onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))}
          />
          <Input label="Total amount" value={formatPrice(totalPreview)} disabled readOnly hint="Auto-computed: amount + tax" />
          <Input
            label="Issued date"
            type="date"
            value={form.issued_date}
            onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))}
          />
          <Input
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete invoice"
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
        <p className="text-sm text-navy-700">This will permanently delete this invoice.</p>
      </Modal>
    </DashboardLayout>
  );
}
