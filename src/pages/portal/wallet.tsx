import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { getPortalSections } from './sections';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, History, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../components/toast';

export default function AgentWallet() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['portal-wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['portal-wallet-transactions', wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wallet,
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('fn_request_withdrawal', {
        p_amount: Number(withdrawAmount),
        p_bank_details: { account: bankAccount, ifsc },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['portal-wallet-transactions'] });
      addToast('success', 'Withdrawal request submitted successfully');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setBankAccount('');
      setIfsc('');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(withdrawAmount) > (wallet?.balance || 0)) {
      addToast('error', 'Insufficient balance');
      return;
    }
    withdrawMutation.mutate();
  };

  return (
    <DashboardLayout sections={getPortalSections((k: string, fb?: string) => t(k, fb as any) as string)} title={t('portal.walletTitle', 'Agent Wallet')}>
      <PageHeader title="My Wallet" subtitle="Manage your credits, commissions, and withdrawals." />

      <div className="mb-8 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 p-4">
          <WalletIcon className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h2 className="text-navy-200 font-medium tracking-wide uppercase text-sm mb-2">Available Balance</h2>
          <div className="flex items-center gap-2 mb-6">
            <IndianRupee className="w-8 h-8 text-primary-400" />
            <span className="text-5xl font-bold">{wallet?.balance || '0.00'}</span>
          </div>
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={!wallet || wallet.balance <= 0}
            className="rounded-xl bg-primary-600 px-6 py-3 font-semibold hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Request Withdrawal
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-navy-200 bg-white shadow-sm">
        <div className="border-b border-navy-200 p-4 flex items-center gap-2">
          <History className="w-5 h-5 text-navy-500" />
          <h3 className="font-bold">Transaction History</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50">
            <tr>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {transactions?.map((tx) => (
              <tr key={tx.id} className="hover:bg-navy-50/50">
                <td className="p-4">
                  {tx.transaction_type === 'credit' ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full w-max text-xs uppercase">
                      <ArrowDownRight className="w-3 h-3" /> Credit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full w-max text-xs uppercase">
                      <ArrowUpRight className="w-3 h-3" /> Debit
                    </span>
                  )}
                </td>
                <td className="p-4">{tx.description}</td>
                <td className="p-4 text-navy-500">{format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}</td>
                <td className={`p-4 text-right font-bold ${tx.transaction_type === 'credit' ? 'text-green-600' : 'text-navy-900'}`}>
                  {tx.transaction_type === 'credit' ? '+' : '-'}₹{tx.amount}
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-navy-500">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Request Withdrawal</h2>
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount to Withdraw (₹)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={wallet?.balance}
                  required
                  className="w-full rounded border p-2"
                />
                <p className="text-xs text-navy-500 mt-1">Available: ₹{wallet?.balance}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  required
                  className="w-full rounded border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  required
                  className="w-full rounded border p-2 uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsWithdrawModalOpen(false)} className="rounded px-4 py-2 hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" disabled={withdrawMutation.isPending} className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
                  {withdrawMutation.isPending ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
