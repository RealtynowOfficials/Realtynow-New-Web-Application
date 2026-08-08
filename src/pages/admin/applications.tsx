import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../components/toast';
import type { AgentApplication, BuilderApplication } from '../../lib/types';
import { 
  CheckCircle2, XCircle, Eye, Clock, FileText, 
  Building2, User, Phone, MapPin, Award 
} from 'lucide-react';
import { ApplicationReviewDrawer } from '../../components/admin/ApplicationReviewDrawer';

export function AppBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'warning',
    pending_review: 'warning',
    approved: 'success',
    rejected: 'error',
    submitted: 'navy',
    document_verification: 'warning',
    identity_verification: 'warning',
    rera_verification: 'warning',
    background_verification: 'warning',
    final_review: 'warning',
  };
  return <Badge variant={(map[status] ?? 'default') as any}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
}

export function AdminAgentApplications() {
  const { addToast } = useToast();
  const [viewing, setViewing] = useState<AgentApplication | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agent-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('agent_applications').select('*').order('created_at', { ascending: false });
      return (data ?? []) as AgentApplication[];
    },
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
            <p className="font-medium text-navy-900">{a.first_name} {a.last_name}</p>
            <p className="text-xs text-navy-500">{a.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (a) => <span className="text-sm">{a.phone}</span> },
    { key: 'specialization', header: 'Specialization', render: (a) => <span className="text-sm">{a.specialization ?? '—'}</span> },
    { key: 'license_number', header: 'RERA', render: (a) => <span className="text-xs font-mono">{a.license_number ?? '—'}</span> },
    { key: 'status', header: 'Stage', sortable: true, render: (a) => <AppBadge status={a.status || 'pending'} /> },
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
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(a)}>
          Review
        </Button>
      ),
    },
  ];

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);
  
  const pendingCount = data?.filter(a => a.status !== 'approved' && a.status !== 'rejected').length ?? 0;
  const approvedCount = data?.filter(a => a.status === 'approved').length ?? 0;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:agentApps', 'Agent Applications')}>
      <PageHeader title="Agent Applications CRM" subtitle="Manage and verify agent registration pipeline" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Verification', value: pendingCount, accent: 'gold', icon: Clock },
          { label: 'Approved', value: approvedCount, accent: 'success', icon: CheckCircle2 },
          { label: 'Total Applicants', value: data?.length ?? 0, accent: 'navy', icon: User },
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
        <Skeleton className="h-40 w-full" />
      ) : !data?.length ? (
        <EmptyState icon={<FileText className="h-8 w-8 text-navy-400" />} title="No applications" description="Registration requests will appear here." />
      ) : (
        <Card>
          <DataTable rows={data} columns={columns as any} getRowId={(r: any) => r.id} searchable searchPlaceholder="Search applicants..." />
        </Card>
      )}

      {viewing && (
        <ApplicationReviewDrawer
          open={!!viewing}
          onClose={() => setViewing(null)}
          application={viewing}
          type="agent"
        />
      )}
    </DashboardLayout>
  );
}

export function AdminBuilderApplications() {
  const { addToast } = useToast();
  const [viewing, setViewing] = useState<BuilderApplication | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-builder-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('builder_applications').select('*').order('created_at', { ascending: false });
      return (data ?? []) as BuilderApplication[];
    },
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
    { key: 'rera_number', header: 'RERA', render: (b) => <span className="text-xs font-mono">{b.rera_number ?? '—'}</span> },
    { key: 'status', header: 'Stage', sortable: true, render: (b) => <AppBadge status={b.status || 'pending'} /> },
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
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(b)}>
          Review
        </Button>
      ),
    },
  ];

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  const pendingCount = data?.filter(a => a.status !== 'approved' && a.status !== 'rejected').length ?? 0;
  const approvedCount = data?.filter(a => a.status === 'approved').length ?? 0;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:builderApps', 'Builder Applications')}>
      <PageHeader title="Builder Applications CRM" subtitle="Manage builder registration pipeline" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Verification', value: pendingCount, icon: Clock },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
          { label: 'Total Builders', value: data?.length ?? 0, icon: Building2 },
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
        <Skeleton className="h-40 w-full" />
      ) : !data?.length ? (
        <EmptyState icon={<Building2 className="h-8 w-8 text-navy-400" />} title="No builder applications" description="Builder registration requests will appear here." />
      ) : (
        <Card>
          <DataTable rows={data} columns={columns as any} getRowId={(r: any) => r.id} searchable searchPlaceholder="Search builders..." />
        </Card>
      )}

      {viewing && (
        <ApplicationReviewDrawer
          open={!!viewing}
          onClose={() => setViewing(null)}
          application={viewing}
          type="builder"
        />
      )}
    </DashboardLayout>
  );
}
