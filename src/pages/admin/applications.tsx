import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  FileText,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Award,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Modal, Badge, EmptyState, Skeleton, Textarea } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../components/toast';
import type { AgentApplication, BuilderApplication } from '../../lib/types';

/* ─────────────────────────────────────────────────────────────────────────── */
/* STATUS BADGE                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function AppBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
  };
  return <Badge variant={(map[status] ?? 'default') as 'warning' | 'success' | 'error'}>{status}</Badge>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* AGENT APPLICATIONS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
export function AdminAgentApplications() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [viewing, setViewing] = useState<AgentApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agent-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('agent_applications').select('*').order('created_at', { ascending: false });
      return (data ?? []) as AgentApplication[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'approve' | 'reject' }) => {
      const updates: Record<string, unknown> = {
        status: type === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      };
      if (type === 'reject' && rejectReason.trim()) {
        updates.rejection_reason = rejectReason.trim();
      }

      await supabase.from('agent_applications').update(updates).eq('id', id);

      // On approval, create a user invite (email-based) — stub for now
      // In production: trigger an edge function to send invite email
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-applications'] });
      addToast('success', `Application ${type === 'approve' ? 'approved' : 'rejected'} successfully`);
      setViewing(null);
      setActionType(null);
      setRejectReason('');
    },
    onError: () => addToast('error', 'Action failed. Please try again.'),
  });

  const columns: Column<AgentApplication>[] = [
    {
      key: 'first_name',
      header: 'Applicant',
      sortable: true,
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-navy-100 grid place-items-center">
            <User className="h-4 w-4 text-navy-500" />
          </div>
          <div>
            <p className="font-medium text-navy-900">
              {a.first_name} {a.last_name}
            </p>
            <p className="text-xs text-navy-500">{a.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (a) => <span className="text-sm">{a.phone}</span> },
    {
      key: 'specialization',
      header: 'Specialization',
      render: (a) => <span className="text-sm">{a.specialization ?? '—'}</span>,
    },
    {
      key: 'experience_years',
      header: 'Experience',
      render: (a) => <span className="text-sm">{a.experience_years ? `${a.experience_years} yrs` : '—'}</span>,
    },
    {
      key: 'license_number',
      header: 'RERA',
      render: (a) => <span className="text-xs font-mono">{a.license_number ?? '—'}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, render: (a) => <AppBadge status={a.status} /> },
    {
      key: 'created_at',
      header: 'Applied',
      sortable: true,
      render: (a) => <span className="text-sm text-navy-500">{formatDate(a.created_at)}</span>,
    },
    {
      key: 'id',
      header: '',
      render: (a) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(a)}>
            Review
          </Button>
          {a.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setViewing(a);
                  setActionType('approve');
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => {
                  setViewing(a);
                  setActionType('reject');
                }}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pending = data?.filter((a) => a.status === 'pending').length ?? 0;
  const approved = data?.filter((a) => a.status === 'approved').length ?? 0;

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:agentApps', 'Agent Applications')}>
      <PageHeader title="Agent Applications" subtitle="Review and approve agent registration requests" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: pending, accent: 'gold', icon: Clock },
          { label: 'Approved', value: approved, accent: 'success', icon: CheckCircle2 },
          { label: 'Total', value: data?.length ?? 0, accent: 'navy', icon: User },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-navy-500">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-navy-900">{value}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-navy-50 grid place-items-center">
                <Icon className="h-5 w-5 text-navy-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-navy-400" />}
          title="No applications yet"
          description="Agent registration requests will appear here."
        />
      ) : (
        <Card>
          <DataTable rows={data} columns={columns as any} getRowId={(r: any) => r.id} searchable searchPlaceholder="Search applicants..." />
        </Card>
      )}

      {/* Detail / Action Modal */}
      <Modal
        open={!!viewing}
        onClose={() => {
          setViewing(null);
          setActionType(null);
          setRejectReason('');
        }}
        title={`${viewing?.first_name} ${viewing?.last_name}`}
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: Mail, label: 'Email', value: viewing.email },
                { icon: Phone, label: 'Phone', value: viewing.phone },
                { icon: Award, label: 'Specialization', value: viewing.specialization ?? '—' },
                {
                  icon: Clock,
                  label: 'Experience',
                  value: viewing.experience_years ? `${viewing.experience_years} years` : '—',
                },
                { icon: BadgeCheck, label: 'RERA License', value: viewing.license_number ?? '—' },
                { icon: MapPin, label: 'Areas', value: viewing.assigned_areas?.join(', ') ?? '—' },
                { icon: Building2, label: 'Company', value: viewing.company ?? '—' },
                { icon: Clock, label: 'Applied', value: formatDate(viewing.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg border border-navy-100 p-3">
                  <p className="text-xs text-navy-400 flex items-center gap-1 mb-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </p>
                  <p className="font-medium text-navy-800 break-all">{value}</p>
                </div>
              ))}
            </div>

            {viewing.bio && (
              <div className="rounded-lg border border-navy-100 p-3">
                <p className="text-xs text-navy-400 mb-1">Bio</p>
                <p className="text-sm text-navy-700">{viewing.bio}</p>
              </div>
            )}

            {/* Document links */}
            {(viewing.id_doc_url || viewing.license_doc_url) && (
              <div className="flex gap-3">
                {viewing.id_doc_url && (
                  <a
                    href={viewing.id_doc_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
                  >
                    <FileText className="h-4 w-4 text-gold-500" /> View Govt ID
                  </a>
                )}
                {viewing.license_doc_url && (
                  <a
                    href={viewing.license_doc_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
                  >
                    <BadgeCheck className="h-4 w-4 text-gold-500" /> View License
                  </a>
                )}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-navy-500">Current status:</span>
              <AppBadge status={viewing.status} />
            </div>

            {/* Rejection reason */}
            {(actionType === 'reject' || viewing.status === 'rejected') && (
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  Rejection Reason {actionType === 'reject' && '(optional)'}
                </label>
                {actionType === 'reject' ? (
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why the application is being rejected…"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-error-600 bg-error-50 p-3 rounded-lg">
                    {viewing.rejection_reason ?? 'No reason provided'}
                  </p>
                )}
              </div>
            )}

            {viewing.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                {actionType !== 'reject' && (
                  <Button
                    variant="primary"
                    className="flex-1"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    loading={actionMutation.isPending && actionType === 'approve'}
                    onClick={() => {
                      setActionType('approve');
                      actionMutation.mutate({ id: viewing.id, type: 'approve' });
                    }}
                  >
                    Approve Application
                  </Button>
                )}
                <Button
                  variant="danger"
                  className={actionType === 'reject' ? 'flex-1' : ''}
                  icon={<XCircle className="h-4 w-4" />}
                  loading={actionMutation.isPending && actionType === 'reject'}
                  onClick={() => {
                    if (actionType !== 'reject') {
                      setActionType('reject');
                      return;
                    }
                    actionMutation.mutate({ id: viewing.id, type: 'reject' });
                  }}
                >
                  {actionType === 'reject' ? 'Confirm Reject' : 'Reject'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* BUILDER APPLICATIONS                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
export function AdminBuilderApplications() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [viewing, setViewing] = useState<BuilderApplication | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-builder-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('builder_applications')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []) as BuilderApplication[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'approve' | 'reject' }) => {
      const updates: Record<string, unknown> = {
        status: type === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      };
      if (type === 'reject' && rejectReason.trim()) {
        updates.rejection_reason = rejectReason.trim();
      }
      await supabase.from('builder_applications').update(updates).eq('id', id);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-builder-applications'] });
      addToast('success', `Builder application ${type === 'approve' ? 'approved' : 'rejected'}`);
      setViewing(null);
      setActionType(null);
      setRejectReason('');
    },
    onError: () => addToast('error', 'Action failed'),
  });

  const columns: Column<BuilderApplication>[] = [
    {
      key: 'company_name',
      header: 'Company',
      sortable: true,
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-navy-100 grid place-items-center">
            <Building2 className="h-4 w-4 text-navy-500" />
          </div>
          <div>
            <p className="font-medium text-navy-900">{b.company_name}</p>
            <p className="text-xs text-navy-500">{b.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'contact_name', header: 'Contact', render: (b) => <span className="text-sm">{b.contact_name}</span> },
    { key: 'city', header: 'City', render: (b) => <span className="text-sm">{b.city ?? '—'}</span> },
    {
      key: 'gst_number',
      header: 'GST',
      render: (b) => <span className="text-xs font-mono">{b.gst_number ?? '—'}</span>,
    },
    {
      key: 'rera_number',
      header: 'RERA',
      render: (b) => <span className="text-xs font-mono">{b.rera_number ?? '—'}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, render: (b) => <AppBadge status={b.status} /> },
    {
      key: 'created_at',
      header: 'Applied',
      sortable: true,
      render: (b) => <span className="text-sm text-navy-500">{formatDate(b.created_at)}</span>,
    },
    {
      key: 'id',
      header: '',
      render: (b) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(b)}>
            Review
          </Button>
          {b.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setViewing(b);
                  setActionType('approve');
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => {
                  setViewing(b);
                  setActionType('reject');
                }}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:builderApps', 'Builder Applications')}>
      <PageHeader title="Builder Applications" subtitle="Review and approve builder/developer registration requests" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: data?.filter((b) => b.status === 'pending').length ?? 0, icon: Clock },
          { label: 'Approved', value: data?.filter((b) => b.status === 'approved').length ?? 0, icon: CheckCircle2 },
          { label: 'Total', value: data?.length ?? 0, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-navy-500">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-navy-900">{value}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-navy-50 grid place-items-center">
                <Icon className="h-5 w-5 text-navy-600" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-navy-400" />}
          title="No builder applications"
          description="Builder/developer registration requests will appear here."
        />
      ) : (
        <Card>
          <DataTable rows={data} columns={columns as any} getRowId={(r: any) => r.id} searchable searchPlaceholder="Search builders..." />
        </Card>
      )}

      <Modal
        open={!!viewing}
        onClose={() => {
          setViewing(null);
          setActionType(null);
          setRejectReason('');
        }}
        title={viewing?.company_name ?? ''}
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { icon: User, label: 'Contact', value: viewing.contact_name },
                { icon: Mail, label: 'Email', value: viewing.email },
                { icon: Phone, label: 'Phone', value: viewing.phone },
                { icon: MapPin, label: 'City', value: viewing.city ?? '—' },
                { icon: BadgeCheck, label: 'GST', value: viewing.gst_number ?? '—' },
                { icon: Award, label: 'RERA', value: viewing.rera_number ?? '—' },
                { icon: Clock, label: 'Est. Year', value: viewing.established_year?.toString() ?? '—' },
                { icon: Clock, label: 'Applied', value: formatDate(viewing.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg border border-navy-100 p-3">
                  <p className="text-xs text-navy-400 flex items-center gap-1 mb-1">
                    <Icon className="h-3 w-3" />
                    {label}
                  </p>
                  <p className="font-medium text-navy-800 break-all">{value}</p>
                </div>
              ))}
            </div>

            {viewing.description && (
              <div className="rounded-lg border border-navy-100 p-3">
                <p className="text-xs text-navy-400 mb-1">Description</p>
                <p className="text-sm text-navy-700">{viewing.description}</p>
              </div>
            )}

            {(viewing.gst_doc_url || viewing.rera_doc_url || viewing.pan_doc_url) && (
              <div className="flex flex-wrap gap-2">
                {[
                  { url: viewing.gst_doc_url, label: 'GST Certificate' },
                  { url: viewing.rera_doc_url, label: 'RERA Certificate' },
                  { url: viewing.pan_doc_url, label: 'PAN Document' },
                ]
                  .filter((d) => d.url)
                  .map(({ url, label }) => (
                    <a
                      key={label}
                      href={url!}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-700 hover:bg-navy-50"
                    >
                      <FileText className="h-4 w-4 text-gold-500" /> {label}
                    </a>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-navy-500">Status:</span>
              <AppBadge status={viewing.status} />
            </div>

            {(actionType === 'reject' || viewing.status === 'rejected') && (
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Rejection Reason</label>
                {actionType === 'reject' ? (
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection…"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-error-600 bg-error-50 p-3 rounded-lg">
                    {viewing.rejection_reason ?? 'No reason provided'}
                  </p>
                )}
              </div>
            )}

            {viewing.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                {actionType !== 'reject' && (
                  <Button
                    variant="primary"
                    className="flex-1"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    loading={actionMutation.isPending && actionType === 'approve'}
                    onClick={() => {
                      setActionType('approve');
                      actionMutation.mutate({ id: viewing.id, type: 'approve' });
                    }}
                  >
                    Approve Application
                  </Button>
                )}
                <Button
                  variant="danger"
                  className={actionType === 'reject' ? 'flex-1' : ''}
                  icon={<XCircle className="h-4 w-4" />}
                  loading={actionMutation.isPending && actionType === 'reject'}
                  onClick={() => {
                    if (actionType !== 'reject') {
                      setActionType('reject');
                      return;
                    }
                    actionMutation.mutate({ id: viewing.id, type: 'reject' });
                  }}
                >
                  {actionType === 'reject' ? 'Confirm Reject' : 'Reject'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

