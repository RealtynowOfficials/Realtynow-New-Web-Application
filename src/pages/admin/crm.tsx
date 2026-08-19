import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, CheckCircle2, XCircle, AlertTriangle,
  Search, SlidersHorizontal,
  PhoneCall, Target, Flame, RefreshCw,
  Eye, Edit2, UserCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard-layout';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { formatDate, formatPrice } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { getAdminSections } from '../portal/sections';
import { Modal, Select, Button } from '../../components/ui';
import { useToast } from '../../components/toast';
import { UnifiedLeadDetailModal } from '../../components/crm/UnifiedLeadDetailModal';
import { ProfessionalCrmTable } from '../../components/crm/ProfessionalCrmTable';

type LeadStatus = 'new' | 'assigned' | 'contacted' | 'site_visit' | 'negotiation' | 'won' | 'lost' | 'closed' | 'spam';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  lead_status: LeadStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  assigned_to: string | null;
  follow_up_at: string | null;
  contact_count: number;
  conversion_value: number | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; title: string };
  assignee?: { id: string; first_name: string; last_name: string; phone: string; email: string };
}

interface PipelineStats {
  total: number; new: number; assigned: number; contacted: number;
  site_visit: number; negotiation: number; won: number; lost: number;
  closed: number; overdue: number; total_revenue: number; conversion_rate: number;
}

const STAGE_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  new:         { label: 'New',         color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Flame className="w-4 h-4" /> },
  assigned:    { label: 'Assigned',    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: <UserCheck className="w-4 h-4" /> },
  contacted:   { label: 'Contacted',   color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   icon: <Phone className="w-4 h-4" /> },
  site_visit:  { label: 'Site Visit',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Eye className="w-4 h-4" /> },
  negotiation: { label: 'Negotiation', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <SlidersHorizontal className="w-4 h-4" /> },
  won:         { label: 'Won',         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: <CheckCircle2 className="w-4 h-4" /> },
  lost:        { label: 'Lost',        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: <XCircle className="w-4 h-4" /> },
  closed:      { label: 'Closed',      color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: <CheckCircle2 className="w-4 h-4" /> },
  spam:        { label: 'Spam',        color: 'text-gray-500',   bg: 'bg-gray-600/10',   border: 'border-gray-600/20',   icon: <XCircle className="w-4 h-4" /> },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400',    dot: 'bg-red-500' },
  high:   { label: 'High',   color: 'text-orange-400', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-500' },
  low:    { label: 'Low',    color: 'text-gray-400',   dot: 'bg-gray-500' },
};

const PIPELINE_STAGES: LeadStatus[] = ['new', 'assigned', 'contacted', 'site_visit', 'negotiation', 'won'];

// ─── Lead Card Component ──────────────────────────────────────────────────────
function LeadCard({ lead, onStatusChange, onAssign, onOpenLead }: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onAssign: (lead: Lead) => void;
  onOpenLead: (lead: Lead) => void;
}) {
  const cfg = STAGE_CONFIG[lead.lead_status];
  const prio = PRIORITY_CONFIG[lead.priority];
  const isOverdue = lead.follow_up_at && new Date(lead.follow_up_at) < new Date() && !['won','lost','closed'].includes(lead.lead_status);

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('leadId', lead.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpenLead(lead)}
      className={`bg-slate-800/60 border rounded-xl p-4 hover:bg-slate-800/90 transition-all duration-200 cursor-pointer active:cursor-grabbing group ${isOverdue ? 'border-red-500/50' : 'border-slate-700/50 hover:border-red-500/40'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate group-hover:text-red-400 transition-colors">{lead.name || 'Anonymous'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${prio.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`}></span>
              {prio.label}
            </span>
            {isOverdue && <span className="text-xs text-red-400 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Overdue</span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAssign(lead); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400"
          title="Assign Lead"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contact */}
      <div className="space-y-1.5 mb-3">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-blue-400 transition-colors"
          >
            <Phone className="w-3 h-3 shrink-0" />{lead.phone}
          </a>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <Mail className="w-3 h-3 shrink-0" />{lead.email}
          </div>
        )}
        {(lead.budget_min || lead.budget_max) && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Target className="w-3 h-3 shrink-0" />
            Budget: {lead.budget_max ? formatPrice(lead.budget_max) : 'N/A'}
          </div>
        )}
      </div>

      {/* Property */}
      {lead.property && (
        <div className="mb-3 p-2 rounded-lg bg-slate-700/40 border border-slate-600/30">
          <p className="text-xs text-slate-400 truncate">{lead.property.title}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
        <span className="text-xs text-slate-500">{lead.source || 'website'}</span>
        <span className="text-xs text-slate-500">{formatDate(lead.created_at)}</span>
      </div>

      {/* Quick status actions */}
      {lead.lead_status === 'new' && (
        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onStatusChange(lead.id, 'contacted')}
            className="flex-1 text-xs py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-colors font-medium flex items-center justify-center gap-1"
          >
            <PhoneCall className="w-3 h-3" /> Mark Contacted
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Column ──────────────────────────────────────────────────────────
function PipelineColumn({ stage, leads, onStatusChange, onAssign, onOpenLead }: {
  stage: LeadStatus;
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onAssign: (lead: Lead) => void;
  onOpenLead: (lead: Lead) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const cfg = STAGE_CONFIG[stage];

  return (
    <div 
      className={`flex-shrink-0 w-72 rounded-xl transition-colors ${isDragOver ? 'bg-slate-800/30 ring-2 ring-slate-600 border border-dashed border-slate-500' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
          onStatusChange(leadId, stage);
        }
      }}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
        <div className="flex items-center gap-2">
          <span className={cfg.color}>{cfg.icon}</span>
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {leads.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">No leads here</div>
        ) : (
          leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={onStatusChange}
              onAssign={onAssign}
              onOpenLead={onOpenLead}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main CRM Component ───────────────────────────────────────────────────────
export function AdminCRMDashboard() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const qc = useQueryClient();
  const { addToast } = useToast();

  const { data: agents = [] } = useQuery({
    queryKey: ['crm-assignable-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'agent')
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignLead = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: string; agentId: string }) => {
      const { error } = await supabase.rpc('fn_assign_lead', { p_lead_id: leadId, p_agent_id: agentId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
      addToast('success', 'Lead assigned.');
      setSelectedLead(null);
      setAssigneeId('');
    },
    onError: (err: any) => addToast('error', err.message ?? 'Could not assign lead'),
  });

  // Realtime subscription
  const realtimeCount = useRealtimeCount('enquiries');

  // Fetch pipeline stats
  const { data: stats } = useQuery<PipelineStats>({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('fn_get_crm_dashboard_stats');
      return data as PipelineStats;
    },
    refetchInterval: 30000,
  });

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['crm-leads', filterStatus, filterPriority, searchQuery, realtimeCount],
    queryFn: async () => {
      let q = supabase
        .from('enquiries')
        .select(`
          id, name, email, phone, message, lead_status, priority, source,
          budget_min, budget_max, assigned_to, follow_up_at, contact_count,
          conversion_value, created_at, updated_at,
          property:property_id(id, title, price, locality_name, city_name, property_types(name)),
          assignee:assigned_to(id, first_name, last_name, phone, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterStatus !== 'all') q = q.eq('lead_status', filterStatus);
      if (filterPriority !== 'all') q = q.eq('priority', filterPriority);
      if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Lead[]) ?? [];
    },
  });

  // Update lead status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const { error } = await supabase.rpc('fn_update_lead_status', {
        p_lead_id: id,
        p_new_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-stats'] });
    },
  });

  const leadsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.lead_status === stage);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const handleStatusChange = (id: string, status: LeadStatus) => updateStatus.mutate({ id, status });
  const handleAssign = (lead: Lead) => setSelectedLead(lead);

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  return (
    <DashboardLayout sections={adminSections} title="CRM Pipeline">
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">CRM Pipeline</h1>
          <p className="text-sm text-navy-500">Manage leads, follow-ups, and conversions across your sales pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['crm-leads'] })}
            className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex rounded-xl bg-slate-800/60 border border-slate-700/50 p-1">
            {(['kanban', 'list'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Total', value: stats?.total ?? 0,         color: 'text-white' },
          { label: 'New',   value: stats?.new ?? 0,           color: 'text-blue-400' },
          { label: 'In Progress', value: (stats?.contacted ?? 0) + (stats?.site_visit ?? 0) + (stats?.negotiation ?? 0), color: 'text-yellow-400' },
          { label: 'Won',   value: stats?.won ?? 0,           color: 'text-green-400' },
          { label: 'Lost',  value: stats?.lost ?? 0,          color: 'text-red-400' },
          { label: 'Overdue', value: stats?.overdue ?? 0,     color: 'text-orange-400' },
          { label: 'Conv. Rate', value: `${stats?.conversion_rate ?? 0}%`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">All Stages</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={leadsByStage[stage] ?? []}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
              onOpenLead={(lead) => setDetailLead(lead)}
            />
          ))}
        </div>
      )}

      {/* List / Table View */}
      {viewMode === 'list' && (
        <ProfessionalCrmTable
          leads={leads}
          isLoading={isLoading}
          sourceType="admin"
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ['crm-leads'] });
            qc.invalidateQueries({ queryKey: ['crm-stats'] });
          }}
        />
      )}

      {/* Unified Lead Detail & Stage Stepper Modal */}
      <UnifiedLeadDetailModal
        lead={detailLead}
        isOpen={!!detailLead}
        onClose={() => setDetailLead(null)}
        sourceType="admin"
        onLeadUpdated={() => {
          qc.invalidateQueries({ queryKey: ['crm-leads'] });
          qc.invalidateQueries({ queryKey: ['crm-stats'] });
        }}
      />

      <Modal
        open={!!selectedLead}
        onClose={() => { setSelectedLead(null); setAssigneeId(''); }}
        title="Assign Lead"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSelectedLead(null); setAssigneeId(''); }}>Cancel</Button>
            <Button
              disabled={!assigneeId || assignLead.isPending}
              onClick={() => selectedLead && assignLead.mutate({ leadId: selectedLead.id, agentId: assigneeId })}
            >
              {assignLead.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </>
        }
      >
        {selectedLead && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-navy-900">{selectedLead.name || 'Anonymous'}</p>
              <p className="text-xs text-navy-500">{selectedLead.phone || selectedLead.email}</p>
            </div>
            {selectedLead.assignee && (
              <p className="text-xs text-navy-500">
                Currently assigned to <span className="font-semibold text-navy-700">{selectedLead.assignee.first_name} {selectedLead.assignee.last_name}</span>
              </p>
            )}
            <Select label="Assign to agent" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Select an agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>
              ))}
            </Select>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default AdminCRMDashboard;
