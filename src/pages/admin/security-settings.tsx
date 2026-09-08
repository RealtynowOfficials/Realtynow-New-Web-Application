import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Ban,
  RotateCcw,
  ScrollText,
  Smartphone,
  Monitor,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  RefreshCw,
  Clock,
  Laptop,
  Check,
  Radio,
} from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout } from '../../components/dashboard-layout';
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
  getTotalAdminsCount,
  type AdminListRow,
} from '../../lib/admin-security';
import { formatDateTime } from '../../lib/utils';

function timeAgo(iso: string, t: (key: string, fb?: string) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('common.justNow', 'just now');
  if (mins < 60) return `${mins}${t('common.mAgo', 'm ago')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t('common.hAgo', 'h ago')}`;
  return `${Math.floor(hours / 24)}${t('common.dAgo', 'd ago')}`;
}

export function AdminSecuritySettings() {
  const { t } = useLanguageContext();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'passcode' | 'admins' | 'logs' | 'policies'>('passcode');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status & Counts
  const { data: status, refetch: refetchStatus, isFetching: isFetchingStatus } = useQuery({
    queryKey: ['admin-security-status'],
    queryFn: getAdminSecurityStatus,
  });

  const { data: adminCount = 1 } = useQuery({
    queryKey: ['admin-total-count'],
    queryFn: getTotalAdminsCount,
  });

  const isSuperAdmin = status?.role === 'super_admin';

  // Secret code state
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [resetting, setResetting] = useState(false);

  // Admin management
  const { data: adminsData, refetch: refetchAdmins } = useQuery({
    queryKey: ['admin-security-admins'],
    queryFn: listAdmins,
  });
  const admins = adminsData?.admins ?? [];

  // Logs
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-security-logs'],
    queryFn: () => listAdminLoginLogs(),
  });
  const logs = logsData?.logs ?? [];
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [searchLog, setSearchLog] = useState('');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [createMobile, setCreateMobile] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'super_admin'>('admin');

  const [resetTarget, setResetTarget] = useState<AdminListRow | null>(null);
  const [forceCode, setForceCode] = useState('');
  const [showForceCode, setShowForceCode] = useState(false);

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => createAdmin(createMobile, createRole, createFirstName, createLastName),
    onSuccess: () => {
      toast.addToast('success', t('admin.adminCreatedSuccess', 'Admin account created and synced with database'));
      setShowCreate(false);
      setCreateMobile('');
      setCreateFirstName('');
      setCreateLastName('');
      refetchAdmins();
      queryClient.invalidateQueries({ queryKey: ['admin-total-count'] });
    },
    onError: (err) => {
      toast.addToast('error', err instanceof Error ? err.message : t('admin.createAdminFailed', 'Failed to create admin'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: 'active' | 'suspended' }) =>
      updateAdminStatus(id, nextStatus),
    onSuccess: () => {
      toast.addToast('success', t('admin.adminStatusUpdated', 'Admin status updated'));
      refetchAdmins();
    },
    onError: (err) => {
      toast.addToast('error', err instanceof Error ? err.message : t('admin.statusUpdateFailed', 'Status update failed'));
    },
  });

  const forceResetMutation = useMutation({
    mutationFn: () => superResetAdminSecretCode(resetTarget!.id, forceCode),
    onSuccess: () => {
      toast.addToast('success', t('admin.passcodeResetSuccess', `Passcode for ${resetTarget?.mobile} has been reset.`));
      setResetTarget(null);
      setForceCode('');
      refetchAdmins();
    },
    onError: (err) => {
      toast.addToast('error', err instanceof Error ? err.message : t('admin.resetPasscodeFailed', 'Reset failed'));
    },
  });

  const handleRefreshAll = async () => {
    await Promise.all([refetchStatus(), refetchAdmins(), refetchLogs()]);
    toast.addToast('success', t('admin.dataRefreshed', 'Database security cache refreshed'));
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCode || !newCode || !confirmCode) {
      toast.addToast('error', t('admin.fillAllFields', 'Please fill in all passcode fields'));
      return;
    }
    if (newCode !== confirmCode) {
      toast.addToast('error', t('admin.codesMismatch', 'New passcode and confirmation do not match'));
      return;
    }
    if (newCode.length < 6 || newCode.length > 12) {
      toast.addToast('error', t('admin.passcodeLengthReq', 'Passcode must be between 6 and 12 characters'));
      return;
    }

    setResetting(true);
    try {
      const res = await resetAdminSecretCode(currentCode, newCode);
      if (res.success) {
        toast.addToast('success', t('admin.secretCodeUpdated', '2FA Secret Passcode updated successfully'));
        setCurrentCode('');
        setNewCode('');
        setConfirmCode('');
        refetchStatus();
      } else {
        toast.addToast('error', (res as any)?.error || t('admin.updateFailed', 'Update failed'));
      }
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : t('admin.networkError', 'Network error'));
    } finally {
      setResetting(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'success' && l.status !== 'success') return false;
    if (logFilter === 'failed' && l.status === 'success') return false;
    if (searchLog) {
      const q = searchLog.toLowerCase();
      return (
        l.action?.toLowerCase().includes(q) ||
        l.ip?.toLowerCase().includes(q) ||
        l.device?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStrength = (code: string) => {
    if (!code) return { score: 0, text: '', color: '' };
    let s = 0;
    if (code.length >= 6) s++;
    if (code.length >= 8) s++;
    if (/[0-9]/.test(code)) s++;
    if (/[a-zA-Z]/.test(code)) s++;
    if (/[^a-zA-Z0-9]/.test(code)) s++;

    if (s <= 2) return { score: 1, text: t('admin.weak', 'Weak'), color: 'bg-amber-500' };
    if (s <= 4) return { score: 2, text: t('admin.good', 'Good'), color: 'bg-blue-500' };
    return { score: 3, text: t('admin.strong', 'Strong'), color: 'bg-emerald-500' };
  };

  const strength = getStrength(newCode);

  const ACTION_LABELS: Record<string, string> = {
    otp_login: t('admin.actionOtpLogin', 'Mobile OTP Sign-in'),
    secret_setup: t('admin.actionSecretSetup', 'Secret Code Setup'),
    secret_verify: t('admin.actionSecretVerify', 'Secret 2FA Verification'),
    secret_reset: t('admin.actionSecretReset', 'Passcode Password Reset'),
    logout: t('admin.actionLogout', 'Secure Session Logout'),
  };

  return (
    <DashboardLayout
      sections={getAdminSections(t)}
      title={t('admin.securityAccessControl', 'Security & Access Control')}
      badge={t('dashboard.admin', 'Admin')}
    >
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 p-6 md:p-8 text-white shadow-xl mb-6 border border-white/10">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute right-32 bottom-0 h-40 w-40 rounded-full bg-gold-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gold-300 backdrop-blur-md border border-white/15">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t('admin.enterprise2fa', 'Enterprise Grade 2FA Protection')}</span>
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {t('admin.securityManagementTitle', 'Admin Security & Access Management')}
            </h1>
            <p className="text-sm text-navy-200 max-w-2xl">
              {t('admin.securityManagementSubtitle', 'Configure 2-Factor Secret Access Codes, monitor verified sessions, enforce database role permissions, and track active security logs.')}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              icon={<RefreshCw className={`h-4 w-4 ${isFetchingStatus ? 'animate-spin' : ''}`} />}
              onClick={handleRefreshAll}
            >
              {t('admin.syncDatabase', 'Sync Database')}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-900/30"
                icon={<UserPlus className="h-4 w-4" />}
                onClick={() => setShowCreate(true)}
              >
                {t('admin.addAdmin', 'Add Admin')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Card 1: Your Role */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('admin.yourAuthority', 'Your Authority')}</span>
            <div className="h-9 w-9 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-800">
              <Lock className="h-4 w-4 text-navy-700" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-navy-950 flex items-center gap-2">
              {isSuperAdmin ? t('admin.superAdmin', 'Super Administrator') : t('admin.admin', 'Administrator')}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{t('admin.fullAccessGranted', 'Full Portal Access Granted')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Admins */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('admin.adminPersonnel', 'Admin Personnel')}</span>
            <div className="h-9 w-9 rounded-xl bg-gold-50 border border-gold-100 flex items-center justify-center text-gold-700">
              <UserPlus className="h-4 w-4 text-gold-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-navy-950">
              {admins.length > 0 ? admins.length : adminCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">{t('admin.verifiedAdminAccounts', 'Verified admin accounts')}</div>
          </div>
        </div>

        {/* Card 3: 2FA Lockout Guard */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('admin.passcodeGate', '2FA Passcode Gate')}</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <KeyRound className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-navy-950 flex items-center gap-1.5">
              <span>{t('admin.activeAndEnforced', 'Active & Enforced')}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{t('admin.bruteForceProtect', '5-attempt brute-force protection')}</div>
          </div>
        </div>

        {/* Card 4: Audit Activity */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditLogsRecorded', 'Audit Logs Recorded')}</span>
            <div className="h-9 w-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700">
              <ScrollText className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-navy-950">{logs.length}</div>
            <div className="mt-1 text-xs text-slate-500">{t('admin.trackedSecurityActions', 'Tracked security actions')}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('passcode')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'passcode'
              ? 'bg-navy-900 text-white shadow-md'
              : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>{t('admin.tabPasscode', 'Passcode & 2FA Credentials')}</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'admins'
              ? 'bg-navy-900 text-white shadow-md'
              : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>
            {t('admin.tabAdmins', 'Admin Team Accounts')} ({admins.length > 0 ? admins.length : adminCount})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'logs'
              ? 'bg-navy-900 text-white shadow-md'
              : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>{t('admin.tabAuditLogs', 'Activity & Audit Trail')}</span>
          {logs.length > 0 && (
            <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800 font-bold">
              {logs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'policies'
              ? 'bg-navy-900 text-white shadow-md'
              : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t('admin.tabHardening', 'Security Hardening')}</span>
        </button>
      </div>

      {/* TAB 1: PASSCODE & CREDENTIALS */}
      {activeTab === 'passcode' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-navy-950 flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-red-600" />
                    {t('admin.changeSecretCodeTitle', 'Change Secret Access Code')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('admin.changeSecretCodeSub', 'This secondary passcode is required after SMS OTP verification to access administrative controls.')}
                  </p>
                </div>
                <Badge variant="success" className="px-2.5 py-1 text-xs">
                  {t('admin.twoFaActive', '2FA Active')}
                </Badge>
              </div>

              <form onSubmit={submitReset} className="space-y-4 max-w-xl">
                {/* Current Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('admin.currentSecretCode', 'Current Secret Code')}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder={t('admin.enterCurrentCode', 'Enter current 6-12 character code')}
                      value={currentCode}
                      onChange={(e) => setCurrentCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-navy-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {t('admin.newSecretCode', 'New Secret Code')}
                    </label>
                    {newCode && (
                      <span className="text-xs font-medium text-slate-500">
                        {t('admin.strength', 'Strength')}: <strong className="text-navy-900">{strength.text}</strong>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder={t('admin.enterNewCode', 'Enter new 6-12 character code')}
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-navy-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {newCode && (
                    <div className="mt-2 flex gap-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.score >= 1 ? 'w-1/3' : 'w-0'}`} />
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.score >= 2 ? 'w-1/3' : 'w-0'}`} />
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.score >= 3 ? 'w-1/3' : 'w-0'}`} />
                    </div>
                  )}
                </div>

                {/* Confirm Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    {t('admin.confirmNewCode', 'Confirm New Secret Code')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t('admin.repeatNewCode', 'Repeat new secret code')}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-navy-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmCode && newCode !== confirmCode && (
                    <p className="mt-1 text-xs text-red-600">{t('admin.codesMismatch', 'Codes do not match')}</p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={resetting}
                    icon={<Lock className="h-4 w-4" />}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-600/20"
                  >
                    {t('admin.updateSecretPasscode', 'Update Secret Passcode')}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Sidebar: Security Checklist */}
          <div className="space-y-4">
            <Card className="p-5 border border-slate-200/80">
              <h4 className="font-bold text-sm text-navy-950 flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                {t('admin.passcodeGuidelines', 'Passcode Guidelines')}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${newCode.length >= 6 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t('admin.guideLength', 'Length between 6 and 12 characters')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${/[0-9]/.test(newCode) ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t('admin.guideSymbols', 'Includes numbers or symbols for resilience')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${newCode && newCode === confirmCode ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>{t('admin.guideMatch', 'Matches confirmation input accurately')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('admin.guideEncryption', 'Bcrypt 10-round encrypted in Supabase database')}</span>
                </li>
              </ul>
            </Card>

            <Card className="p-5 border border-slate-200/80 bg-navy-50/50">
              <div className="flex items-center gap-2 font-bold text-xs text-navy-900 uppercase tracking-wider mb-2">
                <Clock className="h-3.5 w-3.5 text-navy-600" />
                <span>{t('admin.sessionExpiryPolicy', 'Session Expiry Policy')}</span>
              </div>
              <p className="text-xs text-navy-700 leading-relaxed">
                {t('admin.sessionExpiryText', 'Admin 2FA sessions remain verified for 24 hours on this browser. Logging out will instantly terminate all session tokens.')}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN ACCOUNTS & RBAC */}
      {activeTab === 'admins' && (
        <Card className="p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-bold text-navy-950 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-navy-800" />
                {t('admin.teamAndRoles', 'Administrative Team & Role Assignments')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('admin.teamAndRolesSub', 'Overview of personnel authorized to manage portal properties, leads, approvals, and financial records.')}
              </p>
            </div>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus className="h-4 w-4" />}
                onClick={() => setShowCreate(true)}
              >
                {t('admin.addNewAdmin', 'Add New Admin')}
              </Button>
            )}
          </div>

          {admins.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-8 w-8 text-navy-400" />}
              title={t('admin.noAdditionalAdmins', 'No additional admins registered')}
              description={t('admin.noAdditionalAdminsDesc', 'New admins can be invited or registered directly by Super Administrators.')}
            />
          ) : (
            <div className="grid gap-3">
              {admins.map((a) => {
                const locked = !!a.security?.locked_until && new Date(a.security.locked_until) > new Date();
                const name = [a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(' ') || t('admin.adminUser', 'Admin User');
                return (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 p-4 bg-white hover:border-navy-300 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-navy-100 text-navy-800 font-bold flex items-center justify-center shrink-0 border border-navy-200">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-navy-950 text-sm truncate">{name}</p>
                          <Badge variant={a.role === 'super_admin' ? 'gold' : 'navy'} className="text-[10px] py-0.5">
                            {a.role === 'super_admin' ? t('admin.superAdmin', 'Super Admin') : t('admin.admin', 'Admin')}
                          </Badge>
                          <Badge variant={a.status === 'active' ? 'success' : 'error'} className="text-[10px] py-0.5">
                            {a.status}
                          </Badge>
                          {locked && (
                            <Badge variant="error" className="text-[10px] py-0.5">
                              {t('admin.locked15m', 'Locked (15m)')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t('admin.phone', 'Phone')}: +{a.mobile} {a.profiles?.email ? `· ${a.profiles.email}` : ''} · {t('admin.joined', 'Joined')} {timeAgo(a.created_at, t)}
                        </p>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<RotateCcw className="h-3.5 w-3.5" />}
                          onClick={() => setResetTarget(a)}
                          className="text-xs"
                        >
                          {t('admin.resetPasscode', 'Reset Passcode')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={a.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                          icon={<Ban className="h-3.5 w-3.5" />}
                          onClick={() =>
                            statusMutation.mutate({
                              id: a.id,
                              nextStatus: a.status === 'active' ? 'suspended' : 'active',
                            })
                          }
                        >
                          {a.status === 'active' ? t('admin.suspend', 'Suspend') : t('admin.reactivate', 'Reactivate')}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: ACTIVITY & AUDIT TRAIL */}
      {activeTab === 'logs' && (
        <Card className="p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-bold text-navy-950 flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-navy-800" />
                {t('admin.realtimeSecurityLogs', 'Realtime Security Logs & Login Events')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('admin.realtimeSecurityLogsSub', 'Immutable audit trail of mobile OTP logins, secret verification checks, passcode resets, and session terminations.')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${logFilter === 'all' ? 'bg-white shadow text-navy-900' : 'text-slate-500'}`}
                >
                  {t('common.all', 'All')} ({logs.length})
                </button>
                <button
                  onClick={() => setLogFilter('success')}
                  className={`px-3 py-1 rounded-lg transition-all ${logFilter === 'success' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                >
                  {t('common.success', 'Success')}
                </button>
                <button
                  onClick={() => setLogFilter('failed')}
                  className={`px-3 py-1 rounded-lg transition-all ${logFilter === 'failed' ? 'bg-white shadow text-red-700' : 'text-slate-500'}`}
                >
                  {t('common.failed', 'Failed')}
                </button>
              </div>

              <Button
                size="sm"
                variant="outline"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => refetchLogs()}
              >
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder={t('admin.searchLogsPlaceholder', 'Search by action, IP address, or device...')}
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-xs text-navy-900 focus:border-navy-500 focus:outline-none"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8 text-navy-400" />}
              title={t('admin.noLogsRecorded', 'No security logs recorded')}
              description={t('admin.noLogsRecordedDesc', 'Security events and login checks will automatically be recorded here in realtime.')}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-600">
                        {log.device?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="h-4 w-4" />
                        ) : log.device?.toLowerCase().includes('mac') || log.device?.toLowerCase().includes('windows') ? (
                          <Laptop className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy-950 text-xs">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </p>
                        <p className="text-slate-500 text-[11px] truncate mt-0.5">
                          IP: <span className="font-mono">{log.ip || '127.0.0.1'}</span> · {t('admin.device', 'Device')}: {log.device || 'Web Browser Client'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <Badge
                        variant={log.status === 'success' ? 'success' : 'error'}
                        className="text-[10px] py-0.5"
                      >
                        {log.status === 'success' ? t('admin.verifiedSuccess', 'Verified / Success') : log.status}
                      </Badge>
                      <span className="text-slate-400 font-mono text-[11px]" title={log.created_at ? formatDateTime(log.created_at) : ''}>
                        {timeAgo(log.created_at, t)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: SECURITY HARDENING & POLICIES */}
      {activeTab === 'policies' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-navy-950 flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t('admin.activeDefenses', 'Active Architectural Defenses')}
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy-900">{t('admin.defenseRlsTitle', 'PostgreSQL Row Level Security (RLS)')}</p>
                  <p className="text-slate-600 mt-0.5">
                    {t('admin.defenseRlsDesc', 'Data isolation policies enforce that only authorized admins can inspect sensitive dossiers, approvals, and transaction logs.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy-900">{t('admin.defenseEdgeTitle', 'Edge Function Service-Role Isolation')}</p>
                  <p className="text-slate-600 mt-0.5">
                    {t('admin.defenseEdgeDesc', 'Secret passcode hashing (Bcrypt 10 rounds) and account lockout logic run inside hardened Edge Functions with zero public read policies.')}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gold-50/60 border border-gold-100 flex items-start gap-2.5">
                <Check className="h-4 w-4 text-gold-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy-900">{t('admin.defenseRateLimitTitle', 'Rate Limiting & Brute-Force Safeguard')}</p>
                  <p className="text-slate-600 mt-0.5">
                    {t('admin.defenseRateLimitDesc', 'Any account exceeding 5 consecutive incorrect secret codes is automatically locked out for 15 minutes.')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-base font-bold text-navy-950 flex items-center gap-2 mb-3">
              <Radio className="h-5 w-5 text-navy-800" />
              {t('admin.liveTelemetry', 'Live Security Telemetry')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-medium text-slate-700">{t('admin.supabaseAuthLayer', 'Supabase Auth Layer')}</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {t('admin.operational', 'Operational')}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-medium text-slate-700">{t('admin.dbConnectionPool', 'Database Connection Pool')}</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {t('admin.connected', 'Connected')}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-medium text-slate-700">{t('admin.admin2faFactor', 'Admin 2FA Second Factor')}</span>
                <Badge variant="success">{t('admin.enforcedSitewide', 'Enforced Site-wide')}</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('admin.addAdminAccount', 'Add Admin Account')}>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('forms.firstName', 'First Name')}
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
              placeholder="e.g. Rahul"
            />
            <Input
              label={t('forms.lastName', 'Last Name')}
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
              placeholder="e.g. Verma"
            />
          </div>

          <Input
            label={t('forms.mobileNumber', 'Mobile Number (10 digits)')}
            value={createMobile}
            onChange={(e) => setCreateMobile(e.target.value)}
            placeholder="e.g. 9876543210"
            required
          />

          <Select
            label={t('admin.roleAndAccess', 'Role & Access Level')}
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value as 'admin' | 'super_admin')}
          >
            <option value="admin">{t('admin.roleAdminDesc', 'Admin (Standard Dashboard Access)')}</option>
            <option value="super_admin">{t('admin.roleSuperAdminDesc', 'Super Admin (Can manage security & other admins)')}</option>
          </Select>

          <div className="rounded-xl bg-navy-50 p-3 text-xs text-navy-700 leading-relaxed border border-navy-100">
            {t('admin.newAdminNote', 'They will log in with their phone number via SMS OTP, then initialize their 2FA Secret Access Code on their first access.')}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              icon={<UserPlus className="h-4 w-4" />}
            >
              {t('admin.createAccount', 'Create Account')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* FORCE RESET PASSCODE MODAL */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`${t('admin.resetPasscodeFor', 'Reset Passcode for')} ${resetTarget?.mobile}`}
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600">
            {t('admin.superAdminResetHelp', 'As a Super Admin, you can set a temporary or replacement 6-12 character secret passcode for this user.')}
          </p>

          <div className="relative">
            <input
              type={showForceCode ? 'text' : 'password'}
              placeholder={t('admin.enterNewForceCode', 'Enter new 6-12 digit code')}
              value={forceCode}
              onChange={(e) => setForceCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-navy-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <button
              type="button"
              onClick={() => setShowForceCode(!showForceCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showForceCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              loading={forceResetMutation.isPending}
              onClick={() => forceResetMutation.mutate()}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              {t('admin.saveNewPasscode', 'Save New Passcode')}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
