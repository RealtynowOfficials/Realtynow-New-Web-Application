import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Building2, Building, Handshake, Briefcase, UserPlus, FileText, CheckCircle2, XCircle,
  AlertTriangle, Search, Phone, Mail, MapPin, Eye, ShieldCheck, ShieldAlert, Calendar, DollarSign,
  UserCheck, Target, Clock, RefreshCw, RotateCcw, Plus,
  FileCheck, MessageSquare, Check, ExternalLink, Copy,
  LayoutGrid, List, Ban, CheckCircle, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Badge, Modal, Input, Textarea, Skeleton, EmptyState } from '../../components/ui';
import { DataTable, BulkActionsBar, type Column } from '../../components/data-table';
import { formatDate, formatPrice, cn } from '../../lib/utils';
import { getPropertyPricingDisplay } from '../../lib/plot-pricing';
import { useToast } from '../../components/toast';
import { UnifiedLeadDetailModal } from '../../components/crm/UnifiedLeadDetailModal';
import * as api from '../../lib/role-crm-api';

export type RoleType = 'agent' | 'builder' | 'partner' | 'business-partner';
export type SubmoduleType =
  | 'applications'
  | 'leads'
  | 'kanban'
  | 'directory'
  | 'projects'
  | 'project-approvals'
  | 'property-assignments'
  | 'assignments'
  | 'referrals'
  | 'opportunities'
  | 'deals'
  | 'follow-ups'
  | 'performance'
  | 'payouts'
  | 'documents';

interface RoleModulePageProps {
  role: RoleType;
  submodule: SubmoduleType;
}

const ROLE_META: Record<RoleType, { label: string; icon: React.ComponentType<{ className?: string }>; basePath: string }> = {
  agent: { label: 'Agent', icon: Users, basePath: '/admin/agent' },
  builder: { label: 'Builder', icon: Building2, basePath: '/admin/builder' },
  partner: { label: 'Partner', icon: Handshake, basePath: '/admin/partner' },
  'business-partner': { label: 'Business Partner', icon: Briefcase, basePath: '/admin/business-partner' },
};

const SUBMODULE_TITLES: Record<SubmoduleType, { title: string; subtitle: string }> = {
  applications: { title: 'Applications', subtitle: 'Review and verify registration applications' },
  leads: { title: 'Leads CRM', subtitle: 'Manage and track generated leads in real time' },
  kanban: { title: 'Kanban Flow', subtitle: 'Interactive visual lead and conversion pipeline' },
  directory: { title: 'Directory', subtitle: 'Verified profiles, credentials and contact directory' },
  projects: { title: 'Projects', subtitle: 'Manage development projects and inventory' },
  'project-approvals': { title: 'Project Approvals', subtitle: 'Review and approve development project listings' },
  'property-assignments': { title: 'Property Assignments', subtitle: 'Manage property allocations and agent coverage' },
  assignments: { title: 'Assignments', subtitle: 'Assign leads, accounts, and tasks' },
  referrals: { title: 'Referrals', subtitle: 'Track incoming referrals and partner commissions' },
  opportunities: { title: 'Opportunities', subtitle: 'Manage active B2B business opportunities' },
  deals: { title: 'Deals', subtitle: 'Track deal stages, values and expected closing dates' },
  'follow-ups': { title: 'Follow-ups', subtitle: 'Schedule, track, and complete required follow-up activities' },
  performance: { title: 'Performance Analytics', subtitle: 'Conversion metrics, revenue analytics and KPIs' },
  payouts: { title: 'Payouts & Invoices', subtitle: 'Manage commissions, withdrawals, and payout logs' },
  documents: { title: 'Documents & Verification', subtitle: 'Compliance files, KYC and uploaded documents' },
};

export function AdminRoleModule({ role, submodule }: RoleModulePageProps) {
  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);
  const roleInfo = ROLE_META[role];
  const subInfo = SUBMODULE_TITLES[submodule] || { title: submodule, subtitle: '' };

  const breadcrumbs = [
    { label: 'Admin', to: '/admin' },
    { label: roleInfo.label, to: `${roleInfo.basePath}/leads` },
    { label: subInfo.title },
  ];

  return (
    <DashboardLayout sections={adminSections} title={`${roleInfo.label} — ${subInfo.title}`} badge="Admin">
      <PageHeader
        title={subInfo.title}
        subtitle={subInfo.subtitle}
        breadcrumbs={breadcrumbs}
      />

      {submodule === 'leads' && <RoleLeadsView role={role} />}
      {submodule === 'kanban' && <RoleKanbanView role={role} />}
      {submodule === 'directory' && <RoleDirectoryView role={role} />}
      {submodule === 'projects' && <RoleProjectsView role={role} isApprovalView={false} />}
      {submodule === 'project-approvals' && <RoleProjectsView role={role} isApprovalView={true} />}
      {submodule === 'property-assignments' && <RoleAssignmentsView role={role} type="property" />}
      {submodule === 'assignments' && <RoleAssignmentsView role={role} type="general" />}
      {submodule === 'referrals' && <RoleReferralsView role={role} />}
      {submodule === 'opportunities' && <RoleOpportunitiesView role={role} />}
      {submodule === 'deals' && <RoleDealsView role={role} />}
      {submodule === 'follow-ups' && <RoleFollowUpsView role={role} />}
      {submodule === 'performance' && <RolePerformanceView role={role} />}
      {submodule === 'payouts' && <RolePayoutsView role={role} />}
      {submodule === 'documents' && <RoleDocumentsView role={role} />}
    </DashboardLayout>
  );
}

function RoleLeadsView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [assignModalLead, setAssignModalLead] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  // New Lead form state
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadMessage, setNewLeadMessage] = useState('');
  const [newLeadPropertyId, setNewLeadPropertyId] = useState('');
  const [newLeadAgentId, setNewLeadAgentId] = useState('');
  const [newLeadPriority, setNewLeadPriority] = useState('medium');

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['role-leads', role],
    queryFn: () => api.fetchRoleLeads(role),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents-list'],
    queryFn: () => api.fetchAgentsDirectory(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['admin-properties-list-simple'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id, title, city_id, price').order('created_at', { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // Real-time subscription across enquiries, appointments, and crm_leads
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-role-leads-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, refetch]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('crm_leads').delete().in('id', ids);
      if (error) {
        await supabase.from('enquiries').delete().in('id', ids);
        await supabase.from('appointments').delete().in('id', ids);
      }
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} lead${deletedIds.length !== 1 ? 's' : ''} permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-leads', role] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete lead(s)');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      return api.assignLeadToAgent(leadId, agentId);
    },
    onSuccess: () => {
      addToast('success', 'Lead assigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-leads', role] });
      setAssignModalLead(null);
      setSelectedAgentId('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to assign lead');
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async () => {
      return api.createLead({
        name: newLeadName,
        email: newLeadEmail,
        phone: newLeadPhone,
        message: newLeadMessage,
        property_id: newLeadPropertyId || undefined,
        agent_id: newLeadAgentId || undefined,
        source: 'Admin / Direct Lead Entry',
        priority: newLeadPriority,
      });
    },
    onSuccess: () => {
      addToast('success', 'New lead registered successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-leads', role] });
      setCreateModalOpen(false);
      setNewLeadName('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadMessage('');
      setNewLeadPropertyId('');
      setNewLeadAgentId('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to create lead');
    },
  });

  const filtered = useMemo(() => {
    return leads.filter((l: any) => {
      const matchSearch =
        !search ||
        (l.name && l.name.toLowerCase().includes(search.toLowerCase())) ||
        (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
        (l.phone && l.phone.includes(search));
      const matchStatus = statusFilter === 'all' || l.lead_status === statusFilter;
      const matchPriority = priorityFilter === 'all' || l.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [leads, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter((l: any) => l.lead_status === 'contacted').length;
    const qualified = leads.filter((l: any) => l.lead_status === 'qualified' || l.lead_status === 'site_visit').length;
    const won = leads.filter((l: any) => l.lead_status === 'won' || l.lead_status === 'converted').length;
    return { total, contacted, qualified, won };
  }, [leads]);

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Lead Name',
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-semibold text-navy-900">{l.name || 'Anonymous'}</p>
          <p className="text-xs text-navy-500">{l.email || 'No email'}</p>
          {l.property_title && (
            <span className="inline-block mt-0.5 text-[10px] text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded">
              {l.property_title}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (l) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-navy-800">{l.phone || '—'}</p>
          {l.source && <span className="text-navy-400 capitalize">{l.source.replace(/_/g, ' ')}</span>}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (l) => {
        const p = l.priority || 'medium';
        const color =
          p === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
          p === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-slate-50 text-slate-700 border-slate-200';
        return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize', color)}>{p}</span>;
      },
    },
    {
      key: 'lead_status',
      header: 'Status',
      render: (l) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-navy-100 text-navy-800 capitalize">
          {(l.lead_status || 'new').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned Agent',
      render: (l) => {
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-700 font-medium">
              {l.assigned_agent || (l.assigned_to ? 'Assigned' : 'Unassigned')}
            </span>
            <button
              type="button"
              onClick={() => {
                setAssignModalLead(l);
                setSelectedAgentId(l.assigned_to || '');
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer',
                l.assigned_to
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xs shadow-red-500/20 hover:from-red-500 hover:to-rose-500'
              )}
            >
              <UserPlus className="h-3 w-3" />
              <span>{l.assigned_to ? 'Reassign' : 'Assign'}</span>
            </button>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (l) => <span className="text-xs text-navy-500">{formatDate(l.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div className="flex items-center gap-1.5">
          {l.phone && (
            <a
              href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
          )}
          <Button size="sm" variant="ghost" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setSelectedLead(l)}>
            View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            title="Delete Lead Permanently"
            onClick={() => setToDelete([l.id])}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats.total} icon={<UserPlus className="h-5 w-5 text-navy-600" />} accent="navy" />
        <StatCard label="Contacted" value={stats.contacted} icon={<Phone className="h-5 w-5 text-gold-600" />} accent="gold" />
        <StatCard label="Qualified" value={stats.qualified} icon={<Target className="h-5 w-5 text-success-600" />} accent="success" />
        <StatCard label="Converted / Won" value={stats.won} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} accent="success" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium text-navy-700"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="site_visit">Site Visit</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won / Converted</option>
              <option value="lost">Lost</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium text-navy-700"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              className="cursor-pointer font-semibold shadow-sm"
              onClick={() => setCreateModalOpen(true)}
            >
              + Add Lead
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          getRowId={(l) => l.id}
          pageSize={10}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onSelectAll={(ids) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
              return next;
            })
          }
          emptyState={
            <div className="text-center py-10 space-y-3">
              <UserPlus className="h-10 w-10 text-navy-300 mx-auto" />
              <h4 className="font-bold text-navy-800 text-sm">No leads found</h4>
              <p className="text-xs text-navy-500 max-w-sm mx-auto">
                No customer inquiries or leads match your current filter. You can add walk-in or direct leads directly.
              </p>
              <Button size="sm" variant="primary" onClick={() => setCreateModalOpen(true)} className="mt-2">
                + Create New Lead
              </Button>
            </div>
          }
        />
      </Card>

      {/* Create New Lead Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create New Lead / Direct Inquiry"
        >
          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Customer / Lead Name *</label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Phone Number</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Email Address</label>
                <Input
                  placeholder="ramesh@example.com"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Priority</label>
                <select
                  value={newLeadPriority}
                  onChange={(e) => setNewLeadPriority(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Assign Agent</label>
                <select
                  value={newLeadAgentId}
                  onChange={(e) => setNewLeadAgentId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium"
                >
                  <option value="">Auto-Assign / Platform Unassigned</option>
                  {agents.map((ag: any) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.first_name} {ag.last_name || ''} ({ag.phone || 'Agent'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Target Property (Optional)</label>
              <select
                value={newLeadPropertyId}
                onChange={(e) => setNewLeadPropertyId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium"
              >
                <option value="">No Specific Property / General Inquiry</option>
                {properties.map((pr: any) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.title} — {pr.price ? formatPrice(pr.price) : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Inquiry / Note Message</label>
              <Textarea
                placeholder="Interested in 3 BHK flat in Gachibowli under 1.5 Cr..."
                value={newLeadMessage}
                onChange={(e) => setNewLeadMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!newLeadName || createLeadMutation.isPending}
                onClick={() => createLeadMutation.mutate()}
              >
                Create Lead Record
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Agent Modal */}
      {assignModalLead && (
        <Modal
          isOpen={!!assignModalLead}
          onClose={() => setAssignModalLead(null)}
          title="Assign Lead to Specialist Agent"
        >
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-semibold text-navy-900">{assignModalLead.name || 'Anonymous Customer'}</p>
              <p className="text-xs text-navy-500">{assignModalLead.phone || 'No phone'} • {assignModalLead.email || 'No email'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1.5">Select Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white"
              >
                <option value="">-- Choose Agent from Directory --</option>
                {agents.map((ag: any) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.first_name} {ag.last_name || ''} ({ag.phone || 'No phone'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setAssignModalLead(null)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!selectedAgentId || assignMutation.isPending}
                onClick={() => assignMutation.mutate({ leadId: assignModalLead.id, agentId: selectedAgentId })}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Lead Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Lead' : `${toDelete.length} Leads`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The lead record will be permanently removed from the CRM and database.'
                    : `All ${toDelete.length} selected lead records will be permanently removed from the CRM and database.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedLead && (
        <UnifiedLeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          sourceType={role === 'builder' ? 'builder' : 'agent'}
          onStatusChange={() => refetch()}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KANBAN FLOW VIEW
// ─────────────────────────────────────────────────────────────────────────────
const KANBAN_STAGES = [
  { id: 'new', label: 'New', color: 'border-t-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-cyan-500' },
  { id: 'interested', label: 'Interested', color: 'border-t-purple-500' },
  { id: 'qualified', label: 'Qualified', color: 'border-t-amber-500' },
  { id: 'site_visit', label: 'Site Visit', color: 'border-t-yellow-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-orange-500' },
  { id: 'won', label: 'Won / Converted', color: 'border-t-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'border-t-rose-500' },
];

function RoleKanbanView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['role-kanban', role],
    queryFn: () => api.fetchRoleLeads(role),
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-kanban-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, refetch]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.updateLeadStatus(id, status);
    },
    onSuccess: (_, vars) => {
      addToast('success', `Lead moved to ${vars.status.replace(/_/g, ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['role-kanban', role] });
      queryClient.invalidateQueries({ queryKey: ['role-leads', role] });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update lead status');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500 font-medium">Drag or drop cards across stages in real time.</p>
        <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refetch()}>
          Refresh Pipeline
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar min-h-[600px]">
        {KANBAN_STAGES.map((stage) => {
          const stageLeads = leads.filter((l: any) => (l.lead_status || 'new') === stage.id);

          return (
            <div
              key={stage.id}
              className={cn('w-72 shrink-0 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 flex flex-col', stage.color, 'border-t-4')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/plain');
                if (id) updateStatusMutation.mutate({ id, status: stage.id });
              }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">{stage.label}</h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[650px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Drop lead here
                  </div>
                ) : (
                  stageLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-grab active:cursor-grabbing space-y-2"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{lead.name || 'Anonymous'}</p>
                        {lead.priority && (
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded capitalize', lead.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>
                            {lead.priority}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {lead.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {lead.phone}</p>}
                        {lead.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 text-slate-400" /> {lead.email}</p>}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{formatDate(lead.created_at)}</span>
                        <span className="text-red-600 font-semibold hover:underline">Details →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

{selectedLead && (
        <UnifiedLeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          sourceType={role === 'builder' ? 'builder' : 'agent'}
          onStatusChange={() => refetch()}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DIRECTORY VIEW (Tabular & Cards View Switcher with Real-time Data)
// ─────────────────────────────────────────────────────────────────────────────
function RoleDirectoryView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  // 1. Fetch directory items
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['role-directory', role, search],
    queryFn: async () => {
      if (role === 'agent') return api.fetchAgentsDirectory(search);
      if (role === 'builder') {
        let q = supabase.from('builders').select('*').order('name');
        if (search.trim()) {
          q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        const { data, error } = await q;
        if (error) {
          console.warn('Builders query warning:', error);
          const { data: fallback } = await supabase.from('builders').select('*');
          return fallback ?? [];
        }
        return data ?? [];
      }
      let q = supabase.from('partners').select('*').order('created_at', { ascending: false });
      if (search.trim()) {
        q = q.or(`company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  // 2. Fetch Projects count map for builders (to show active projects badge)
  const { data: builderProjectsMap = {} } = useQuery({
    queryKey: ['builder-projects-counts-map'],
    queryFn: async () => {
      const { data, error } = await supabase.from('builder_projects').select('id, name, builder_id, total_units, status');
      if (error || !data) return {};
      const map: Record<string, { count: number; totalUnits: number; projects: any[] }> = {};
      for (const p of data) {
        if (!p.builder_id) continue;
        if (!map[p.builder_id]) {
          map[p.builder_id] = { count: 0, totalUnits: 0, projects: [] };
        }
        map[p.builder_id].count += 1;
        map[p.builder_id].totalUnits += Number(p.total_units) || 0;
        map[p.builder_id].projects.push(p);
      }
      return map;
    },
    enabled: role === 'builder',
  });

  // 3. Realtime updates subscription
  useEffect(() => {
    const tableToListen = role === 'builder' ? 'builders' : role === 'agent' ? 'agents' : 'partners';
    const channel = supabase
      .channel(`realtime-directory-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableToListen }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, refetch]);

  // 4. Status Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const nextStatus = currentStatus === 'active' || currentStatus === 'approved' ? 'suspended' : 'active';
      if (role === 'builder') {
        const { error } = await supabase.from('builders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        return;
      }
      return api.toggleAgentStatus(id, currentStatus);
    },
    onSuccess: () => {
      addToast('success', 'Member status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-directory', role] });
      if (selectedMember) {
        setSelectedMember(null);
      }
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to update member status');
    },
  });

  // 4b. Permanent Delete Mutation — routes through Direct DB delete
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => api.deleteDirectoryMembers(ids, role),
    onSuccess: (_, deletedIds) => {
      addToast('success', `${deletedIds.length} account${deletedIds.length !== 1 ? 's' : ''} permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-directory', role] });
      setSelectedIds(new Set());
      setToDelete(null);
      if (selectedMember && deletedIds.includes(selectedMember.id)) {
        setSelectedMember(null);
      }
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete account(s). Please try again.');
    },
  });

  // 5. Client-side Search & Status Filter
  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      const s = (item.status || 'active').toLowerCase();
      if (statusFilter === 'active' && s !== 'active' && s !== 'approved') return false;
      if (statusFilter === 'pending' && s !== 'pending' && s !== 'submitted') return false;
      if (statusFilter === 'suspended' && s !== 'suspended' && s !== 'inactive' && s !== 'blocked') return false;
      return true;
    });
  }, [items, statusFilter]);

  // 6. Summary Stats Computation
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i: any) => {
      const s = (i.status || 'active').toLowerCase();
      return s === 'active' || s === 'approved';
    }).length;
    const pending = items.filter((i: any) => {
      const s = (i.status || '').toLowerCase();
      return s === 'pending' || s === 'submitted';
    }).length;
    const suspended = total - active - pending;
    const totalProjects = Object.values(builderProjectsMap).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0);

    return { total, active, pending, suspended, totalProjects };
  }, [items, builderProjectsMap]);

  // 7. Table Columns Definition
  const columns: Column<any>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Member / Entity',
      sortable: true,
      render: (item) => {
        const title = item.first_name ? `${item.first_name} ${item.last_name || ''}` : item.name || item.company_name || item.full_name || 'Member';
        const specialization = item.specialization || item.partner_type || (role === 'builder' ? 'Builder' : 'Channel Partner');
        const rera = item.license_number || item.rera_number || item.rera_registration_number;

        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p
                className="font-bold text-navy-900 text-sm truncate hover:text-red-600 cursor-pointer transition-colors"
                onClick={() => setSelectedMember(item)}
                title={title}
              >
                {title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-navy-500">
                <span className="capitalize">{specialization}</span>
                {rera && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                      RERA: {rera}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'contact',
      header: 'Contact Information',
      render: (item) => {
        const email = item.email || item.contact_email;
        const phone = item.phone || item.mobile_number || item.contact_phone;
        return (
          <div className="text-xs space-y-0.5">
            {phone && (
              <p className="font-medium text-navy-800 font-mono flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                <span>{phone}</span>
              </p>
            )}
            {email && (
              <p className="text-navy-500 truncate flex items-center gap-1.5 max-w-[180px]" title={email}>
                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'City / Region',
      render: (item) => (
        <span className="text-xs text-navy-700 flex items-center gap-1">
          <MapPin className="h-3 w-3 text-red-500 shrink-0" />
          {item.city || item.state || 'Hyderabad'}
        </span>
      ),
    },
    ...(role === 'builder'
      ? [
          {
            key: 'projects',
            header: 'Projects Listed',
            render: (item: any) => {
              const info = builderProjectsMap[item.id];
              const count = info?.count || 0;
              return (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Building2 className="h-3.5 w-3.5 text-red-500" />
                  {count} {count === 1 ? 'Project' : 'Projects'}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const s = (item.status || 'active').toLowerCase();
        const isActive = s === 'active' || s === 'approved';
        const isPending = s === 'pending' || s === 'submitted';
        const variant = isActive ? 'success' : isPending ? 'warning' : 'error';
        return (
          <Badge variant={variant as any}>
            {isActive ? 'Verified / Active' : isPending ? 'Pending Verification' : 'Suspended'}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Joined Date',
      sortable: true,
      render: (item) => <span className="text-xs text-navy-500 font-medium">{formatDate(item.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => {
        const isActive = item.status === 'active' || item.status === 'approved' || !item.status;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              title="View Details"
              onClick={() => setSelectedMember(item)}
              icon={<Eye className="h-3.5 w-3.5" />}
            />
            {role === 'builder' && (
              <Link to={`/admin/builder/projects?builderId=${item.id}`}>
                <Button size="sm" variant="ghost" title="View Builder Projects" icon={<Building2 className="h-3.5 w-3.5" />} />
              </Link>
            )}
            <Button
              size="sm"
              variant="ghost"
              className={isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'}
              title={isActive ? 'Suspend Member' : 'Activate Member'}
              onClick={() => toggleMutation.mutate({ id: item.id, currentStatus: item.status || 'active' })}
              icon={isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              title="Delete Permanently"
              onClick={() => setToDelete([item.id])}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ], [role, builderProjectsMap, toggleMutation]);

  return (
    <div className="space-y-6">
      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={role === 'builder' ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          label={`Total ${ROLE_META[role].label}s`}
          value={stats.total}
          trend={`${stats.active} active`}
          accent="navy"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Verified & Active"
          value={stats.active}
          trend={`${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% verified`}
          accent="success"
        />
        {role === 'builder' ? (
          <StatCard
            icon={<Building className="h-5 w-5" />}
            label="Live Projects"
            value={stats.totalProjects}
            trend="Across Hyderabad & Corridors"
            accent="navy"
          />
        ) : (
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Recent Registrations"
            value={items.filter((i: any) => new Date(i.created_at).getTime() > Date.now() - 30 * 86400000).length}
            trend="Last 30 days"
            accent="gold"
          />
        )}
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Pending / Suspended"
          value={stats.pending + stats.suspended}
          trend={stats.suspended > 0 ? `${stats.suspended} suspended` : 'Zero issues'}
          accent={stats.suspended > 0 ? 'error' : 'navy'}
        />
      </div>

      {/* Control Bar: Search + Status Tabs + [Table View / Cards View] Switcher */}
      <Card className="p-4 bg-white border border-slate-200/90 shadow-xs rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${ROLE_META[role].label} by name, phone, email, or RERA...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right Tools: Status Filter Tabs & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pills */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg capitalize transition-all',
                    statusFilter === s
                      ? 'bg-white text-navy-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-navy-900'
                  )}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>

            {/* View Mode Toggle Button */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all',
                  viewMode === 'cards'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                )}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all',
                  viewMode === 'table'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                )}
                title="Tabular List View"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
              title="Refresh Real-time Directory"
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Directory Content: Table View OR Cards View */}
      {viewMode === 'table' ? (
        <Card className="overflow-hidden border border-slate-200 shadow-xs rounded-2xl">
          {selectedIds.size > 0 && (
            <div className="px-4 pt-4">
              <BulkActionsBar
                count={selectedIds.size}
                onDelete={() => setToDelete(Array.from(selectedIds))}
                onClear={() => setSelectedIds(new Set())}
              />
            </div>
          )}
          <DataTable
            columns={columns}
            rows={filteredItems}
            loading={isLoading}
            getRowId={(r) => r.id}
            selectedIds={selectedIds}
            onToggleSelect={(id) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })
            }
            onSelectAll={(ids) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
                return next;
              })
            }
          />
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-8">
                <EmptyState
                  title={`No ${ROLE_META[role].label} Records Found`}
                  description="No directory entries match your search criteria. Try modifying your search or filters."
                  action={
                    search || statusFilter !== 'all' ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('all');
                        }}
                      >
                        Reset Filters
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            </div>
          ) : (
            filteredItems.map((item: any) => {
              const title = item.first_name ? `${item.first_name} ${item.last_name || ''}` : item.name || item.company_name || item.full_name || 'Member';
              const email = item.email || item.contact_email;
              const phone = item.phone || item.mobile_number || item.contact_phone;
              const rera = item.license_number || item.rera_number || item.rera_registration_number;
              const isActive = item.status === 'active' || item.status === 'approved' || !item.status;
              const isPending = item.status === 'pending' || item.status === 'submitted';
              const projectsInfo = role === 'builder' ? builderProjectsMap[item.id] : null;
              const specialization = item.specialization || item.partner_type || (role === 'builder' ? 'Real Estate Developer' : 'Verified Partner');

              return (
                <Card
                  key={item.id}
                  className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200/90 rounded-2xl bg-white group hover:border-red-200"
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-md">
                          {title.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="font-bold text-navy-900 text-sm sm:text-[15px] truncate hover:text-red-600 cursor-pointer transition-colors"
                            onClick={() => setSelectedMember(item)}
                            title={title}
                          >
                            {title}
                          </h4>
                          <p className="text-xs text-navy-500 capitalize truncate mt-0.5">{specialization}</p>
                        </div>
                      </div>
                      <Badge variant={isActive ? 'success' : isPending ? 'warning' : 'error'}>
                        {isActive ? 'Approved' : isPending ? 'Pending' : 'Suspended'}
                      </Badge>
                    </div>

                    {/* RERA Badge & Projects Count */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {rera && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                          RERA: {rera}
                        </span>
                      )}
                      {projectsInfo && projectsInfo.count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          <Building2 className="h-3 w-3 text-red-500 shrink-0" />
                          {projectsInfo.count} {projectsInfo.count === 1 ? 'Project' : 'Projects'}
                        </span>
                      )}
                    </div>

                    {/* Contact & Location Info */}
                    <div className="text-xs text-navy-600 space-y-1.5 pt-1 border-t border-slate-100">
                      {phone && (
                        <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-red-600 transition-colors">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-medium">{phone}</span>
                        </a>
                      )}
                      {email && (
                        <a href={`mailto:${email}`} className="flex items-center gap-2 truncate hover:text-red-600 transition-colors" title={email}>
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{email}</span>
                        </a>
                      )}
                      <p className="flex items-center gap-2 text-slate-500 truncate">
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{item.city || item.state || 'Hyderabad, Telangana'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Card Actions */}
                  <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-navy-400">
                    <span className="text-[11px] text-slate-400">Joined {formatDate(item.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMember(item)}
                        className="text-navy-700 font-bold hover:text-red-600 text-xs cursor-pointer"
                      >
                        Details
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => toggleMutation.mutate({ id: item.id, currentStatus: item.status || 'active' })}
                        className={cn(
                          'font-bold cursor-pointer hover:underline',
                          isActive ? 'text-orange-600' : 'text-emerald-600'
                        )}
                      >
                        {isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => setToDelete([item.id])}
                        className="font-bold text-red-600 cursor-pointer hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`${ROLE_META[role].label} Profile & Credentials`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                {(selectedMember.name || selectedMember.first_name || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-navy-900 text-base truncate">
                  {selectedMember.first_name ? `${selectedMember.first_name} ${selectedMember.last_name || ''}` : selectedMember.name || selectedMember.company_name}
                </h4>
                <p className="text-xs text-slate-500 capitalize">{selectedMember.specialization || selectedMember.partner_type || 'Verified Member'}</p>
              </div>
              <Badge variant={selectedMember.status === 'active' || selectedMember.status === 'approved' ? 'success' : 'warning'}>
                {selectedMember.status || 'Active'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Phone Contact</span>
                <p className="font-bold text-navy-900 font-mono">{selectedMember.phone || selectedMember.mobile_number || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Email Address</span>
                <p className="font-bold text-navy-900 truncate" title={selectedMember.email || selectedMember.contact_email}>
                  {selectedMember.email || selectedMember.contact_email || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">RERA / License</span>
                <p className="font-bold text-emerald-700 font-mono">
                  {selectedMember.license_number || selectedMember.rera_number || selectedMember.rera_registration_number || 'Under Verification'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Registration Date</span>
                <p className="font-bold text-navy-900">{formatDate(selectedMember.created_at)}</p>
              </div>
            </div>

            {/* Builder Listed Projects Showcase inside details */}
            {role === 'builder' && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-red-500" /> Development Portfolio
                  </span>
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {builderProjectsMap[selectedMember.id]?.count || 0} Listed
                  </span>
                </div>
                {builderProjectsMap[selectedMember.id]?.projects?.length ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {builderProjectsMap[selectedMember.id].projects.map((p: any) => (
                      <div key={p.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                        <span className="font-bold text-navy-900">{p.name}</span>
                        <span className="text-slate-500 font-medium">{p.total_units || 0} Units • <span className="capitalize">{p.status}</span></span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No development projects mapped yet.</p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedMember.status === 'active' || selectedMember.status === 'approved' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: selectedMember.id, currentStatus: selectedMember.status || 'active' })}
                >
                  {selectedMember.status === 'active' || selectedMember.status === 'approved' ? 'Suspend Account' : 'Approve & Activate Account'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => { const mid = selectedMember.id; setSelectedMember(null); setToDelete([mid]); }}
                >
                  Delete
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Account' : `${toDelete.length} Accounts`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The account and all associated data will be permanently removed from the system.'
                    : `All ${toDelete.length} selected accounts and their associated data will be permanently removed from the system.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROJECTS & PROJECT APPROVALS VIEW (Builder)
// ─────────────────────────────────────────────────────────────────────────────
function RoleProjectsView({ role, isApprovalView }: { role: RoleType; isApprovalView: boolean }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [reviewModalApproval, setReviewModalApproval] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Selection & Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  // Form states
  const [pName, setPName] = useState('');
  const [pLocation, setPLocation] = useState('');
  const [pUnits, setPUnits] = useState(100);
  const [pRera, setPRera] = useState('');
  const [pDesc, setPDesc] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['role-projects', isApprovalView],
    queryFn: () => isApprovalView ? api.fetchProjectApprovals() : api.fetchBuilderProjects(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('builder_projects').delete().in('id', ids);
      if (error) {
        await supabase.from('projects').delete().in('id', ids);
      }
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} project${deletedIds.length !== 1 ? 's' : ''} permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-projects'] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete project(s)');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createBuilderProject({
        name: pName,
        location: pLocation,
        total_units: pUnits,
        rera_number: pRera,
        description: pDesc,
      });
    },
    onSuccess: () => {
      addToast('success', 'Project created and queued for approval.');
      queryClient.invalidateQueries({ queryKey: ['role-projects'] });
      setNewProjectOpen(false);
      setPName('');
      setPLocation('');
      setPDesc('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to create project');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ status }: { status: 'approved' | 'rejected' | 'changes_requested' }) => {
      return api.reviewProjectApproval({
        approvalId: reviewModalApproval.id,
        projectId: reviewModalApproval.project_id,
        status,
        reviewNotes,
      });
    },
    onSuccess: (_, vars) => {
      addToast('success', `Project ${vars.status.replace(/_/g, ' ')} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['role-projects'] });
      setReviewModalApproval(null);
      setReviewNotes('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to submit review');
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Project Name',
      sortable: true,
      render: (p) => (
        <div>
          <p className="font-bold text-navy-900">{p.name || p.project_name || p.title || 'Project'}</p>
          <p className="text-xs text-navy-500">{p.location || p.city_name || 'Hyderabad'}</p>
        </div>
      ),
    },
    { key: 'builder', header: 'Developer / Builder', render: (p) => p.builder_name || 'Verified Developer' },
    { key: 'units', header: 'Units', render: (p) => <span className="font-semibold">{p.total_units || '120 Units'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const s = p.status || 'pending';
        const variant = s === 'approved' || s === 'active' ? 'success' : s === 'rejected' ? 'error' : 'warning';
        return <Badge variant={variant as any}>{s.replace(/_/g, ' ')}</Badge>;
      },
    },
    { key: 'created_at', header: 'Date', render: (p) => formatDate(p.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => {
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {isApprovalView && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setReviewModalApproval(p);
                  setReviewNotes(p.review_notes || '');
                }}
              >
                Review
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              title="Delete Project Permanently"
              onClick={() => setToDelete([p.id])}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500 font-medium">
          {isApprovalView ? 'Review and grant listing approvals for builder development projects.' : 'Manage builder inventory and project portfolios.'}
        </p>
        {!isApprovalView && (
          <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewProjectOpen(true)}>
            Add Project
          </Button>
        )}
      </div>

      <Card className="p-5">
        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}
        <DataTable
          columns={columns}
          rows={projects}
          loading={isLoading}
          getRowId={(p) => p.id}
          pageSize={10}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onSelectAll={(ids) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
              return next;
            })
          }
          emptyState={<EmptyState title="No projects found" description="No builder project records available." />}
        />
      </Card>

      {/* Add Project Modal */}
      {newProjectOpen && (
        <Modal isOpen={newProjectOpen} onClose={() => setNewProjectOpen(false)} title="Add Development Project">
          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Project Name</label>
              <Input placeholder="e.g. Prestige High Fields Tower C" value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Location</label>
              <Input placeholder="e.g. Financial District, Nanakramguda" value={pLocation} onChange={(e) => setPLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Total Units</label>
                <Input type="number" value={pUnits} onChange={(e) => setPUnits(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">TG-RERA Number</label>
                <Input placeholder="P02400001234" value={pRera} onChange={(e) => setPRera(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Description</label>
              <Textarea placeholder="Project highlights, clubhouse amenities, possession date..." value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={!pName || !pLocation || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Submit for Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Approval Modal */}
      {reviewModalApproval && (
        <Modal isOpen={!!reviewModalApproval} onClose={() => setReviewModalApproval(null)} title="Review Project Listing Approval">
          <div className="space-y-4 pt-2">
            <div>
              <h4 className="font-bold text-navy-900">{reviewModalApproval.name || reviewModalApproval.project_name || 'Project'}</h4>
              <p className="text-xs text-navy-500">{reviewModalApproval.location} • {reviewModalApproval.total_units || 100} Total Units</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Review Notes / Feedback</label>
              <Textarea
                placeholder="Specify approval conditions or reasons if requesting changes..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setReviewModalApproval(null)}>Cancel</Button>
              <Button
                variant="outline"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ status: 'changes_requested' })}
              >
                Request Changes
              </Button>
              <Button
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ status: 'rejected' })}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ status: 'approved' })}
              >
                Approve & Publish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Project Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Project' : `${toDelete.length} Projects`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The project and its listing records will be permanently removed from the system.'
                    : `All ${toDelete.length} selected projects and their listing records will be permanently removed from the system.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ASSIGNMENTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RoleAssignmentsView({ role, type }: { role: RoleType; type: 'property' | 'general' }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignmentType, setAssignmentType] = useState('exclusive');
  const [commissionSplit, setCommissionSplit] = useState(50);
  const [notes, setNotes] = useState('');

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['role-assignments'],
    queryFn: () => api.fetchPropertyAssignments(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['admin-agents-list'],
    queryFn: () => api.fetchAgentsDirectory(),
  });

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('realtime-property-assignments-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_assignments' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.unassignProperty(id);
      }
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} property assignment${deletedIds.length !== 1 ? 's' : ''} removed.`);
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to remove assignment(s)');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      return api.assignPropertyToAgent({
        propertyId: selectedPropertyId,
        agentId: selectedAgentId,
        assignmentType,
        commissionSplit,
        notes,
      });
    },
    onSuccess: () => {
      addToast('success', 'Property assigned successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      setAssignModalOpen(false);
      setSelectedPropertyId('');
      setSelectedAgentId('');
      setNotes('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to assign property');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return api.unassignProperty(propertyId);
    },
    onSuccess: () => {
      addToast('success', 'Agent unassigned from property.');
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to unassign property');
    },
  });

  const filtered = useMemo(() => {
    return assignments.filter((item: any) => {
      const matchSearch =
        !search ||
        (item.property?.title && item.property.title.toLowerCase().includes(search.toLowerCase())) ||
        (item.property?.city_name && item.property.city_name.toLowerCase().includes(search.toLowerCase())) ||
        (item.property?.locality && item.property.locality.toLowerCase().includes(search.toLowerCase())) ||
        (item.agent?.first_name && item.agent.first_name.toLowerCase().includes(search.toLowerCase())) ||
        (item.agent?.last_name && item.agent.last_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'assigned' && !!item.agent_id) ||
        (filterStatus === 'unassigned' && !item.agent_id);

      return matchSearch && matchStatus;
    });
  }, [assignments, search, filterStatus]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const assigned = assignments.filter((a: any) => !!a.agent_id).length;
    const unassigned = total - assigned;
    const totalAgents = agents.length;
    return { total, assigned, unassigned, totalAgents };
  }, [assignments, agents]);

  const openAssignModal = (propertyId?: string, currentAgentId?: string) => {
    const propId = propertyId || (assignments.length > 0 ? assignments[0].property_id : '');
    const agId = currentAgentId || (agents.length > 0 ? agents[0].id : '');
    setSelectedPropertyId(propId);
    setSelectedAgentId(agId);
    setAssignModalOpen(true);
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Property Target',
      sortable: true,
      render: (p) => (
        <div>
          <p className="font-bold text-navy-900 leading-tight">{p.property?.title || 'Property'}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-navy-500">
            <span>{p.property?.city_name || 'Hyderabad'}</span>
            {p.property?.price && (
              <>
                <span>•</span>
                <span className="font-bold text-emerald-700">
                  {getPropertyPricingDisplay(p.property).primaryPrice}
                </span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Assigned Specialist',
      render: (p) => {
        if (!p.agent && !p.agent_id) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
              <Clock className="h-3 w-3 text-amber-600" /> Unassigned
            </span>
          );
        }
        const name = p.agent ? `${p.agent.first_name} ${p.agent.last_name || ''}` : 'Assigned Agent';
        return (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
              {(p.agent?.first_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-navy-900 text-xs">
                <span>{name}</span>
              </div>
              {p.agent?.phone && <p className="text-[11px] text-slate-500 font-mono">{p.agent.phone}</p>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'assignment_type',
      header: 'Coverage Type',
      render: (p) => (
        <span className="capitalize text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
          {(p.assignment_type || 'exclusive').replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'split',
      header: 'Commission Split',
      render: (p) => (
        <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
          {p.commission_split_percent || 50}% Agent / {100 - (p.commission_split_percent || 50)}% Platform
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.agent_id ? 'success' : 'warning'}>
          {p.agent_id ? 'Active Coverage' : 'Unassigned'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          {p.agent_id ? (
            <>
              <button
                type="button"
                onClick={() => openAssignModal(p.property_id, p.agent_id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 text-slate-500" />
                Reassign
              </button>
              <button
                type="button"
                disabled={unassignMutation.isPending}
                onClick={() => setToDelete([p.property_id])}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                Unassign
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openAssignModal(p.property_id)}
              className="group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/35 active:scale-95 transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              <span>Assign Agent</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Listed Properties" value={stats.total} icon={<Building2 className="h-5 w-5 text-navy-600" />} accent="navy" />
        <StatCard label="Assigned Coverage" value={stats.assigned} icon={<UserCheck className="h-5 w-5 text-emerald-600" />} accent="success" />
        <StatCard label="Pending Allocation" value={stats.unassigned} icon={<Clock className="h-5 w-5 text-amber-600" />} accent="gold" />
        <StatCard label="Available Agents" value={stats.totalAgents} icon={<Users className="h-5 w-5 text-blue-600" />} accent="navy" />
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
            <input
              type="text"
              placeholder="Search properties or agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium text-navy-700"
            >
              <option value="all">All Properties ({stats.total})</option>
              <option value="assigned">Assigned ({stats.assigned})</option>
              <option value="unassigned">Unassigned ({stats.unassigned})</option>
            </select>

            <button
              type="button"
              onClick={() => openAssignModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/35 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Property</span>
            </button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          getRowId={(p) => p.property_id}
          pageSize={10}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onSelectAll={(ids) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
              return next;
            })
          }
          emptyState={
            <div className="text-center py-10 space-y-3">
              <Building2 className="h-10 w-10 text-navy-300 mx-auto" />
              <h4 className="font-bold text-navy-800 text-sm">No property records found</h4>
              <p className="text-xs text-navy-500 max-w-sm mx-auto">
                No properties are currently available in the database matching your criteria.
              </p>
              <Button size="sm" variant="primary" onClick={() => openAssignModal()} className="mt-2">
                + Assign Property
              </Button>
            </div>
          }
        />
      </Card>

      {/* Assign Property Modal */}
      {assignModalOpen && (
        <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Property to Agent">
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1.5">Select Property</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white"
              >
                {assignments.length === 0 && <option value="">No listed properties found in database</option>}
                {assignments.map((item: any) => (
                  <option key={item.property_id} value={item.property_id}>
                    {item.property?.title || 'Property'} ({item.property?.city_name || 'Hyderabad'}) {item.agent ? `[Currently: ${item.agent.first_name}]` : '[Unassigned]'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1.5">Select Real Estate Agent</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white"
              >
                {agents.length === 0 && <option value="">No registered agents found</option>}
                {agents.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} ({a.phone || a.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">Coverage Type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-navy-200 bg-white"
                >
                  <option value="exclusive">Exclusive Mandate</option>
                  <option value="open">Open Listing</option>
                  <option value="primary_rm">Primary Relationship Manager</option>
                  <option value="lead_handler">Lead Handler</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1.5">
                  Agent Commission ({commissionSplit}%)
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={commissionSplit}
                  onChange={(e) => setCommissionSplit(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1.5">Internal Assignment Notes (Optional)</label>
              <Textarea
                placeholder="Specific instructions, developer agreement terms, key contact hours..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!selectedPropertyId || !selectedAgentId || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete / Unassign Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Unassign ${toDelete.length === 1 ? 'Property' : `${toDelete.length} Properties`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">Remove Agent Coverage?</p>
                <p>
                  {toDelete.length === 1
                    ? 'The assigned agent will be unassigned from this property listing.'
                    : `All ${toDelete.length} selected properties will have their agent assignments cleared.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Confirm Unassign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REFERRALS VIEW (Partner)
// ─────────────────────────────────────────────────────────────────────────────
function RoleReferralsView({ role }: { role: RoleType }) {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['role-referrals'],
    queryFn: () => api.fetchPartnerReferrals(),
  });

  const columns: Column<any>[] = [
    { key: 'code', header: 'Referral Code', render: (r) => <span className="font-mono font-bold text-xs text-navy-900">{r.referral_code || 'RN-REF-001'}</span> },
    { key: 'customer', header: 'Referred Client', render: (r) => <span className="font-semibold">{r.details?.name || 'Referred Client'}</span> },
    { key: 'partner', header: 'Partner', render: (r) => r.partner?.full_name || 'Business Partner' },
    { key: 'amount', header: 'Commission', render: (r) => <span className="font-bold text-emerald-700">{formatPrice(r.eligible_amount || 25000)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = r.status || 'pending';
        return <Badge variant={s === 'completed' ? 'success' : s === 'verified' ? 'info' : 'default'}>{s}</Badge>;
      },
    },
    { key: 'created_at', header: 'Date', render: (r) => formatDate(r.created_at) },
  ];

  return (
    <Card className="p-5">
      <DataTable
        columns={columns}
        rows={referrals}
        loading={isLoading}
        getRowId={(r) => r.id}
        pageSize={10}
        emptyState={<EmptyState title="No referrals found" description="No partner referral records found." />}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. OPPORTUNITIES & DEALS (Business Partner)
// ─────────────────────────────────────────────────────────────────────────────
function RoleOpportunitiesView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [newOppOpen, setNewOppOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [dealSize, setDealSize] = useState(2500000);
  const [stage, setStage] = useState('discovery');
  const [probability, setProbability] = useState(25);

  const { data: opps = [], isLoading } = useQuery({
    queryKey: ['role-b2b-opportunities'],
    queryFn: () => api.fetchB2BOpportunities(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createB2BOpportunity({
        title,
        company_name: company,
        contact_name: contactName,
        contact_phone: contactPhone,
        deal_size: dealSize,
        stage,
        probability,
      });
    },
    onSuccess: () => {
      addToast('success', 'B2B opportunity added.');
      queryClient.invalidateQueries({ queryKey: ['role-b2b-opportunities'] });
      setNewOppOpen(false);
      setTitle('');
      setCompany('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to create opportunity');
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Opportunity',
      sortable: true,
      render: (o) => (
        <div>
          <p className="font-bold text-navy-900">{o.title}</p>
          <p className="text-xs text-navy-500">{o.company_name}</p>
        </div>
      ),
    },
    { key: 'deal_size', header: 'Deal Size', sortable: true, render: (o) => <span className="font-bold text-emerald-700">{formatPrice(o.deal_size)}</span> },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      render: (o) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-navy-100 text-navy-800 capitalize">
          {o.stage} ({o.probability || 30}%)
        </span>
      ),
    },
    { key: 'contact', header: 'Contact', render: (o) => <span className="text-xs text-navy-600">{o.contact_name} ({o.contact_phone})</span> },
    { key: 'expected_close', header: 'Target Date', render: (o) => formatDate(o.expected_close_date || o.created_at) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500 font-medium">Manage corporate institutional sales and commercial acquisitions.</p>
        <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOppOpen(true)}>
          New Opportunity
        </Button>
      </div>

      <Card className="p-5">
        <DataTable
          columns={columns}
          rows={opps}
          loading={isLoading}
          getRowId={(o) => o.id}
          pageSize={10}
          emptyState={<EmptyState title="No opportunities found" description="No active B2B opportunities." />}
        />
      </Card>

      {/* New Opportunity Modal */}
      {newOppOpen && (
        <Modal isOpen={newOppOpen} onClose={() => setNewOppOpen(false)} title="Create B2B Opportunity">
          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Opportunity Title</label>
              <Input placeholder="e.g. IT Park 50,000 Sq.Ft Office Floor Purchase" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Company Name</label>
                <Input placeholder="Tech Mahindra Ltd" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Estimated Value (₹)</label>
                <Input type="number" value={dealSize} onChange={(e) => setDealSize(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Contact Name</label>
                <Input placeholder="Praveen Kumar" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Contact Phone</label>
                <Input placeholder="+91 98490 55667" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Stage</label>
                <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white">
                  <option value="discovery">Discovery</option>
                  <option value="proposal">Proposal</option>
                  <option value="commercials">Commercials</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Closed Won</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Win Probability ({probability}%)</label>
                <input type="range" min="10" max="95" value={probability} onChange={(e) => setProbability(Number(e.target.value))} className="w-full mt-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setNewOppOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={!title || !company || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create Opportunity
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoleDealsView({ role }: { role: RoleType }) {
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['role-b2b-deals'],
    queryFn: () => api.fetchB2BDeals(),
  });

  const columns: Column<any>[] = [
    { key: 'title', header: 'Deal Contract', render: (d) => <span className="font-bold text-navy-900">{d.title}</span> },
    { key: 'val', header: 'Contract Value', render: (d) => <span className="font-bold">{formatPrice(d.deal_value)}</span> },
    { key: 'comm', header: 'Commission (Brokerage)', render: (d) => <span className="font-bold text-emerald-700">{formatPrice(d.commission_amount || d.deal_value * 0.02)}</span> },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={d.status === 'signed' ? 'success' : 'warning'}>{d.status}</Badge> },
    { key: 'terms', header: 'Payment Terms', render: (d) => <span className="text-xs text-navy-500">{d.payment_terms}</span> },
  ];

  return (
    <Card className="p-5">
      <DataTable
        columns={columns}
        rows={deals}
        loading={isLoading}
        getRowId={(d) => d.id}
        pageSize={10}
        emptyState={<EmptyState title="No deals found" description="No active enterprise contracts." />}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FOLLOW-UPS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RoleFollowUpsView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('11:00 AM - 12:00 PM');
  const [notes, setNotes] = useState('');

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['role-follow-ups', role],
    queryFn: () => api.fetchFollowUps(role),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('role_follow_ups').delete().in('id', ids);
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} follow-up${deletedIds.length !== 1 ? 's' : ''} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-follow-ups', role] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete follow-up(s)');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createFollowUp({ contactName, phone: contactPhone, date, timeSlot, notes });
    },
    onSuccess: () => {
      addToast('success', 'Follow-up scheduled.');
      queryClient.invalidateQueries({ queryKey: ['role-follow-ups', role] });
      setScheduleModalOpen(false);
      setContactName('');
      setContactPhone('');
      setNotes('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to schedule');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.completeFollowUp(id);
    },
    onSuccess: () => {
      addToast('success', 'Marked as completed.');
      queryClient.invalidateQueries({ queryKey: ['role-follow-ups', role] });
    },
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Client / Contact',
      render: (a) => (
        <div>
          <p className="font-bold text-navy-900">{a.name || 'Client'}</p>
          <p className="text-xs text-navy-500">{a.phone || 'No phone'} {a.notes ? `• ${a.notes}` : ''}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Scheduled Date', render: (a) => formatDate(a.date || a.scheduled_at) },
    { key: 'time', header: 'Time Slot', render: (a) => <span className="font-mono text-xs">{a.time_slot || '10:00 AM'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge variant={a.status === 'completed' ? 'success' : 'warning'}>{a.status || 'Pending'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => {
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {a.status !== 'completed' && (
              <Button size="sm" variant="ghost" icon={<Check className="h-3.5 w-3.5 text-emerald-600" />} onClick={() => completeMutation.mutate(a.id)}>
                Done
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              title="Delete Follow-up Permanently"
              onClick={() => setToDelete([a.id])}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-navy-500 font-medium">Track customer inspection appointments and negotiation calls.</p>
        <Button size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setScheduleModalOpen(true)}>
          Schedule Follow-up
        </Button>
      </div>

      <Card className="p-5">
        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}
        <DataTable
          columns={columns}
          rows={followUps}
          loading={isLoading}
          getRowId={(a) => a.id}
          pageSize={10}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onSelectAll={(ids) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
              return next;
            })
          }
          emptyState={<EmptyState title="No pending follow-ups" description="All scheduled follow-up tasks are completed." />}
        />
      </Card>

      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <Modal isOpen={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule New Follow-up">
          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Contact Name</label>
              <Input placeholder="Kiran Varma" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Phone</label>
              <Input placeholder="+91 98490 12345" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Time Slot</label>
                <Input placeholder="11:00 AM - 12:00 PM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Notes</label>
              <Textarea placeholder="Specific topics or property to discuss..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={!contactName || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Save Schedule
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Follow-up' : `${toDelete.length} Follow-ups`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The scheduled follow-up will be permanently removed from the system.'
                    : `All ${toDelete.length} selected follow-up records will be permanently removed from the system.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PERFORMANCE VIEW
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 9. PERFORMANCE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RolePerformanceView({ role }: { role: RoleType }) {
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['role-performance-metrics', role],
    queryFn: () => api.fetchRolePerformanceMetrics(role),
  });

  // Real-time synchronization for performance changes
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-perf-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, role]);

  const totalLeads = metrics?.totalLeads ?? 0;
  const siteVisits = metrics?.siteVisits ?? 0;
  const conversions = metrics?.conversions ?? 0;
  const totalRevenue = metrics?.totalRevenue ?? 0;
  const stages = metrics?.stageDistribution || { new: 0, contacted: 0, qualified: 0, site_visit: 0, negotiation: 0, won: 0, lost: 0 };
  const topPerformers = metrics?.topPerformers ?? [];
  const recentConversions = metrics?.recentConversions ?? [];

  return (
    <div className="space-y-6">
      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Generated Leads"
          value={isLoading ? '...' : totalLeads}
          icon={<UserPlus className="h-5 w-5 text-navy-600" />}
          accent="navy"
        />
        <StatCard
          label="Site Visits Arranged"
          value={isLoading ? '...' : siteVisits}
          icon={<Eye className="h-5 w-5 text-gold-600" />}
          accent="gold"
        />
        <StatCard
          label="Verified Conversions"
          value={isLoading ? '...' : conversions}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          accent="success"
        />
        <StatCard
          label="Total Revenue / Volume"
          value={isLoading ? '...' : totalRevenue > 0 ? formatPrice(totalRevenue) : '₹ 0'}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          accent="success"
        />
      </div>

      {/* Conversion Efficiency Funnel */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold text-lg text-navy-900">Real-Time Performance & Conversion Metrics</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>
        <p className="text-sm text-navy-500 mb-6">Computed live from active CRM leads, appointment records, and payment transactions.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Lead-to-Visit Rate</p>
            <p className="text-3xl font-display font-bold text-slate-900 mt-2">
              {isLoading ? '...' : `${metrics?.leadToVisitRate || '0.0'}%`}
            </p>
            <p className="text-xs text-navy-500 font-medium mt-1">
              {siteVisits} of {totalLeads} total leads visited
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Visit-to-Booking Rate</p>
            <p className="text-3xl font-display font-bold text-slate-900 mt-2">
              {isLoading ? '...' : `${metrics?.visitToBookingRate || '0.0'}%`}
            </p>
            <p className="text-xs text-navy-500 font-medium mt-1">
              {conversions} of {siteVisits} visits converted
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overall Conversion</p>
            <p className="text-3xl font-display font-bold text-slate-900 mt-2">
              {isLoading ? '...' : `${metrics?.overallConversion || '0.0'}%`}
            </p>
            <p className="text-xs text-navy-500 font-medium mt-1">
              {conversions} closed won from {totalLeads} leads
            </p>
          </div>
        </div>
      </Card>

      {/* Real Pipeline Stage Breakdown */}
      <Card className="p-6">
        <h4 className="font-bold text-navy-900 text-sm mb-4">Live Pipeline Stage Breakdown</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-bold text-slate-500 uppercase">New Leads</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{stages.new}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80">
            <p className="text-[11px] font-bold text-blue-600 uppercase">Contacted</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{stages.contacted}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200/80">
            <p className="text-[11px] font-bold text-indigo-600 uppercase">Qualified</p>
            <p className="text-xl font-bold text-indigo-900 mt-1">{stages.qualified}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
            <p className="text-[11px] font-bold text-amber-600 uppercase">Site Visit</p>
            <p className="text-xl font-bold text-amber-900 mt-1">{stages.site_visit}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200/80">
            <p className="text-[11px] font-bold text-purple-600 uppercase">Negotiation</p>
            <p className="text-xl font-bold text-purple-900 mt-1">{stages.negotiation}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <p className="text-[11px] font-bold text-emerald-600 uppercase">Closed Won</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{stages.won}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80">
            <p className="text-[11px] font-bold text-rose-600 uppercase">Lost</p>
            <p className="text-xl font-bold text-rose-900 mt-1">{stages.lost}</p>
          </div>
        </div>
      </Card>

      {/* Top Performers Ranking Table */}
      {topPerformers.length > 0 && (
        <Card className="p-6">
          <h4 className="font-bold text-navy-900 text-sm mb-4">Top Performing {ROLE_META[role].label} Members</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-navy-100 text-navy-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Rank & Member</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-center">Assigned Leads</th>
                  <th className="py-2.5 px-3 text-center">Closed Won</th>
                  <th className="py-2.5 px-3 text-right">Conversion Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {topPerformers.map((agent: any, idx: number) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-full bg-slate-100 font-bold text-slate-700 text-[11px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-navy-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-navy-500">{agent.email || agent.phone || '—'}</td>
                    <td className="py-3 px-3 text-center font-semibold text-navy-800">{agent.totalLeads}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{agent.closedWon}</td>
                    <td className="py-3 px-3 text-right font-semibold text-navy-900">{agent.conversionRate}%</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {agent.totalRevenue > 0 ? formatPrice(agent.totalRevenue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent Conversions */}
      {recentConversions.length > 0 && (
        <Card className="p-6">
          <h4 className="font-bold text-navy-900 text-sm mb-4">Recent Closed Conversions</h4>
          <div className="divide-y divide-navy-100">
            {recentConversions.map((conv: any) => (
              <div key={conv.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-900 text-xs">{conv.full_name || conv.name || 'Client'}</p>
                  <p className="text-[11px] text-navy-500">{conv.property?.title || 'Property Acquisition'} • {conv.city_name || 'Hyderabad'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs text-emerald-700">
                    {conv.conversion_value ? formatPrice(conv.conversion_value) : 'Won'}
                  </span>
                  <p className="text-[10px] text-navy-400">{formatDate(conv.updated_at || conv.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. PAYOUTS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function RolePayoutsView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [payoutModalItem, setPayoutModalItem] = useState<any | null>(null);
  const [txRef, setTxRef] = useState('');

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['role-payouts', role],
    queryFn: () => api.fetchRolePayouts(role),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('payout_withdrawals').delete().in('id', ids);
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} payout record${deletedIds.length !== 1 ? 's' : ''} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-payouts', role] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete payout record(s)');
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ status }: { status: 'completed' | 'rejected' }) => {
      return api.processPayoutApproval({
        withdrawalId: payoutModalItem.id,
        status,
        txReference: txRef,
      });
    },
    onSuccess: () => {
      addToast('success', 'Payout processed successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-payouts', role] });
      setPayoutModalItem(null);
      setTxRef('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to process payout');
    },
  });

  const columns: Column<any>[] = [
    { key: 'id', header: 'Disbursement ID', render: (p) => <span className="font-mono text-xs font-bold text-navy-900">{`PAY-${p.id.slice(0, 8).toUpperCase()}`}</span> },
    { key: 'amount', header: 'Disbursement Amount', render: (p) => <span className="font-bold text-navy-900">{formatPrice(p.amount)}</span> },
    { key: 'method', header: 'Payment Method', render: (p) => <span className="text-xs text-navy-600">{p.payment_method || 'Bank Transfer'}</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge variant={p.status === 'completed' ? 'success' : 'warning'}>{p.status}</Badge> },
    { key: 'created_at', header: 'Date', render: (p) => formatDate(p.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => {
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {p.status !== 'completed' && (
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setPayoutModalItem(p)}>
                Approve Payout
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              title="Delete Record"
              onClick={() => setToDelete([p.id])}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}
        <DataTable
          columns={columns}
          rows={payouts}
          loading={isLoading}
          getRowId={(i) => i.id}
          pageSize={10}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
          }
          onSelectAll={(ids) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
              return next;
            })
          }
          emptyState={<EmptyState title="No payout records" description="No commission payouts logged." />}
        />
      </Card>

      {/* Process Payout Modal */}
      {payoutModalItem && (
        <Modal isOpen={!!payoutModalItem} onClose={() => setPayoutModalItem(null)} title="Approve & Disburse Payout">
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-semibold text-navy-900">Amount: {formatPrice(payoutModalItem.amount)}</p>
              <p className="text-xs text-navy-500">Method: {payoutModalItem.payment_method || 'NEFT Transfer'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Bank Transaction Reference (UTR / TxID)</label>
              <Input placeholder="e.g. UTR1234567890" value={txRef} onChange={(e) => setTxRef(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setPayoutModalItem(null)}>Cancel</Button>
              <Button variant="outline" className="text-red-600 border-red-200" onClick={() => processMutation.mutate({ status: 'rejected' })}>
                Reject
              </Button>
              <Button variant="primary" disabled={!txRef || processMutation.isPending} onClick={() => processMutation.mutate({ status: 'completed' })}>
                Confirm & Mark Disbursed
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Record' : `${toDelete.length} Records`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The payout disbursement record will be permanently deleted.'
                    : `All ${toDelete.length} selected payout disbursement records will be permanently deleted.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. DOCUMENTS VIEW (COMPLIANCE & VERIFICATION CENTER)
// ─────────────────────────────────────────────────────────────────────────────
function RoleDocumentsView({ role }: { role: RoleType }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [reviewDoc, setReviewDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Selection & Bulk Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    identityMatch: true,
    licenseActive: true,
    sealLegible: true,
  });

  // New Document form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('rera_certificate');
  const [newDocLicense, setNewDocLicense] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocMemberName, setNewDocMemberName] = useState('');

  const { data: docs = [], isLoading, refetch } = useQuery({
    queryKey: ['role-documents', role],
    queryFn: () => api.fetchRoleDocuments(role),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('role_compliance_documents').delete().in('id', ids);
      return ids;
    },
    onSuccess: (deletedIds) => {
      addToast('success', `${deletedIds.length} document${deletedIds.length !== 1 ? 's' : ''} permanently deleted.`);
      queryClient.invalidateQueries({ queryKey: ['role-documents', role] });
      setSelectedIds(new Set());
      setToDelete(null);
    },
    onError: (err: any) => {
      addToast('error', err?.message || 'Failed to delete document(s)');
    },
  });

  // Real-time synchronization for compliance documents & applications
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-docs-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_compliance_documents' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_applications' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builder_applications' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_applications' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, role]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('success', `Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ status }: { status: 'verified' | 'rejected' }) => {
      return api.reviewComplianceDocument({ docId: reviewDoc.id, status, rejectionReason });
    },
    onSuccess: (_, vars) => {
      addToast('success', `Document ${vars.status === 'verified' ? 'verified and approved' : 'rejected'}.`);
      queryClient.invalidateQueries({ queryKey: ['role-documents', role] });
      setReviewDoc(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update document status');
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async () => {
      return api.createComplianceDocument({
        role_type: role,
        title: newDocTitle,
        document_type: newDocType,
        license_number: newDocLicense,
        file_url: newDocUrl,
        notes: newDocNotes,
        verification_status: 'verified',
      });
    },
    onSuccess: () => {
      addToast('success', 'Compliance document recorded successfully.');
      queryClient.invalidateQueries({ queryKey: ['role-documents', role] });
      setUploadModalOpen(false);
      setNewDocTitle('');
      setNewDocLicense('');
      setNewDocUrl('');
      setNewDocNotes('');
      setNewDocMemberName('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to create document record');
    },
  });

  const stats = useMemo(() => {
    const total = docs.length;
    const verified = docs.filter((d: any) => d.verification_status === 'verified').length;
    const pending = docs.filter((d: any) => d.verification_status === 'pending' || !d.verification_status).length;
    const rejected = docs.filter((d: any) => d.verification_status === 'rejected').length;
    const complianceRate = total > 0 ? Math.round((verified / total) * 100) : 100;
    return { total, verified, pending, rejected, complianceRate };
  }, [docs]);

  const filtered = useMemo(() => {
    return docs.filter((doc: any) => {
      const matchSearch =
        !search ||
        (doc.title && doc.title.toLowerCase().includes(search.toLowerCase())) ||
        (doc.license_number && doc.license_number.toLowerCase().includes(search.toLowerCase())) ||
        (doc.user?.first_name && doc.user.first_name.toLowerCase().includes(search.toLowerCase())) ||
        (doc.user?.email && doc.user.email.toLowerCase().includes(search.toLowerCase())) ||
        (doc.user?.phone && doc.user.phone.includes(search));

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'verified' && doc.verification_status === 'verified') ||
        (statusFilter === 'pending' && (doc.verification_status === 'pending' || !doc.verification_status)) ||
        (statusFilter === 'rejected' && doc.verification_status === 'rejected');

      const matchType = typeFilter === 'all' || doc.document_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [docs, search, statusFilter, typeFilter]);

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'rera_certificate':
        return <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0"><FileCheck className="h-4.5 w-4.5" /></div>;
      case 'aadhaar_pan':
        return <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0"><ShieldCheck className="h-4.5 w-4.5" /></div>;
      case 'gst_certificate':
        return <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0"><FileText className="h-4.5 w-4.5" /></div>;
      case 'sanction_plan':
        return <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0"><Building2 className="h-4.5 w-4.5" /></div>;
      default:
        return <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0"><FileText className="h-4.5 w-4.5" /></div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Dossiers" value={stats.total} icon={<FileText className="h-5 w-5 text-navy-600" />} accent="navy" />
        <StatCard label="Verified & Valid" value={stats.verified} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} accent="success" />
        <StatCard label="Pending Review" value={stats.pending} icon={<Clock className="h-5 w-5 text-amber-600" />} accent="gold" />
        <StatCard label="Rejected / Incomplete" value={stats.rejected} icon={<XCircle className="h-5 w-5 text-rose-600" />} accent="navy" />
      </div>

      <Card className="p-5">
        <div className="space-y-3.5 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
              <input
                type="text"
                placeholder="Search document title, member name, email, license ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-navy-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-navy-200 bg-white font-semibold text-navy-700 focus:outline-none focus:border-red-500"
              >
                <option value="all">All Document Categories</option>
                <option value="rera_certificate">RERA Registration</option>
                <option value="aadhaar_pan">Identity Proof (Aadhaar / PAN)</option>
                <option value="gst_certificate">Tax & GST Filings</option>
                <option value="sanction_plan">Sanction Plans & NOC</option>
                <option value="mou_agreement">Brokerage MoU Agreements</option>
              </select>

              <div className="flex items-center border border-navy-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn('px-3 py-1.5 text-xs font-bold rounded-lg transition-all', viewMode === 'table' ? 'bg-white shadow-xs text-navy-900' : 'text-navy-500 hover:text-navy-800')}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn('px-3 py-1.5 text-xs font-bold rounded-lg transition-all', viewMode === 'cards' ? 'bg-white shadow-xs text-navy-900' : 'text-navy-500 hover:text-navy-800')}
                >
                  Cards
                </button>
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="h-3.5 w-3.5" />}
                className="cursor-pointer font-bold shadow-sm bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setUploadModalOpen(true)}
              >
                Upload Document
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button onClick={() => setStatusFilter('all')} className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-colors', statusFilter === 'all' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-navy-600 hover:bg-slate-200')}>
                All Documents ({stats.total})
              </button>
              <button onClick={() => setStatusFilter('verified')} className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-colors', statusFilter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>
                Verified & Valid ({stats.verified})
              </button>
              <button onClick={() => setStatusFilter('pending')} className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-colors', statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100')}>
                Pending Review ({stats.pending})
              </button>
              <button onClick={() => setStatusFilter('rejected')} className={cn('px-3 py-1 text-xs font-bold rounded-lg transition-colors', statusFilter === 'rejected' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100')}>
                Rejected ({stats.rejected})
              </button>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={() => setToDelete(Array.from(selectedIds))}
              onClear={() => setSelectedIds(new Set())}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <FileText className="h-12 w-12 text-navy-300 mx-auto" />
            <h4 className="font-bold text-navy-800 text-base">No Compliance Documents Found</h4>
            <Button size="sm" variant="primary" onClick={() => setUploadModalOpen(true)} className="mt-2 font-bold">+ Upload Compliance Document</Button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-navy-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-navy-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={filtered.length > 0 && filtered.every((d: any) => selectedIds.has(d.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filtered.map((d: any) => d.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-3.5 px-4">Document & Type</th>
                  <th className="py-3.5 px-4">Applicant / Member</th>
                  <th className="py-3.5 px-4">License / Reg. ID</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d: any) => {
                  const isVer = d.verification_status === 'verified';
                  const isRej = d.verification_status === 'rejected';
                  const applicantName = d.user?.first_name || d.user?.name || `${ROLE_META[role].label} Member`;
                  const initials = applicantName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          className="rounded border-navy-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          checked={selectedIds.has(d.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          {getDocTypeIcon(d.document_type)}
                          <div className="min-w-0">
                            <button
                              onClick={() => { setReviewDoc(d); setRejectionReason(d.rejection_reason || ''); }}
                              className="font-bold text-navy-900 hover:text-red-600 transition-colors text-left block text-xs"
                            >
                              {d.title}
                            </button>
                            <span className="capitalize text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{d.document_type?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-xs shrink-0 border border-slate-200">{initials}</div>
                          <div className="min-w-0">
                            <div className="font-bold text-navy-900 text-xs truncate">{applicantName}</div>
                            <p className="text-[11px] text-navy-500 truncate">{d.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                          <span>{d.license_number || 'TG-RERA / KYC'}</span>
                          <button onClick={() => copyToClipboard(d.license_number || 'TG-RERA', d.id)} className="text-slate-400 hover:text-navy-800 p-0.5">
                            {copiedId === d.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border', isVer ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isRej ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                          {isVer ? <CheckCircle2 className="h-3.5 w-3.5" /> : isRej ? <XCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {isVer ? 'Verified' : isRej ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 font-bold text-navy-800" onClick={() => { setReviewDoc(d); setRejectionReason(d.rejection_reason || ''); }}>Review</Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-600 hover:bg-red-50" title="Delete" onClick={() => setToDelete([d.id])} icon={<Trash2 className="h-3.5 w-3.5" />} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc: any) => {
              const isVer = doc.verification_status === 'verified';
              const isRej = doc.verification_status === 'rejected';
              return (
                <Card key={doc.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200/80">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="rounded border-navy-300 text-red-600 focus:ring-red-500 cursor-pointer mt-0.5"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              next.has(doc.id) ? next.delete(doc.id) : next.add(doc.id);
                              return next;
                            });
                          }}
                        />
                        {getDocTypeIcon(doc.document_type)}
                        <div className="min-w-0">
                          <h4 className="font-bold text-navy-900 text-sm leading-tight line-clamp-2">{doc.title}</h4>
                        </div>
                      </div>
                      <Badge variant={isVer ? 'success' : isRej ? 'danger' : 'warning'}>
                        {isVer ? 'Verified' : isRej ? 'Rejected' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="text-xs text-navy-700 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <p className="flex items-center gap-1.5 font-bold text-navy-900">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{doc.user?.first_name || 'Member'}</span>
                      </p>
                      {doc.user?.email && <p className="text-navy-500 truncate">{doc.user.email}</p>}
                      {doc.license_number && (
                        <p className="font-mono text-[11px] text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                          {doc.license_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-navy-400 font-medium">{formatDate(doc.created_at)}</span>
                    <div className="flex items-center gap-1.5">
                      {doc.file_url && doc.file_url !== '#' && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-red-600 font-bold hover:underline">
                          View
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs font-bold"
                        onClick={() => {
                          setReviewDoc(doc);
                          setRejectionReason(doc.rejection_reason || '');
                        }}
                      >
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-red-600 hover:bg-red-50"
                        title="Delete Document"
                        onClick={() => setToDelete([doc.id])}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4. Dedicated Interactive Document Inspection & Preview Modal */}
      {reviewDoc && (
        <Modal
          isOpen={!!reviewDoc}
          onClose={() => setReviewDoc(null)}
          title="Compliance Dossier & Document Inspection"
        >
          <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
            {/* Header Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-navy-900 text-sm leading-tight">{reviewDoc.title}</h4>
                  <span className="inline-block mt-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                    {reviewDoc.document_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <Badge variant={reviewDoc.verification_status === 'verified' ? 'success' : reviewDoc.verification_status === 'rejected' ? 'danger' : 'warning'}>
                  {reviewDoc.verification_status === 'verified' ? 'Verified & Valid' : reviewDoc.verification_status === 'rejected' ? 'Rejected' : 'Pending Review'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-navy-400 font-medium">Applicant:</span>{' '}
                  <span className="font-bold text-navy-900">{reviewDoc.user?.first_name || 'Member'}</span>
                </div>
                <div>
                  <span className="text-navy-400 font-medium">Role:</span>{' '}
                  <span className="font-semibold text-emerald-700 capitalize">{reviewDoc.user?.role || 'Agent'}</span>
                </div>
                <div>
                  <span className="text-navy-400 font-medium">Email:</span>{' '}
                  <span className="text-navy-800">{reviewDoc.user?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-navy-400 font-medium">License / ID:</span>{' '}
                  <span className="font-mono font-bold text-slate-800">{reviewDoc.license_number || 'TG-RERA / KYC'}</span>
                </div>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900/5 p-4 text-center">
              {reviewDoc.file_url && reviewDoc.file_url !== '#' ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-navy-600 flex items-center justify-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-emerald-600" /> Uploaded Document File Attached
                  </p>
                  <a
                    href={reviewDoc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-red-600 hover:bg-red-50 shadow-xs"
                  >
                    <ExternalLink className="h-4 w-4" /> Open Full Document in New Tab
                  </a>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto" />
                  <h5 className="font-bold text-navy-900 text-xs">Official Digital Real Estate Dossier</h5>
                  <p className="text-[11px] text-navy-500 max-w-sm mx-auto">
                    Registered with license identifier <span className="font-mono font-bold text-slate-800">{reviewDoc.license_number}</span> verified on RealtyNow Network.
                  </p>
                </div>
              )}
            </div>

            {/* Verification Checklist */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-navy-800 uppercase tracking-wider text-[11px]">Compliance Verification Checklist</p>
              <div className="space-y-1.5 text-xs text-navy-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.identityMatch}
                    onChange={(e) => setChecklist((c) => ({ ...c, identityMatch: e.target.checked }))}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Applicant Identity & Name Match Government Records</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.licenseActive}
                    onChange={(e) => setChecklist((c) => ({ ...c, licenseActive: e.target.checked }))}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>RERA / Tax Certificate Active and Non-Expired</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.sealLegible}
                    onChange={(e) => setChecklist((c) => ({ ...c, sealLegible: e.target.checked }))}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Authorized Government Seal and Signatures Legible</span>
                </label>
              </div>
            </div>

            {/* Rejection Reasons & Notes */}
            <div>
              <label className="block text-xs font-bold text-navy-700 mb-1">Rejection Reason (if rejecting)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Blurred / Illegible Copy', 'Expired License', 'Name Mismatch', 'Incomplete Document'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRejectionReason(tag)}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Specify if license is blurred, expired, or requires re-submission..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setReviewDoc(null)}>Cancel</Button>
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ status: 'rejected' })}
              >
                Reject Document
              </Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ status: 'verified' })}
              >
                Approve & Mark Verified
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Upload New Compliance Document Modal */}
      {uploadModalOpen && (
        <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Compliance Document">
          <div className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Document Title *</label>
              <Input
                placeholder="e.g. Telangana RERA Real Estate Broker License"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Document Category</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium"
                >
                  <option value="rera_certificate">RERA Certificate</option>
                  <option value="aadhaar_pan">Aadhaar / PAN Card</option>
                  <option value="gst_certificate">GST / Tax Filing</option>
                  <option value="sanction_plan">Sanction Plan & NOC</option>
                  <option value="mou_agreement">Brokerage MoU Agreement</option>
                  <option value="other">Other Compliance File</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-700 mb-1">Registration / License ID</label>
                <Input
                  placeholder="TG-RERA-0240001"
                  value={newDocLicense}
                  onChange={(e) => setNewDocLicense(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Member / Applicant Name</label>
              <Input
                placeholder="e.g. Suresh Varma (Lead Agent)"
                value={newDocMemberName}
                onChange={(e) => setNewDocMemberName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Document File URL (Public / Secure Storage Link)</label>
              <Input
                placeholder="https://storage.supabase.co/compliance/rera_doc.pdf"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Verification Remarks</label>
              <Textarea
                placeholder="Verified against TG-RERA portal records on 2026..."
                value={newDocNotes}
                onChange={(e) => setNewDocNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!newDocTitle || createDocMutation.isPending}
                onClick={() => createDocMutation.mutate()}
              >
                Save Compliance Document
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Document Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Document' : `${toDelete.length} Documents`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The compliance document and its verification record will be permanently deleted.'
                    : `All ${toDelete.length} selected compliance documents and their verification records will be permanently deleted.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
