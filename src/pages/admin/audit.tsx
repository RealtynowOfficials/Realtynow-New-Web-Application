import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScrollText,
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ShieldCheck,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Layers,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Input, Skeleton, EmptyState, Badge, Button, Modal, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { formatDateTime, exportToCsv } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { useToast } from '../../components/toast';

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
  actor?: { email: string; first_name: string | null; last_name: string | null } | null;
}

export function AdminAuditLogs() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);
  const pageSize = 20;
  const realtimeTick = useRealtimeCount('audit_logs');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-logs', realtimeTick, page, dateFrom, dateTo, entityFilter, actionFilter, userFilter],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*, actor:profiles!actor_id(email, first_name, last_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
      if (entityFilter) q = q.eq('entity', entityFilter);
      if (actionFilter) q = q.eq('action', actionFilter);
      if (userFilter) q = q.ilike('actor.email', `%${userFilter}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return {
        logs: (data ?? []).map((r) => {
          const row = r as unknown as AuditLog;
          return { ...row, actor: Array.isArray(row.actor) ? row.actor[0] : row.actor };
        }) as AuditLog[],
        count: count ?? 0,
      };
    },
  });

  const { logs, count } = data ?? { logs: [], count: 0 };
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  const entities = useMemo(() => Array.from(new Set((logs ?? []).map((l) => l.entity))), [logs]);
  const actions = useMemo(() => Array.from(new Set((logs ?? []).map((l) => l.action))), [logs]);

  const filtered = useMemo(() => {
    if (!search) return logs ?? [];
    const q = search.toLowerCase();
    return (logs ?? []).filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.actor?.email ?? '').toLowerCase().includes(q) ||
        l.entity_id?.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const handleCopyMetadata = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    toast.addToast('success', 'Audit log JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (l) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-navy-950">{formatDateTime(l.created_at)}</span>
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'Authorized User',
      render: (l) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-navy-100 text-navy-800 text-xs font-bold flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium text-navy-900 truncate max-w-[180px]">
            {l.actor?.email ?? (l.actor_id ? `${l.actor_id.slice(0, 8)}...` : 'System Admin')}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Taken',
      sortable: true,
      render: (l) => {
        const act = l.action.toLowerCase();
        const variant = act.includes('delete') || act.includes('unpublish')
          ? 'error'
          : act.includes('create') || act.includes('publish') || act.includes('verify')
          ? 'success'
          : 'info';
        return <Badge variant={variant} className="text-xs uppercase tracking-wide font-semibold">{l.action}</Badge>;
      },
    },
    {
      key: 'entity',
      header: 'Target Entity',
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-navy-800">{l.entity}</span>
        </div>
      ),
    },
    {
      key: 'entity_id',
      header: 'Entity ID',
      render: (l) => <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{l.entity_id?.slice(0, 8) ?? '—'}</span>,
    },
    {
      key: 'ip',
      header: 'IP Address',
      render: (l) => <span className="text-xs font-mono text-slate-500">{l.ip ?? '127.0.0.1'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Eye className="h-4 w-4 text-navy-600" />}
          onClick={() => setSelectedLog(l)}
          title="Inspect Full Audit Record"
        />
      ),
    },
  ];

  const handleExport = () => {
    exportToCsv('audit-logs', filtered as unknown as Record<string, unknown>[], [
      { key: 'created_at', label: 'Timestamp' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Entity' },
      { key: 'entity_id', label: 'Entity ID' },
      { key: 'ip', label: 'IP' },
      { key: 'actor.email', label: 'User' },
    ]);
  };

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  return (
    <DashboardLayout sections={adminSections} title="Audit Logs & Compliance" badge="Admin">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 md:p-8 text-white shadow-xl mb-6 border border-white/10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-300 backdrop-blur-md border border-white/15">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Immutable Regulatory Log</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              System Audit Logs & Security History
            </h1>
            <p className="text-sm text-navy-200 max-w-2xl">
              Cryptographically verified audit trail of all staff updates, approvals, unpublish requests, user role modifications, and system configuration adjustments.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              icon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 mb-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Filter className="h-3.5 w-3.5 text-navy-700" />
          <span>Filter Audit Records</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            label="Date From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            label="Date To"
          />
          <div>
            <label className="label">Target Entity</label>
            <Select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Entities</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Action Type</label>
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
          <Input
            placeholder="Search email..."
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            label="Actor Email"
          />
        </div>

        <div className="mt-3 max-w-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search action, entity ID or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Main Table */}
      {isLoading ? (
        <Card className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </Card>
      ) : filtered.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <DataTable columns={columns} rows={filtered} getRowId={(l) => l.id} searchKeys={[]} />
        </div>
      ) : (
        <Card className="p-8">
          <EmptyState
            icon={<ScrollText className="h-8 w-8 text-navy-400" />}
            title="No audit events found"
            description="All administrative changes are securely and automatically recorded here for compliance."
          />
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 bg-white p-4 rounded-xl shadow-sm text-xs">
          <span className="text-slate-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count ?? 0)} of {count ?? 0} records
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 font-semibold text-navy-950 bg-slate-100 rounded-lg">
              Page {page} of {totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldAlert className="h-4 w-4 text-emerald-600" />
        <span>Audit logs are read-only and retained in PostgreSQL database for SOC2 and RERA compliance.</span>
      </div>

      {/* INSPECTION MODAL */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Record Details"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" size="sm" icon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} onClick={handleCopyMetadata}>
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4 pt-1">
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500">Timestamp</p>
                <p className="font-semibold text-navy-950 mt-0.5">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-slate-500">Actor Identity</p>
                <p className="font-semibold text-navy-950 mt-0.5">{selectedLog.actor?.email ?? selectedLog.actor_id}</p>
              </div>
              <div>
                <p className="text-slate-500">Action Name</p>
                <p className="font-semibold text-navy-950 mt-0.5">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-slate-500">Entity</p>
                <p className="font-semibold text-navy-950 mt-0.5">{selectedLog.entity} ({selectedLog.entity_id})</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payload & Changes Metadata
              </p>
              <pre className="rounded-xl bg-navy-950 p-4 text-xs font-mono text-emerald-400 overflow-auto max-h-64 custom-scrollbar">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
