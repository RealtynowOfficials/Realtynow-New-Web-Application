import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { getAdminSections } from '../portal/sections';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../components/toast';

export default function AdminCommissions() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { addToast } = useToast();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles:auth.users(email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      addToast('success', 'Withdrawal status updated');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  if (!profile || profile.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  const pending = withdrawals?.filter((w) => w.status === 'pending') || [];
  const completed = withdrawals?.filter((w) => w.status === 'completed') || [];

  return (
    <DashboardLayout sections={getAdminSections((k: string, fb?: string) => t(k, fb as any) as string)} title="Withdrawals & Payouts" badge="Admin">
      <PageHeader title="Withdrawals & Payouts" subtitle="Manage agent wallet withdrawals and commission payouts." />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-100 p-3 text-amber-600"><FileText className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-amber-800">Pending Requests</p>
              <p className="text-2xl font-bold text-amber-900">{pending.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3 text-green-600"><CheckCircle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-green-800">Completed Payouts</p>
              <p className="text-2xl font-bold text-green-900">{completed.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-navy-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-200 bg-navy-50">
            <tr>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Bank Details</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {withdrawals?.map((w) => (
              <tr key={w.id} className="hover:bg-navy-50/50">
                <td className="p-4">{format(new Date(w.created_at), 'MMM dd, yyyy HH:mm')}</td>
                <td className="p-4">{w.profiles?.email || w.user_id.substring(0,8)}</td>
                <td className="p-4 font-bold">₹{w.amount}</td>
                <td className="p-4 text-xs font-mono text-navy-600">
                  {JSON.stringify(w.bank_details)}
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide
                    ${w.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                      w.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {w.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {w.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => updateStatusMutation.mutate({ id: w.id, status: 'completed' })}
                        className="rounded bg-green-100 px-3 py-1.5 text-green-700 hover:bg-green-200 font-medium text-xs flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button 
                        onClick={() => updateStatusMutation.mutate({ id: w.id, status: 'rejected' })}
                        className="rounded bg-red-100 px-3 py-1.5 text-red-700 hover:bg-red-200 font-medium text-xs flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {withdrawals?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-navy-500">No withdrawal requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
