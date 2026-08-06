import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, CheckCircle2, Clock, Edit3, IndianRupee, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable } from '../../components/data-table';
import type { Column } from '../../components/data-table';
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeMulti } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { formatDate, formatPrice } from '../../lib/utils';

type BuilderBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

interface BuilderUnit {
  id: string;
  tower_id: string;
  unit_number: string;
  type: string;
  size_sqft: number | null;
  price: number | null;
  status: 'available' | 'booked' | 'sold';
}

interface BuilderBooking {
  id: string;
  unit_id: string;
  customer_id: string | null;
  lead_id: string | null;
  booking_date: string;
  amount: number;
  status: BuilderBookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface BuilderBookingRow extends BuilderBooking {
  builder_units: { unit_number: string; type: string } | null;
  builder_customers: { name: string } | null;
  builder_leads: { name: string } | null;
}

interface BookingForm {
  unit_id: string;
  customer_id: string;
  lead_id: string;
  booking_date: string;
  amount: string;
  status: BuilderBookingStatus;
  notes: string;
}

const EMPTY_FORM: BookingForm = {
  unit_id: '',
  customer_id: '',
  lead_id: '',
  booking_date: new Date().toISOString().slice(0, 10),
  amount: '',
  status: 'pending',
  notes: '',
};

const STATUS_VARIANT: Record<BuilderBookingStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
};

export function BuilderBookings() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const realtimeTick = useRealtimeMulti(['builder_bookings', 'builder_units']);

  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<BuilderBookingRow | 'new' | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: scopeUnits } = useQuery({
    queryKey: ['builder-bookings-unit-scope', user?.id, realtimeTick],
    queryFn: async () => {
      const { data: projects } = await supabase.from('builder_projects').select('id').eq('builder_id', user!.id);
      const projectIds = (projects ?? []).map((p) => p.id);
      const { data: towers } = projectIds.length
        ? await supabase.from('builder_towers').select('id').in('project_id', projectIds)
        : { data: [] as { id: string }[] };
      const towerIds = (towers ?? []).map((t) => t.id);
      const { data: units } = towerIds.length
        ? await supabase.from('builder_units').select('id, tower_id, unit_number, type, size_sqft, price, status').in('tower_id', towerIds)
        : { data: [] as BuilderUnit[] };
      return (units ?? []) as BuilderUnit[];
    },
    enabled: !!user,
  });

  const unitIds = useMemo(() => (scopeUnits ?? []).map((u) => u.id), [scopeUnits]);

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['builder-bookings', user?.id, unitIds.join(','), realtimeTick],
    queryFn: async () => {
      if (!unitIds.length) return [];
      const { data, error } = await supabase
        .from('builder_bookings')
        .select('*, builder_units(unit_number, type), builder_customers(name), builder_leads(name)')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderBookingRow[];
    },
    enabled: !!user && scopeUnits !== undefined,
  });

  const { data: customers } = useQuery({
    queryKey: ['builder-customers-lite', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_customers').select('id, name').eq('builder_id', user!.id).order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  const availableUnits = useMemo(() => {
    const list = (scopeUnits ?? []).filter((u) => u.status === 'available');
    if (editing && editing !== 'new') {
      const current = (scopeUnits ?? []).find((u) => u.id === editing.unit_id);
      if (current && !list.some((u) => u.id === current.id)) list.push(current);
    }
    return list;
  }, [scopeUnits, editing]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditing('new');
  };

  const openEdit = (b: BuilderBookingRow) => {
    setForm({
      unit_id: b.unit_id,
      customer_id: b.customer_id ?? '',
      lead_id: b.lead_id ?? '',
      booking_date: b.booking_date,
      amount: String(b.amount ?? ''),
      status: b.status,
      notes: b.notes ?? '',
    });
    setFormErrors({});
    setEditing(b);
  };

  const save = async () => {
    const errors: Record<string, string> = {};
    if (!form.unit_id) errors.unit_id = 'Select a unit';
    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) errors.amount = 'Enter a valid amount';
    if (!form.booking_date) errors.booking_date = 'Booking date is required';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unit_id: form.unit_id,
        customer_id: form.customer_id || null,
        lead_id: form.lead_id || null,
        booking_date: form.booking_date,
        amount: amountNum,
        status: form.status,
        notes: form.notes || null,
      };

      if (editing && editing !== 'new') {
        const { error } = await supabase.from('builder_bookings').update(payload).eq('id', editing.id);
        if (error) throw error;
        if (form.status === 'confirmed') {
          await supabase.from('builder_units').update({ status: 'booked' }).eq('id', form.unit_id);
        }
        await logBuilderAudit('update', 'builder_bookings', editing.id, payload);
        addToast('success', 'Booking updated');
      } else {
        const { data: inserted, error } = await supabase.from('builder_bookings').insert(payload).select('id').single();
        if (error) throw error;
        if (form.status === 'confirmed') {
          await supabase.from('builder_units').update({ status: 'booked' }).eq('id', form.unit_id);
        }
        await logBuilderAudit('create', 'builder_bookings', inserted?.id ?? null, payload);
        addToast('success', 'Booking created');
      }

      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['builder-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['builder-bookings-unit-scope'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('builder_bookings').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_bookings', id);
      queryClient.invalidateQueries({ queryKey: ['builder-bookings'] });
      setToDelete(null);
      addToast('success', 'Booking deleted');
    },
    onError: (err) => addToast('error', err instanceof Error ? err.message : 'Failed to delete booking'),
  });

  const columns = useMemo<Column<BuilderBookingRow>[]>(
    () => [
      {
        key: 'unit',
        header: 'Unit',
        render: (b) => (
          <div>
            <p className="font-medium text-navy-900">{b.builder_units?.unit_number ?? '—'}</p>
            <p className="text-xs text-navy-500">{b.builder_units?.type ?? ''}</p>
          </div>
        ),
      },
      {
        key: 'party',
        header: 'Customer / Lead',
        render: (b) => <span className="text-sm">{b.builder_customers?.name ?? b.builder_leads?.name ?? '—'}</span>,
      },
      {
        key: 'booking_date',
        header: 'Booking Date',
        sortable: true,
        render: (b) => formatDate(b.booking_date),
      },
      {
        key: 'amount',
        header: 'Amount',
        sortable: true,
        render: (b) => <span className="font-medium text-navy-900">{formatPrice(b.amount)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (b) => (
          <Badge variant={STATUS_VARIANT[b.status]} className="capitalize">
            {b.status}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (b) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(b)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(b.id)}
            />
          </div>
        ),
      },
    ],
    [scopeUnits, editing],
  );

  const stats = useMemo(() => {
    const rows = bookings ?? [];
    const confirmed = rows.filter((b) => b.status === 'confirmed').length;
    const pending = rows.filter((b) => b.status === 'pending').length;
    const totalValue = rows.reduce((sum, b) => sum + (b.amount || 0), 0);
    return { total: rows.length, confirmed, pending, totalValue };
  }, [bookings]);

  return (
    <DashboardLayout sections={builderSections} title="Bookings" badge="Builder">
      <PageHeader
        title="Unit Bookings"
        subtitle="Track and manage bookings across your projects."
        action={
          <Button onClick={openCreate} icon={<CalendarCheck2 className="h-4 w-4" />}>
            New booking
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Bookings" value={stats.total} icon={<CalendarCheck2 className="h-5 w-5" />} accent="navy" />
        <StatCard label="Confirmed" value={stats.confirmed} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock className="h-5 w-5" />} accent="gold" />
        <StatCard label="Total Value" value={formatPrice(stats.totalValue)} icon={<IndianRupee className="h-5 w-5" />} accent="navy" />
      </div>

      <DataTable
        columns={columns}
        rows={bookings ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(b) => b.id}
        searchKeys={['booking_date', 'status']}
        emptyState={
          <EmptyState
            icon={<CalendarCheck2 className="h-6 w-6" />}
            title="No bookings yet"
            description="Create a booking once a unit is reserved for a customer."
            action={
              <Button onClick={openCreate} icon={<CalendarCheck2 className="h-4 w-4" />}>
                New booking
              </Button>
            }
          />
        }
      />

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete booking"
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
        <p className="text-sm text-navy-700">This will permanently delete this booking record.</p>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New booking' : 'Edit booking'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save booking
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Unit"
              value={form.unit_id}
              error={formErrors.unit_id}
              onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
            >
              <option value="">Select a unit</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_number} • {u.type}
                  {u.price ? ` • ${formatPrice(u.price)}` : ''}
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
              label="Booking date"
              type="date"
              value={form.booking_date}
              error={formErrors.booking_date}
              onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))}
            />
            <Input
              label="Amount (₹)"
              type="number"
              min="0"
              value={form.amount}
              error={formErrors.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BuilderBookingStatus }))}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
