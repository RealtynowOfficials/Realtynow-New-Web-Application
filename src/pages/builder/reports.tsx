import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  IndianRupee,
  Wallet,
  Percent,
  ScrollText,
  Download,
  Eye,
  LayoutList,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { Card, Button, Modal, Select, Badge, EmptyState } from '../../components/ui';
import { DataTable, type Column } from '../../components/data-table';
import { exportToCsv, formatDate, formatDateTime, formatPrice, cn } from '../../lib/utils';
import type { AuditLog } from '../../lib/types';

type ReportType = 'units' | 'leads' | 'bookings' | 'payments';

interface UnitRow {
  id: string;
  unit_number: string;
  type: string;
  status: string;
  project_name: string;
  tower_name: string;
}
interface LeadRow {
  id: string;
  name: string;
  status: string;
  project_name: string;
  created_at: string;
}
interface BookingRow {
  id: string;
  unit_number: string;
  amount: number | null;
  status: string;
  booking_date: string;
}
interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
}

export function BuilderReports() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);

  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const [reportType, setReportType] = useState<ReportType>('units');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-reports-overview', user?.id],
    queryFn: async () => {
      const { data: projects, error: pErr } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id);
      if (pErr) throw pErr;
      const projectIds = (projects ?? []).map((p) => p.id);
      const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

      const { data: towers } = projectIds.length
        ? await supabase.from('builder_towers').select('id, name, project_id').in('project_id', projectIds)
        : { data: [] as { id: string; name: string; project_id: string }[] };
      const towerIds = (towers ?? []).map((tw) => tw.id);
      const towerMap = new Map((towers ?? []).map((tw) => [tw.id, tw]));

      const { data: units } = towerIds.length
        ? await supabase.from('builder_units').select('id, unit_number, type, status, tower_id').in('tower_id', towerIds)
        : { data: [] as { id: string; unit_number: string; type: string; status: string; tower_id: string }[] };
      const unitIds = (units ?? []).map((u) => u.id);
      const unitMap = new Map((units ?? []).map((u) => [u.id, u]));

      const { data: bookings } = unitIds.length
        ? await supabase
            .from('builder_bookings')
            .select('id, unit_id, amount, status, booking_date')
            .in('unit_id', unitIds)
        : { data: [] as { id: string; unit_id: string; amount: number | null; status: string; booking_date: string }[] };
      const bookingIds = (bookings ?? []).map((b) => b.id);

      const { data: payments } = bookingIds.length
        ? await supabase
            .from('builder_payments')
            .select('id, booking_id, amount, status, due_date, paid_date')
            .in('booking_id', bookingIds)
        : {
            data: [] as {
              id: string;
              booking_id: string;
              amount: number;
              status: string;
              due_date: string | null;
              paid_date: string | null;
            }[],
          };

      const { data: leads } = await supabase
        .from('builder_leads')
        .select('id, name, status, project_id, created_at')
        .eq('builder_id', user!.id);

      const unitRows: UnitRow[] = (units ?? []).map((u) => {
        const tw = towerMap.get(u.tower_id);
        return {
          id: u.id,
          unit_number: u.unit_number,
          type: u.type,
          status: u.status,
          project_name: tw ? (projectMap.get(tw.project_id) ?? '—') : '—',
          tower_name: tw?.name ?? '—',
        };
      });

      const leadRows: LeadRow[] = (leads ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        project_name: l.project_id ? (projectMap.get(l.project_id) ?? '—') : '—',
        created_at: l.created_at,
      }));

      const bookingRows: BookingRow[] = (bookings ?? []).map((b) => ({
        id: b.id,
        unit_number: unitMap.get(b.unit_id)?.unit_number ?? '—',
        amount: b.amount,
        status: b.status,
        booking_date: b.booking_date,
      }));

      const paymentRows: PaymentRow[] = (payments ?? []).map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        due_date: p.due_date,
        paid_date: p.paid_date,
      }));

      const totalSalesValue = bookingRows
        .filter((b) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount ?? 0), 0);
      const collections = paymentRows.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const outstanding = paymentRows
        .filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
        .reduce((sum, p) => sum + p.amount, 0);
      const wonLeads = leadRows.filter((l) => l.status === 'won').length;
      const conversionRate = leadRows.length ? Math.round((wonLeads / leadRows.length) * 1000) / 10 : 0;

      const unitsByStatus = unitRows.reduce<Record<string, number>>((acc, u) => {
        acc[u.status] = (acc[u.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        unitRows,
        leadRows,
        bookingRows,
        paymentRows,
        totalSalesValue,
        collections,
        outstanding,
        conversionRate,
        unitsByStatus,
        totalLeads: leadRows.length,
      };
    },
    enabled: !!user && tab === 'overview',
  });

  const { data: logs, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ['builder-reports-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
    enabled: !!user && tab === 'activity',
  });

  const entities = useMemo(
    () => Array.from(new Set((logs ?? []).map((l) => l.entity).filter((e): e is string => !!e))),
    [logs],
  );
  const actions = useMemo(() => Array.from(new Set((logs ?? []).map((l) => l.action))), [logs]);

  const filteredLogs = useMemo(() => {
    return (logs ?? []).filter(
      (l) => (!entityFilter || l.entity === entityFilter) && (!actionFilter || l.action === actionFilter),
    );
  }, [logs, entityFilter, actionFilter]);

  const logColumns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (l) => <span className="text-xs text-navy-600">{formatDateTime(l.created_at)}</span>,
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
    { key: 'entity', header: 'Entity', sortable: true, render: (l) => <span className="text-sm text-navy-700">{l.entity ?? '—'}</span> },
    {
      key: 'entity_id',
      header: 'Entity ID',
      render: (l) => <span className="font-mono text-xs text-navy-400">{l.entity_id?.slice(0, 8) ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => setSelectedLog(l)} />
      ),
    },
  ];

  const exportActivityCsv = () => {
    exportToCsv('builder-activity-log', filteredLogs as unknown as Record<string, unknown>[], [
      { key: 'created_at', label: 'Timestamp' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Entity' },
      { key: 'entity_id', label: 'Entity ID' },
      { key: 'metadata', label: 'Metadata' },
    ]);
  };

  const unitColumns: Column<UnitRow>[] = [
    { key: 'unit_number', header: 'Unit', sortable: true },
    { key: 'type', header: 'Type' },
    { key: 'project_name', header: 'Project' },
    { key: 'tower_name', header: 'Tower' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.status === 'sold' ? 'success' : u.status === 'booked' ? 'warning' : 'default'} className="capitalize">
          {u.status}
        </Badge>
      ),
    },
  ];

  const leadColumns: Column<LeadRow>[] = [
    { key: 'name', header: 'Lead', sortable: true },
    { key: 'project_name', header: 'Project' },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Badge variant={l.status === 'won' ? 'success' : l.status === 'lost' ? 'error' : 'info'} className="capitalize">
          {l.status}
        </Badge>
      ),
    },
    { key: 'created_at', header: 'Created', sortable: true, render: (l) => formatDate(l.created_at) },
  ];

  const bookingColumns: Column<BookingRow>[] = [
    { key: 'unit_number', header: 'Unit', sortable: true },
    { key: 'amount', header: 'Amount', render: (b) => formatPrice(b.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <Badge variant={b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'error' : 'info'} className="capitalize">
          {b.status}
        </Badge>
      ),
    },
    { key: 'booking_date', header: 'Booking Date', sortable: true, render: (b) => formatDate(b.booking_date) },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    { key: 'amount', header: 'Amount', render: (p) => formatPrice(p.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <Badge variant={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'error' : 'warning'} className="capitalize">
          {p.status}
        </Badge>
      ),
    },
    { key: 'due_date', header: 'Due Date', render: (p) => formatDate(p.due_date) },
    { key: 'paid_date', header: 'Paid Date', render: (p) => formatDate(p.paid_date) },
  ];

  const reportConfig = useMemo(() => {
    switch (reportType) {
      case 'leads':
        return {
          rows: data?.leadRows ?? [],
          csvColumns: [
            { key: 'name', label: 'Lead' },
            { key: 'project_name', label: 'Project' },
            { key: 'status', label: 'Status' },
            { key: 'created_at', label: 'Created' },
          ],
        };
      case 'bookings':
        return {
          rows: data?.bookingRows ?? [],
          csvColumns: [
            { key: 'unit_number', label: 'Unit' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'booking_date', label: 'Booking Date' },
          ],
        };
      case 'payments':
        return {
          rows: data?.paymentRows ?? [],
          csvColumns: [
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'due_date', label: 'Due Date' },
            { key: 'paid_date', label: 'Paid Date' },
          ],
        };
      default:
        return {
          rows: data?.unitRows ?? [],
          csvColumns: [
            { key: 'unit_number', label: 'Unit' },
            { key: 'type', label: 'Type' },
            { key: 'project_name', label: 'Project' },
            { key: 'tower_name', label: 'Tower' },
            { key: 'status', label: 'Status' },
          ],
        };
    }
  }, [reportType, data]);

  const exportReportCsv = () => {
    exportToCsv(`builder-report-${reportType}`, reportConfig.rows as unknown as Record<string, unknown>[], reportConfig.csvColumns);
  };

  return (
    <DashboardLayout sections={builderSections} title="Reports" badge="Builder">
      <PageHeader title="Reports" subtitle="Portfolio performance summary and your activity history." />

      <div className="mb-6 flex items-center gap-1 bg-navy-100/70 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('overview')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all',
            tab === 'overview' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600 hover:text-navy-900',
          )}
        >
          <BarChart3 className="h-4 w-4" /> Overview
        </button>
        <button
          onClick={() => setTab('activity')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all',
            tab === 'activity' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600 hover:text-navy-900',
          )}
        >
          <ScrollText className="h-4 w-4" /> Activity Log
        </button>
      </div>

      {tab === 'overview' ? (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
              {error instanceof Error ? error.message : 'Failed to load report data'}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              label="Total Sales Value"
              value={formatPrice(data?.totalSalesValue ?? 0)}
              icon={<IndianRupee className="h-5 w-5" />}
              accent="navy"
            />
            <StatCard
              label="Collections"
              value={formatPrice(data?.collections ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              accent="success"
            />
            <StatCard
              label="Outstanding"
              value={formatPrice(data?.outstanding ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              accent="error"
            />
            <StatCard
              label="Lead Conversion Rate"
              value={`${data?.conversionRate ?? 0}%`}
              icon={<Percent className="h-5 w-5" />}
              accent="gold"
            />
          </div>

          <Card className="p-4 mb-6">
            <h3 className="font-display text-sm font-semibold text-navy-900 mb-3">Units by Status</h3>
            {Object.keys(data?.unitsByStatus ?? {}).length ? (
              <div className="flex flex-wrap gap-3">
                {Object.entries(data?.unitsByStatus ?? {}).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 rounded-xl border border-navy-100 px-3 py-2">
                    <Badge variant={status === 'sold' ? 'success' : status === 'booked' ? 'warning' : 'default'} className="capitalize">
                      {status}
                    </Badge>
                    <span className="font-bold text-navy-900">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy-400">No units found across your projects yet.</p>
            )}
          </Card>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-navy-400" />
              <Select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-auto">
                <option value="units">Units</option>
                <option value="leads">Leads</option>
                <option value="bookings">Bookings</option>
                <option value="payments">Payments</option>
              </Select>
            </div>
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportReportCsv}>
              Export CSV
            </Button>
          </div>

          {reportType === 'units' && (
            <DataTable
              columns={unitColumns}
              rows={data?.unitRows ?? []}
              loading={isLoading}
              getRowId={(r) => r.id}
              searchable={false}
              dateFilterable={false}
              emptyState={
                <div className="px-4 py-10 text-center text-sm text-navy-400">No units found for this report.</div>
              }
            />
          )}
          {reportType === 'leads' && (
            <DataTable
              columns={leadColumns}
              rows={data?.leadRows ?? []}
              loading={isLoading}
              getRowId={(r) => r.id}
              searchable={false}
              dateFilterable={false}
              emptyState={
                <div className="px-4 py-10 text-center text-sm text-navy-400">No leads found for this report.</div>
              }
            />
          )}
          {reportType === 'bookings' && (
            <DataTable
              columns={bookingColumns}
              rows={data?.bookingRows ?? []}
              loading={isLoading}
              getRowId={(r) => r.id}
              searchable={false}
              dateFilterable={false}
              emptyState={
                <div className="px-4 py-10 text-center text-sm text-navy-400">No bookings found for this report.</div>
              }
            />
          )}
          {reportType === 'payments' && (
            <DataTable
              columns={paymentColumns}
              rows={data?.paymentRows ?? []}
              loading={isLoading}
              getRowId={(r) => r.id}
              searchable={false}
              dateFilterable={false}
              emptyState={
                <div className="px-4 py-10 text-center text-sm text-navy-400">No payments found for this report.</div>
              }
            />
          )}
        </>
      ) : (
        <>
          {logsError && (
            <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
              {logsError instanceof Error ? logsError.message : 'Failed to load activity log'}
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="w-auto">
                <option value="">All entities</option>
                {entities.map((en) => (
                  <option key={en} value={en}>
                    {en}
                  </option>
                ))}
              </Select>
              <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-auto">
                <option value="">All actions</option>
                {actions.map((ac) => (
                  <option key={ac} value={ac}>
                    {ac}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportActivityCsv}>
              Export CSV
            </Button>
          </div>

          {!logsLoading && filteredLogs.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ScrollText className="h-6 w-6" />}
                title="No activity yet"
                description="Actions you take across the Builder Portal will be logged here."
              />
            </Card>
          ) : (
            <DataTable
              columns={logColumns}
              rows={filteredLogs}
              loading={logsLoading}
              getRowId={(l) => l.id}
              searchable={false}
              dateFilterable={false}
            />
          )}
        </>
      )}

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
                <p className="text-xs text-navy-500">Action</p>
                <p className="text-sm font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Entity</p>
                <p className="text-sm font-medium">{selectedLog.entity ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Entity ID</p>
                <p className="text-sm font-mono">{selectedLog.entity_id ?? '—'}</p>
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
