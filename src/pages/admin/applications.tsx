import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  CheckCircle2, Eye, Clock, FileText,
  Building2, User, Phone, Mail, MapPin, Award, BadgeCheck, Calendar,
} from 'lucide-react';
import { ApplicationReviewDrawer } from '../../components/admin/ApplicationReviewDrawer';

// ─── Shared status formatter ─────────────────────────────────────────────────
export function formatApplicationStatus(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Submitted',
    pending_review: 'Pending Review',
    document_verification: 'Document Verification',
    identity_verification: 'Identity Verification',
    rera_verification: 'RERA Verification',
    background_verification: 'Background Verification',
    final_review: 'Final Review',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending Review',
  };
  return map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Shared status badge ──────────────────────────────────────────────────────
export function AppBadge({ status }: { status: string }) {
  const variantMap: Record<string, string> = {
    submitted: 'navy',
    pending_review: 'warning',
    document_verification: 'warning',
    identity_verification: 'warning',
    rera_verification: 'warning',
    background_verification: 'warning',
    final_review: 'warning',
    approved: 'success',
    rejected: 'error',
    pending: 'warning',
  };
  return (
    <Badge variant={(variantMap[status] ?? 'default') as any}>
      {formatApplicationStatus(status)}
    </Badge>
  );
}

// ─── Agent Application Card ───────────────────────────────────────────────────
function AgentAppCard({
  app,
  onReview,
}: {
  app: AgentApplication;
  onReview: (a: AgentApplication) => void;
}) {
  const name = `${app.first_name ?? ''} ${app.last_name ?? ''}`.trim() || app.email;
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 px-5 pt-5 pb-10 relative">
        <div className="absolute top-3 right-3">
          <AppBadge status={app.status || 'pending_review'} />
        </div>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-7">
        {app.profile_image ? (
          <img
            src={app.profile_image}
            alt={name}
            className="h-14 w-14 rounded-full object-cover border-4 border-white shadow"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-navy-100 border-4 border-white shadow grid place-items-center">
            <span className="text-navy-600 font-bold text-lg">{initials}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-5 pb-5 pt-3 flex flex-col gap-3 flex-1">
        <div className="text-center">
          <h4 className="font-bold text-navy-900 text-base">{name}</h4>
          {app.specialization && (
            <p className="text-xs text-navy-500 mt-0.5">{app.specialization} Specialist</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs text-navy-600">
          {app.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>{app.phone}</span>
            </div>
          )}
          {app.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="truncate">{app.email}</span>
            </div>
          )}
          {app.experience_years != null && (
            <div className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>{app.experience_years} yrs experience</span>
            </div>
          )}
          {app.assigned_areas && app.assigned_areas.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="truncate">{app.assigned_areas.join(', ')}</span>
            </div>
          )}
          {app.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>Applied {formatDate(app.created_at)}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          <Button
            className="w-full"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => onReview(app)}
          >
            Review Application
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Builder Application Card ─────────────────────────────────────────────────
function BuilderAppCard({
  app,
  onReview,
}: {
  app: BuilderApplication;
  onReview: (a: BuilderApplication) => void;
}) {
  const name = app.company_name || app.contact_name || app.email;

  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 px-5 pt-5 pb-10 relative">
        <div className="absolute top-3 right-3">
          <AppBadge status={app.status || 'pending_review'} />
        </div>
      </div>

      {/* Avatar */}
      <div className="flex justify-center -mt-7">
        {app.logo_url ? (
          <img
            src={app.logo_url}
            alt={name}
            className="h-14 w-14 rounded-xl object-cover border-4 border-white shadow"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-navy-100 border-4 border-white shadow grid place-items-center">
            <Building2 className="h-6 w-6 text-navy-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-5 pb-5 pt-3 flex flex-col gap-3 flex-1">
        <div className="text-center">
          <h4 className="font-bold text-navy-900 text-base">{name}</h4>
          {app.contact_name && app.company_name && (
            <p className="text-xs text-navy-500 mt-0.5">Contact: {app.contact_name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs text-navy-600">
          {app.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="truncate">{app.email}</span>
            </div>
          )}
          {app.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>{app.city}</span>
            </div>
          )}
          {app.rera_number && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="font-mono truncate">{app.rera_number}</span>
            </div>
          )}
          {app.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>Applied {formatDate(app.created_at)}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-2">
          <Button
            className="w-full"
            variant="secondary"
            size="sm"
            icon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => onReview(app)}
          >
            Review Application
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Agent Applications ─────────────────────────────────────────────────
export function AdminAgentApplications() {
  const [viewing, setViewing] = useState<AgentApplication | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agent-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_applications')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []) as AgentApplication[];
    },
  });

  const applications = data ?? [];

  const columns: Column<AgentApplication>[] = [
    {
      key: 'first_name',
      header: 'Applicant',
      sortable: true,
      render: (a) => (
        <div className="flex items-center gap-3">
          {a.profile_image ? (
            <img src={a.profile_image} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-navy-100 grid place-items-center shrink-0">
              <User className="h-4 w-4 text-navy-500" />
            </div>
          )}
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
    { key: 'status', header: 'Stage', sortable: true, render: (a) => <AppBadge status={a.status || 'pending_review'} /> },
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

  const pendingCount = applications.filter((a) => a.status !== 'approved' && a.status !== 'rejected').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:agentApps', 'Agent Applications')}>
      <PageHeader title="Agent Applications CRM" subtitle="Manage and verify agent registration pipeline" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Verification', value: pendingCount, icon: Clock },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
          { label: 'Total Applicants', value: applications.length, icon: User },
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-navy-400" />}
          title="No applications"
          description="Agent registration requests will appear here."
        />
      ) : (
        <Card>
          <DataTable
            rows={applications}
            columns={columns as any}
            getRowId={(r: any) => r.id}
            searchable
            searchPlaceholder="Search by name, phone, email, specialization..."
            cardRender={(row) => (
              <AgentAppCard
                app={row as AgentApplication}
                onReview={(a) => setViewing(a)}
              />
            )}
          />
        </Card>
      )}

      {viewing && (
        <ApplicationReviewDrawer
          open={!!viewing}
          onClose={() => {
            setViewing(null);
            queryClient.invalidateQueries({ queryKey: ['admin-agent-applications'] });
          }}
          application={viewing}
          type="agent"
        />
      )}
    </DashboardLayout>
  );
}

// ─── Admin Builder Applications ───────────────────────────────────────────────
export function AdminBuilderApplications() {
  const [viewing, setViewing] = useState<BuilderApplication | null>(null);
  const queryClient = useQueryClient();

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

  const applications = data ?? [];

  const columns: Column<BuilderApplication>[] = [
    {
      key: 'company_name',
      header: 'Company',
      sortable: true,
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-navy-100 grid place-items-center shrink-0">
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
    { key: 'status', header: 'Stage', sortable: true, render: (b) => <AppBadge status={b.status || 'pending_review'} /> },
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

  const pendingCount = applications.filter((a) => a.status !== 'approved' && a.status !== 'rejected').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:builderApps', 'Builder Applications')}>
      <PageHeader title="Builder Applications CRM" subtitle="Manage builder registration pipeline" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Verification', value: pendingCount, icon: Clock },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
          { label: 'Total Builders', value: applications.length, icon: Building2 },
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-navy-400" />}
          title="No builder applications"
          description="Builder registration requests will appear here."
        />
      ) : (
        <Card>
          <DataTable
            rows={applications}
            columns={columns as any}
            getRowId={(r: any) => r.id}
            searchable
            searchPlaceholder="Search by company, contact, city, RERA..."
            cardRender={(row) => (
              <BuilderAppCard
                app={row as BuilderApplication}
                onReview={(b) => setViewing(b)}
              />
            )}
          />
        </Card>
      )}

      {viewing && (
        <ApplicationReviewDrawer
          open={!!viewing}
          onClose={() => {
            setViewing(null);
            queryClient.invalidateQueries({ queryKey: ['admin-builder-applications'] });
          }}
          application={viewing}
          type="builder"
        />
      )}
    </DashboardLayout>
  );
}
