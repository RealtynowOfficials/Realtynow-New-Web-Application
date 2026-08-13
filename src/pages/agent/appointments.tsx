import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Star,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Skeleton, Badge, Button, EmptyState, Modal, Textarea } from '../../components/ui';
import { useRealtimeCount } from '../../lib/realtime';

const AGENT_PROPERTIES_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Property' },
  { key: 'locality_name', label: 'Locality' },
  { key: 'city_name', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'status', label: 'Status' },
  { key: 'view_count', label: 'Views' },
  { key: 'created_at', label: 'Created' },
];

interface AgentPropertiesFilterState {
  status: string;
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
}

const LEAD_STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
const APPT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export function AgentAppointments() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [visitModal, setVisitModal] = useState<null | {
    appointmentId: string;
    customerId: string;
    propertyId: string;
    propertyTitle: string;
  }>(null);
  const [visitForm, setVisitForm] = useState({ feedback: '', rating: 5 });
  const realtimeTick = useRealtimeCount('appointments', { column: 'agent_id', value: user?.id ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['agent-appointments', user?.id, statusFilter, realtimeTick],
    queryFn: async () => {
      let q = supabase
        .from('appointments')
        .select(
          '*, property:properties(title, id), customer:profiles!appointments_customer_id_profiles_fkey(first_name, last_name, email, phone)',
        )
        .eq('agent_id', user!.id)
        .order('scheduled_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data } = await q;
      return (data ?? []).map((a) => ({
        ...a,
        property: Array.isArray(a.property) ? a.property[0] : a.property,
        customer: Array.isArray(a.customer) ? a.customer[0] : a.customer,
      }));
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('appointments').update({ status }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-appointments'] }),
  });

  const logVisit = useMutation({
    mutationFn: async () => {
      if (!visitModal || !user) return;
      await supabase.from('visits').insert({
        property_id: visitModal.propertyId,
        customer_id: visitModal.customerId,
        agent_id: user.id,
        visited_at: new Date().toISOString(),
        feedback: visitForm.feedback,
        rating: visitForm.rating,
      });
      await supabase.from('appointments').update({ status: 'completed' }).eq('id', visitModal.appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-appointments'] });
      setVisitModal(null);
      setVisitForm({ feedback: '', rating: 5 });
    },
  });

  const tabs = ['all', ...APPT_STATUSES];

  return (
    <DashboardLayout sections={agentSections} title="Appointments" badge="Agent">
      <PageHeader title="Appointments" subtitle="Manage scheduled property visits." />
      <div className="mb-4 flex gap-1 rounded-lg border border-navy-200 bg-white p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setStatusFilter(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${statusFilter === t ? 'bg-navy-700 text-white' : 'text-navy-600 hover:bg-navy-50'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <Card className="divide-y divide-navy-50">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          data.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy-900">{a.property?.title ?? 'Appointment'}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-navy-500">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(a.scheduled_at).toLocaleString('en-IN')}
                  </p>
                  {a.customer && (
                    <p className="mt-1 text-xs text-navy-600">
                      {a.customer.first_name} {a.customer.last_name} · {a.customer.email} ·{' '}
                      {a.customer.phone ?? 'No phone'}
                    </p>
                  )}
                  {a.notes && <p className="mt-1.5 text-sm text-navy-600">{a.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      a.status === 'confirmed'
                        ? 'success'
                        : a.status === 'cancelled'
                          ? 'error'
                          : a.status === 'completed'
                            ? 'default'
                            : 'warning'
                    }
                  >
                    {a.status}
                  </Badge>
                  {a.status === 'requested' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'confirmed' })}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<XCircle className="h-4 w-4" />}
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'cancelled' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {a.status === 'confirmed' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ClipboardList className="h-4 w-4" />}
                        onClick={() =>
                          setVisitModal({
                            appointmentId: a.id,
                            customerId: a.customer_id,
                            propertyId: a.property_id,
                            propertyTitle: a.property?.title ?? '',
                          })
                        }
                      >
                        Log Visit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateStatus.mutate({ id: a.id, status: 'cancelled' })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="No appointments"
            description="Scheduled visits will appear here."
          />
        )}
      </Card>

      <Modal
        open={!!visitModal}
        onClose={() => setVisitModal(null)}
        title={`Log visit — ${visitModal?.propertyTitle ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVisitModal(null)}>
              Cancel
            </Button>
            <Button loading={logVisit.isPending} onClick={() => logVisit.mutate()}>
              Save visit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setVisitForm((f) => ({ ...f, rating: i }))}
                  className={i <= visitForm.rating ? 'text-gold-400' : 'text-navy-200'}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Feedback"
            placeholder="Visit notes and customer feedback..."
            value={visitForm.feedback}
            onChange={(e) => setVisitForm((f) => ({ ...f, feedback: e.target.value }))}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

