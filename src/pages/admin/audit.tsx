import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search, ShieldAlert, ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Input, Skeleton, EmptyState, Badge, Button, Modal, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { formatDateTime, exportToCsv } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;
  const realtimeTick = useRealtimeCount('audit_logs');

  const { data, isLoading } = useQuery({
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
        l.entity_id.toLowerCase().includes(q),
    );
  }, [logs, search]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (l) => <span className="text-xs text-navy-600">{formatDateTime(l.created_at)}</span>,
    },
    {
      key: 'actor',
      header: 'User',
      render: (l) => (
        <span className="text-sm font-medium text-navy-900">{l.actor?.email ?? l.actor_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (l) => (
        <Badge variant={l.action.includes('delete') ? 'error' : l.action.includes('create') ? 'success' : 'info'}>
          {l.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      sortable: true,
      render: (l) => <span className="text-sm text-navy-700">{l.entity}</span>,
    },
    {
      key: 'entity_id',
      header: 'Entity ID',
      render: (l) => <span className="font-mono text-xs text-navy-400">{l.entity_id?.slice(0, 8) ?? '—'}</span>,
    },
    { key: 'ip', header: 'IP', render: (l) => <span className="text-xs text-navy-500">{l.ip ?? '—'}</span> },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => setSelectedLog(l)} />
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
    <DashboardLayout sections={adminSections} title={t('dashboard:auditLogs', 'Audit Logs')} badge="Admin">
      <PageHeader
        title="Audit logs"
        subtitle="Track all administrative actions for security and compliance."
        action={
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          placeholder="Date from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          placeholder="Date to"
        />
        <Select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <Select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filter by user email..."
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search action, entity, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {isLoading ? (
        <Card className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </Card>
      ) : filtered.length > 0 ? (
        <DataTable columns={columns} rows={filtered} getRowId={(l) => l.id} searchKeys={[]} />
      ) : (
        <Card>
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title="No audit logs"
            description="Administrative actions will be logged here for compliance."
          />
        </Card>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
          <span className="text-navy-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count ?? 0)} of {count ?? 0}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-navy-600">
              {page} / {totalPages}
            </span>
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-navy-400">
        <ShieldAlert className="h-4 w-4" /> Audit logs are read-only and retained for security compliance.
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log detail"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-navy-500">Timestamp</p>
                <p className="text-sm font-medium">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">User</p>
                <p className="text-sm font-medium">{selectedLog.actor?.email ?? selectedLog.actor_id}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Action</p>
                <p className="text-sm font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Entity</p>
                <p className="text-sm font-medium">{selectedLog.entity}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Entity ID</p>
                <p className="text-sm font-mono">{selectedLog.entity_id}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">IP</p>
                <p className="text-sm font-medium">{selectedLog.ip ?? '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-navy-500">Metadata</p>
              <pre className="mt-1 rounded-lg bg-navy-50 p-3 text-xs overflow-auto max-h-60">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
