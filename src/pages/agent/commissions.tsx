import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, IndianRupee, Clock, CheckCircle2, ArrowDownToLine, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Badge, Button, Modal, Input, EmptyState, Skeleton } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { formatPrice, formatDate } from '../../lib/utils';

type CommissionStatus = 'pending' | 'approved' | 'paid' | 'rejected';
type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

interface Commission {
  id: string;
  amount: number;
  percentage: number;
  status: CommissionStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string | null;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  created_at: string;
}

function commissionStatusVariant(s: CommissionStatus): 'default' | 'warning' | 'info' | 'success' | 'error' {
  if (s === 'paid') return 'success';
  if (s === 'approved') return 'info';
  if (s === 'rejected') return 'error';
  return 'warning';
}

function withdrawalStatusVariant(s: WithdrawalStatus): 'default' | 'warning' | 'info' | 'success' | 'error' {
  if (s === 'completed') return 'success';
  if (s === 'processing') return 'info';
  if (s === 'rejected') return 'error';
  return 'warning';
}

export function AgentCommissions() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const walletTick = useRealtimeCount('wallets', { column: 'user_id', value: user?.id ?? '' });
  const commissionsTick = useRealtimeCount('commissions', { column: 'sales_person_id', value: user?.id ?? '' });
  const withdrawalsTick = useRealtimeCount('withdrawal_requests', { column: 'user_id', value: user?.id ?? '' });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['agent-wallet', user?.id, walletTick],
    queryFn: async () => {
      const { data, error } = await supabase.from('wallets').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['agent-commissions', user?.id, commissionsTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('sales_person_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Commission[];
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['agent-wallet-transactions', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
    enabled: !!wallet?.id,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ['agent-withdrawals', user?.id, withdrawalsTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WithdrawalRequest[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const rows = commissions ?? [];
    return {
      totalEarned: rows.filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
      pending: rows.filter((r) => r.status === 'pending' || r.status === 'approved').reduce((s, r) => s + r.amount, 0),
    };
  }, [commissions]);

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_request_withdrawal', {
        p_amount: Number(amount),
        p_bank_details: { account_name: accountName, account_number: accountNumber, ifsc, bank_name: bankName },
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (result) => {
      if (result.success) {
        addToast('success', result.message);
        setWithdrawOpen(false);
        setAmount('');
        setAccountName('');
        setAccountNumber('');
        setIfsc('');
        setBankName('');
        queryClient.invalidateQueries({ queryKey: ['agent-wallet'] });
        queryClient.invalidateQueries({ queryKey: ['agent-withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['agent-wallet-transactions'] });
      } else {
        addToast('error', result.message);
      }
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to request withdrawal'),
  });

  const validateWithdraw = () => {
    const errs: Record<string, string> = {};
    const amt = Number(amount);
    if (!amt || amt <= 0) errs.amount = 'Enter a valid amount';
    if (wallet && amt > wallet.balance) errs.amount = 'Amount exceeds available balance';
    if (!accountName.trim()) errs.accountName = 'Required';
    if (!accountNumber.trim()) errs.accountNumber = 'Required';
    if (!ifsc.trim()) errs.ifsc = 'Required';
    if (!bankName.trim()) errs.bankName = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitWithdrawal = async () => {
    if (!validateWithdraw()) return;
    setSubmitting(true);
    await withdrawMutation.mutateAsync().finally(() => setSubmitting(false));
  };

  return (
    <DashboardLayout sections={agentSections} title="Commissions" badge="Agent">
      <PageHeader
        title="Commissions & Invoices"
        subtitle="Track your earnings, wallet balance, and payout requests."
        action={
          <Button icon={<ArrowDownToLine className="h-4 w-4" />} onClick={() => setWithdrawOpen(true)} disabled={!wallet || wallet.balance <= 0}>
            Request Withdrawal
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={walletLoading ? '…' : formatPrice(wallet?.balance ?? 0)}
          icon={<Wallet className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard label="Total Earned (Paid)" value={formatPrice(stats.totalEarned)} icon={<IndianRupee className="h-5 w-5" />} accent="success" />
        <StatCard label="Pending Commissions" value={formatPrice(stats.pending)} icon={<Clock className="h-5 w-5" />} accent="gold" />
        <StatCard label="Withdrawal Requests" value={withdrawals?.length ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="navy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900 mb-4">Commissions</h3>
          {commissionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : commissions && commissions.length > 0 ? (
            <div className="divide-y divide-navy-50">
              {commissions.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-900">{formatPrice(c.amount)}</p>
                    <p className="text-xs text-navy-400">{c.percentage}% · {formatDate(c.created_at)}</p>
                    {c.notes && <p className="text-xs text-navy-500 mt-0.5">{c.notes}</p>}
                  </div>
                  <Badge variant={commissionStatusVariant(c.status)} className="capitalize">
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<IndianRupee className="h-6 w-6" />} title="No commissions yet" description="Commissions earned on closed deals will appear here." />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900 mb-4">Wallet Ledger</h3>
          {transactionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="divide-y divide-navy-50">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {tx.transaction_type === 'credit' ? (
                      <ArrowDownLeft className="h-4 w-4 text-success-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-error-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-navy-900">{tx.description ?? tx.transaction_type}</p>
                      <p className="text-xs text-navy-400">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <span className={tx.transaction_type === 'credit' ? 'font-semibold text-success-600' : 'font-semibold text-error-600'}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}
                    {formatPrice(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No transactions yet" description="Wallet credits and debits will appear here." />
          )}
        </Card>
      </div>

      {withdrawals && withdrawals.length > 0 && (
        <Card className="p-5 mt-6">
          <h3 className="font-display font-semibold text-navy-900 mb-4">Withdrawal Requests</h3>
          <div className="divide-y divide-navy-50">
            {withdrawals.map((w) => (
              <div key={w.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-navy-900">{formatPrice(w.amount)}</p>
                  <p className="text-xs text-navy-400">{formatDate(w.created_at)}</p>
                </div>
                <Badge variant={withdrawalStatusVariant(w.status)} className="capitalize">
                  {w.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Request Withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitWithdrawal} loading={submitting}>
              Submit Request
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-navy-500">Available balance: {formatPrice(wallet?.balance ?? 0)}</p>
          <Input
            type="number"
            label="Amount (₹)"
            value={amount}
            error={formErrors.amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="Account holder name"
            value={accountName}
            error={formErrors.accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
          <Input
            label="Account number"
            value={accountNumber}
            error={formErrors.accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="IFSC code" value={ifsc} error={formErrors.ifsc} onChange={(e) => setIfsc(e.target.value)} />
            <Input label="Bank name" value={bankName} error={formErrors.bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
