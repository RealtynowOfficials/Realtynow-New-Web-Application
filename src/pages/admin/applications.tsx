import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Badge, EmptyState, Skeleton } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { formatDate } from '../../lib/utils';
import type { AgentApplication, BuilderApplication, PartnerApplication } from '../../lib/types';
import {
  CheckCircle2, Eye, Clock, FileText,
  Building2, User, Phone, Mail, MapPin, Award, BadgeCheck, Calendar, Handshake,
} from 'lucide-react';
import { ApplicationReviewDrawer } from '../../components/admin/ApplicationReviewDrawer';

// ─── Shared status formatter ─────────────────────────────────────────────────
const STATUS_LABEL_KEYS: Record<string, string> = {
  submitted: 'admin.statusSubmittedApp',
  pending_review: 'admin.statusPendingReviewApp',
  document_verification: 'admin.statusDocumentVerification',
  identity_verification: 'admin.statusIdentityVerification',
  rera_verification: 'admin.statusReraVerification',
  background_verification: 'admin.statusBackgroundVerification',
  final_review: 'admin.statusFinalReview',
  approved: 'admin.statusApprovedApp',
  rejected: 'admin.statusRejectedApp',
  pending: 'admin.statusPendingReviewApp',
};

export function formatApplicationStatus(status: string, t?: (key: string, fallback?: string) => string): string {
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
  const fallback = map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const key = STATUS_LABEL_KEYS[status];
  return t && key ? t(key, fallback) : fallback;
}

// ─── Shared status badge ──────────────────────────────────────────────────────
export function AppBadge({ status }: { status: string }) {
  const { t } = useLanguageContext();
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
      {formatApplicationStatus(status, t)}
    </Badge>
  );
}

// ─── Clickable analytics stat card — drives the ?status= URL filter ──────────
function ClickableStatCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`Show ${label.toLowerCase()}`}
      className={`w-full text-left rounded-2xl border bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 cursor-pointer ${
        active ? 'border-red-300 ring-1 ring-red-200' : 'border-navy-100 hover:border-navy-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-navy-500">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-navy-900">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${active ? 'bg-red-50' : 'bg-navy-50'}`}>
          <Icon className={`h-5 w-5 ${active ? 'text-red-600' : 'text-navy-600'}`} />
        </div>
      </div>
    </button>
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
  const { t } = useLanguageContext();
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
            <p className="text-xs text-navy-500 mt-0.5">{`${app.specialization} ${t('admin.specialistSuffix', 'Specialist')}`}</p>
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
              <span>{t('admin.yrsExperience', '{{count}} yrs experience').replace('{{count}}', String(app.experience_years))}</span>
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
              <span>{t('admin.appliedOn', 'Applied {{date}}').replace('{{date}}', formatDate(app.created_at))}</span>
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
            {t('admin.reviewApplication', 'Review Application')}
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
  const { t } = useLanguageContext();
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
            <p className="text-xs text-navy-500 mt-0.5">{t('admin.contactLabel', 'Contact:')} {app.contact_name}</p>
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
              <span>{t('admin.appliedOn', 'Applied {{date}}').replace('{{date}}', formatDate(app.created_at))}</span>
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
            {t('admin.reviewApplication', 'Review Application')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Partner Application Card ─────────────────────────────────────────────────
function PartnerAppCard({
  app,
  onReview,
}: {
  app: PartnerApplication;
  onReview: (a: PartnerApplication) => void;
}) {
  const { t } = useLanguageContext();
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 px-5 pt-5 pb-10 relative">
        <div className="absolute top-3 right-3">
          <AppBadge status={app.status || 'submitted'} />
        </div>
      </div>

      <div className="flex justify-center -mt-7">
        <div className="h-14 w-14 rounded-full bg-navy-100 border-4 border-white shadow grid place-items-center">
          <Handshake className="h-6 w-6 text-navy-600" />
        </div>
      </div>

      <div className="px-5 pb-5 pt-3 flex flex-col gap-3 flex-1">
        <div className="text-center">
          <h4 className="font-bold text-navy-900 text-base">{app.full_name}</h4>
          {app.partner_type && <p className="text-xs text-navy-500 mt-0.5">{app.partner_type}</p>}
        </div>

        <div className="grid grid-cols-1 gap-1.5 text-xs text-navy-600">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-navy-400 shrink-0" />
            <span>{app.mobile_number}</span>
          </div>
          {app.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="truncate">{app.email}</span>
            </div>
          )}
          {app.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>{app.city}{app.state ? `, ${app.state}` : ''}</span>
            </div>
          )}
          {app.application_number && (
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span className="font-mono truncate">{app.application_number}</span>
            </div>
          )}
          {app.created_at && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-navy-400 shrink-0" />
              <span>{t('admin.appliedOn', 'Applied {{date}}').replace('{{date}}', formatDate(app.created_at))}</span>
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
            {t('admin.reviewApplication', 'Review Application')}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const setStatusFilter = (next: string | null) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set('status', next);
      else p.delete('status');
      return p;
    });
  };

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

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  const columns: Column<AgentApplication>[] = [
    {
      key: 'first_name',
      header: t('admin.applicantHeader', 'Applicant'),
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
    { key: 'phone', header: t('admin.phoneHeader', 'Phone'), render: (a) => <span className="text-sm">{a.phone}</span> },
    { key: 'specialization', header: t('admin.specializationHeader', 'Specialization'), render: (a) => <span className="text-sm">{a.specialization ?? '—'}</span> },
    { key: 'license_number', header: t('admin.reraHeader', 'RERA'), render: (a) => <span className="text-xs font-mono">{a.license_number ?? '—'}</span> },
    { key: 'status', header: t('admin.stageHeader', 'Stage'), sortable: true, render: (a) => <AppBadge status={a.status || 'pending_review'} /> },
    {
      key: 'created_at',
      header: t('admin.appliedHeader', 'Applied'),
      sortable: true,
      render: (a) => <span className="text-sm text-navy-500">{formatDate(a.created_at)}</span>,
    },
    {
      key: 'id',
      header: '',
      render: (a) => (
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(a)}>
          {t('admin.review', 'Review')}
        </Button>
      ),
    },
  ];

  const isPending = (a: AgentApplication) => a.status !== 'approved' && a.status !== 'rejected';
  const pendingCount = applications.filter(isPending).length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  const filteredApplications =
    statusFilter === 'pending' ? applications.filter(isPending)
    : statusFilter === 'approved' ? applications.filter((a) => a.status === 'approved')
    : applications;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:agentApps', 'Agent Applications')}>
      <PageHeader title={t('admin.agentApplicationsCrmTitle', 'Agent Applications CRM')} subtitle={t('admin.agentApplicationsCrmSubtitle', 'Manage and verify agent registration pipeline')} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <ClickableStatCard
          label={t('admin.pendingVerification', 'Pending Verification')}
          value={pendingCount}
          icon={Clock}
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
        />
        <ClickableStatCard
          label={t('admin.approved', 'Approved')}
          value={approvedCount}
          icon={CheckCircle2}
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? null : 'approved')}
        />
        <ClickableStatCard
          label={t('admin.totalApplicants', 'Total Applicants')}
          value={applications.length}
          icon={User}
          active={!statusFilter}
          onClick={() => setStatusFilter(null)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-navy-400" />}
          title={t('admin.noApplicationsTitle', 'No applications')}
          description={
            statusFilter
              ? t('admin.noApplicationsMatchFilter', 'No applications match this filter.')
              : t('admin.agentApplicationsEmptyDesc', 'Agent registration requests will appear here.')
          }
        />
      ) : (
        <Card>
          <DataTable
            rows={filteredApplications}
            columns={columns as any}
            getRowId={(r: any) => r.id}
            searchable
            searchPlaceholder={t('admin.searchAgentApplications', 'Search by name, phone, email, specialization...')}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const setStatusFilter = (next: string | null) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set('status', next);
      else p.delete('status');
      return p;
    });
  };

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

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  const columns: Column<BuilderApplication>[] = [
    {
      key: 'company_name',
      header: t('admin.companyHeader', 'Company'),
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
    { key: 'contact_name', header: t('admin.contactHeader', 'Contact'), render: (b) => <span className="text-sm">{b.contact_name}</span> },
    { key: 'city', header: t('admin.cityHeader', 'City'), render: (b) => <span className="text-sm">{b.city ?? '—'}</span> },
    { key: 'rera_number', header: t('admin.reraHeader', 'RERA'), render: (b) => <span className="text-xs font-mono">{b.rera_number ?? '—'}</span> },
    { key: 'status', header: t('admin.stageHeader', 'Stage'), sortable: true, render: (b) => <AppBadge status={b.status || 'pending_review'} /> },
    {
      key: 'created_at',
      header: t('admin.appliedHeader', 'Applied'),
      sortable: true,
      render: (b) => <span className="text-sm text-navy-500">{formatDate(b.created_at)}</span>,
    },
    {
      key: 'id',
      header: '',
      render: (b) => (
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(b)}>
          {t('admin.review', 'Review')}
        </Button>
      ),
    },
  ];

  const isPending = (a: BuilderApplication) => a.status !== 'approved' && a.status !== 'rejected';
  const pendingCount = applications.filter(isPending).length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  const filteredApplications =
    statusFilter === 'pending' ? applications.filter(isPending)
    : statusFilter === 'approved' ? applications.filter((a) => a.status === 'approved')
    : applications;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:builderApps', 'Builder Applications')}>
      <PageHeader title={t('admin.builderApplicationsCrmTitle', 'Builder Applications CRM')} subtitle={t('admin.builderApplicationsCrmSubtitle', 'Manage builder registration pipeline')} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <ClickableStatCard
          label={t('admin.pendingVerification', 'Pending Verification')}
          value={pendingCount}
          icon={Clock}
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
        />
        <ClickableStatCard
          label={t('admin.approved', 'Approved')}
          value={approvedCount}
          icon={CheckCircle2}
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? null : 'approved')}
        />
        <ClickableStatCard
          label={t('admin.totalBuilders', 'Total Builders')}
          value={applications.length}
          icon={Building2}
          active={!statusFilter}
          onClick={() => setStatusFilter(null)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-navy-400" />}
          title={t('admin.noBuilderApplicationsTitle', 'No builder applications')}
          description={
            statusFilter
              ? t('admin.noApplicationsMatchFilter', 'No applications match this filter.')
              : t('admin.builderApplicationsEmptyDesc', 'Builder registration requests will appear here.')
          }
        />
      ) : (
        <Card>
          <DataTable
            rows={filteredApplications}
            columns={columns as any}
            getRowId={(r: any) => r.id}
            searchable
            searchPlaceholder={t('admin.searchBuilderApplications', 'Search by company, contact, city, RERA...')}
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

// ─── Admin Partner Applications ───────────────────────────────────────────────
export function AdminPartnerApplications() {
  const [viewing, setViewing] = useState<PartnerApplication | null>(null);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const setStatusFilter = (next: string | null) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set('status', next);
      else p.delete('status');
      return p;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-partner-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []) as PartnerApplication[];
    },
  });

  const applications = data ?? [];

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  const columns: Column<PartnerApplication>[] = [
    {
      key: 'full_name',
      header: t('admin.partnerHeader', 'Partner'),
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-navy-100 grid place-items-center shrink-0">
            <Handshake className="h-4 w-4 text-navy-500" />
          </div>
          <div>
            <p className="font-medium text-navy-900">{p.full_name}</p>
            <p className="text-xs text-navy-500">{p.email ?? p.mobile_number}</p>
          </div>
        </div>
      ),
    },
    { key: 'mobile_number', header: t('admin.mobileHeader', 'Mobile'), render: (p) => <span className="text-sm">{p.mobile_number}</span> },
    { key: 'partner_type', header: t('admin.partnerTypeHeader', 'Partner Type'), render: (p) => <span className="text-sm">{p.partner_type ?? '—'}</span> },
    { key: 'company_name', header: t('admin.companyHeader', 'Company'), render: (p) => <span className="text-sm">{p.company_name ?? '—'}</span> },
    { key: 'status', header: t('admin.stageHeader', 'Stage'), sortable: true, render: (p) => <AppBadge status={p.status || 'submitted'} /> },
    {
      key: 'created_at',
      header: t('admin.appliedHeader', 'Applied'),
      sortable: true,
      render: (p) => <span className="text-sm text-navy-500">{formatDate(p.created_at)}</span>,
    },
    {
      key: 'id',
      header: '',
      render: (p) => (
        <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setViewing(p)}>
          {t('admin.review', 'Review')}
        </Button>
      ),
    },
  ];

  const isPending = (a: PartnerApplication) => a.status !== 'approved' && a.status !== 'rejected';
  const pendingCount = applications.filter(isPending).length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  const filteredApplications =
    statusFilter === 'pending' ? applications.filter(isPending)
    : statusFilter === 'approved' ? applications.filter((a) => a.status === 'approved')
    : applications;

  return (
    <DashboardLayout sections={adminSections} title={t('dashboard:partnerApps', 'Partner Applications')}>
      <PageHeader title={t('admin.partnerApplicationsCrmTitle', 'Partner Applications CRM')} subtitle={t('admin.partnerApplicationsCrmSubtitle', 'Manage and verify partner registration pipeline')} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <ClickableStatCard
          label={t('admin.pendingReview', 'Pending Review')}
          value={pendingCount}
          icon={Clock}
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
        />
        <ClickableStatCard
          label={t('admin.approved', 'Approved')}
          value={approvedCount}
          icon={CheckCircle2}
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter(statusFilter === 'approved' ? null : 'approved')}
        />
        <ClickableStatCard
          label={t('admin.totalApplicants', 'Total Applicants')}
          value={applications.length}
          icon={Handshake}
          active={!statusFilter}
          onClick={() => setStatusFilter(null)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-8 w-8 text-navy-400" />}
          title={t('admin.noPartnerApplicationsTitle', 'No partner applications')}
          description={
            statusFilter
              ? t('admin.noApplicationsMatchFilter', 'No applications match this filter.')
              : t('admin.partnerApplicationsEmptyDesc', 'Partner registration requests will appear here.')
          }
        />
      ) : (
        <Card>
          <DataTable
            rows={filteredApplications}
            columns={columns as any}
            getRowId={(r: any) => r.id}
            searchable
            searchPlaceholder={t('admin.searchPartnerApplications', 'Search by name, phone, email, company...')}
            cardRender={(row) => (
              <PartnerAppCard
                app={row as PartnerApplication}
                onReview={(p) => setViewing(p)}
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
            queryClient.invalidateQueries({ queryKey: ['admin-partner-applications'] });
          }}
          application={viewing}
          type="partner"
        />
      )}
    </DashboardLayout>
  );
}
