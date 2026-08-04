import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck, ShieldAlert, UserPlus, Ban, RotateCcw, ScrollText, Smartphone, Monitor } from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { Card, Button, Modal, Input, Badge, Select, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import {
  getAdminSecurityStatus,
  resetAdminSecretCode,
  listAdmins,
  createAdmin,
  updateAdminStatus,
  superResetAdminSecretCode,
  listAdminLoginLogs,
  type AdminListRow,
} from '../../lib/admin-security';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  otp_login: 'Mobile OTP login',
  secret_setup: 'Secret code set up',
  secret_verify: 'Secret code verified',
  secret_reset: 'Secret code reset',
  logout: 'Logout',
};

export function AdminSecuritySettings() {
  const { t } = useLanguageContext();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({ queryKey: ['admin-security-status'], queryFn: getAdminSecurityStatus });
  const isSuperAdmin = status?.role === 'super_admin';

  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [resetting, setResetting] = useState(false);

  const submitReset = async () => {
    if (newCode.length < 6) return toast.addToast('error', 'New code must be at least 6 characters');
    if (newCode !== confirmCode) return toast.addToast('error', 'New codes do not match');
    setResetting(true);
    try {
      await resetAdminSecretCode(currentCode, newCode);
      toast.addToast('success', 'Secret code updated');
      setCurrentCode('');
      setNewCode('');
      setConfirmCode('');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Could not reset secret code');
    } finally {
      setResetting(false);
    }
  };

  const { data: adminsData } = useQuery({
    queryKey: ['admin-security-admins'],
    queryFn: listAdmins,
    enabled: isSuperAdmin,
  });
  const admins = adminsData?.admins ?? [];

  const { data: logsData } = useQuery({
    queryKey: ['admin-security-logs'],
    queryFn: () => listAdminLoginLogs(),
  });
  const logs = logsData?.logs ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [createMobile, setCreateMobile] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'super_admin'>('admin');

  const createMutation = useMutation({
    mutationFn: () => createAdmin(createMobile, createRole),
    onSuccess: () => {
      toast.addToast('success', 'Admin account created');
      setShowCreate(false);
      setCreateMobile('');
      queryClient.invalidateQueries({ queryKey: ['admin-security-admins'] });
    },
    onError: (err: Error) => toast.addToast('error', err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'active' | 'suspended' }) =>
      updateAdminStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-security-admins'] });
    },
    onError: (err: Error) => toast.addToast('error', err.message),
  });

  const [resetTarget, setResetTarget] = useState<AdminListRow | null>(null);
  const [forceCode, setForceCode] = useState('');
  const forceResetMutation = useMutation({
    mutationFn: () => superResetAdminSecretCode(resetTarget!.id, forceCode),
    onSuccess: () => {
      toast.addToast('success', `Secret code reset for ${resetTarget?.mobile}`);
      setResetTarget(null);
      setForceCode('');
      queryClient.invalidateQueries({ queryKey: ['admin-security-admins'] });
    },
    onError: (err: Error) => toast.addToast('error', err.message),
  });

  return (
    <DashboardLayout sections={getAdminSections(t)} title="Security" badge="Admin">
      <PageHeader
        title="Security Settings"
        subtitle="Manage the admin panel's Secret Access Code second factor and review login activity."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Your Role"
          value={isSuperAdmin ? 'Super Admin' : 'Admin'}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard label="Total Admins" value={isSuperAdmin ? admins.length : '—'} icon={<UserPlus className="h-5 w-5" />} accent="gold" />
        <StatCard label="Recent Activity" value={logs.length} icon={<ScrollText className="h-5 w-5" />} accent="success" />
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-red-600" />
          <h3 className="font-bold text-navy-900">Change Your Secret Access Code</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 max-w-2xl">
          <Input type="password" label="Current code" value={currentCode} onChange={(e) => setCurrentCode(e.target.value)} />
          <Input type="password" label="New code" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <Input type="password" label="Confirm new code" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} />
        </div>
        <Button className="mt-4" onClick={submitReset} loading={resetting}>
          Update Secret Code
        </Button>
      </Card>

      {isSuperAdmin && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-navy-700" />
              <h3 className="font-bold text-navy-900">Manage Admin Accounts</h3>
            </div>
            <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Add Admin
            </Button>
          </div>

          {admins.length === 0 ? (
            <EmptyState icon={<ShieldAlert className="h-8 w-8 text-navy-400" />} title="No admins yet" description="" />
          ) : (
            <div className="space-y-2">
              {admins.map((a) => {
                const locked = !!a.security?.locked_until && new Date(a.security.locked_until) > new Date();
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 p-3.5"
                  >
                    <div>
                      <p className="font-semibold text-navy-900 text-sm">
                        {[a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(' ') || a.mobile}
                      </p>
                      <p className="text-xs text-navy-400">
                        +{a.mobile} · {a.profiles?.email ?? 'no email'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.role === 'super_admin' ? 'gold' : 'default'}>{a.role}</Badge>
                      <Badge variant={a.status === 'active' ? 'success' : 'default'}>{a.status}</Badge>
                      {locked && <Badge variant="default" className="text-error-600">Locked</Badge>}
                      {!a.security && <Badge variant="default">No code set</Badge>}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<RotateCcw className="h-4 w-4" />}
                        title="Force-reset secret code"
                        onClick={() => setResetTarget(a)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className={a.status === 'active' ? 'text-error-600' : 'text-success-600'}
                        icon={<Ban className="h-4 w-4" />}
                        title={a.status === 'active' ? 'Suspend' : 'Reactivate'}
                        onClick={() =>
                          statusMutation.mutate({ id: a.id, nextStatus: a.status === 'active' ? 'suspended' : 'active' })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="h-5 w-5 text-navy-700" />
          <h3 className="font-bold text-navy-900">{isSuperAdmin ? 'All Admin Login Activity' : 'Your Login Activity'}</h3>
        </div>
        {logs.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8 text-navy-400" />} title="No activity yet" description="" />
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-navy-50/60 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {log.device?.toLowerCase().includes('mobile') ? (
                    <Smartphone className="h-3.5 w-3.5 text-navy-400 shrink-0" />
                  ) : (
                    <Monitor className="h-3.5 w-3.5 text-navy-400 shrink-0" />
                  )}
                  <span className="font-medium text-navy-800 truncate">{ACTION_LABELS[log.action] ?? log.action}</span>
                  <span className="text-navy-300">·</span>
                  <span className="text-navy-400 truncate">{log.ip}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={log.status === 'success' ? 'success' : log.status === 'locked' ? 'default' : 'default'}
                    className={log.status !== 'success' ? 'text-error-600' : ''}
                  >
                    {log.status}
                  </Badge>
                  <span className="text-xs text-navy-400">{timeAgo(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Admin Account">
        <div className="space-y-3">
          <Input
            label="Mobile number"
            value={createMobile}
            onChange={(e) => setCreateMobile(e.target.value)}
            placeholder="10-digit mobile"
          />
          <Select label="Role" value={createRole} onChange={(e) => setCreateRole(e.target.value as 'admin' | 'super_admin')}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </Select>
          <p className="text-xs text-navy-400">
            They'll sign in with mobile OTP as usual, then set up their own Secret Access Code on first access.
          </p>
          <Button className="w-full" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Create Admin
          </Button>
        </div>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Force-reset secret code for ${resetTarget?.mobile}`}>
        <div className="space-y-3">
          <Input type="password" label="New secret code" value={forceCode} onChange={(e) => setForceCode(e.target.value)} />
          <Button className="w-full" loading={forceResetMutation.isPending} onClick={() => forceResetMutation.mutate()}>
            Reset Their Code
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
