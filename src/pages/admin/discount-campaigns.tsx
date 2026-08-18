import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { getAdminSections } from '../portal/sections';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../../components/toast';

export default function AdminDiscountCampaigns() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['admin-discount-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editCampaign) {
        const { error } = await supabase.from('discount_campaigns').update(payload).eq('id', editCampaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('discount_campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discount-campaigns'] });
      addToast('success', editCampaign ? 'Campaign updated' : 'Campaign created');
      setIsModalOpen(false);
      setEditCampaign(null);
    },
    onError: (err: any) => addToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discount_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discount-campaigns'] });
      addToast('success', 'Campaign status updated');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      title: fd.get('title'),
      coupon_code: fd.get('coupon_code') || null,
      discount_type: fd.get('discount_type'),
      percentage: fd.get('percentage') ? Number(fd.get('percentage')) : 0,
      flat_amount: fd.get('flat_amount') ? Number(fd.get('flat_amount')) : 0,
      days_before_expiry: fd.get('days_before_expiry') ? Number(fd.get('days_before_expiry')) : null,
      is_active: fd.get('is_active') === 'on',
    });
  };

  if (!profile || profile.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <DashboardLayout sections={getAdminSections((k: string, fb?: string) => t(k, fb as any) as string)} title="Discount Campaigns" badge="Admin">
      <PageHeader title="Discount Campaigns" subtitle="Manage auto-renewal discounts and coupons" />

      <div className="mb-4">
        <button
          onClick={() => {
            setEditCampaign(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Add Campaign
        </button>
      </div>

      <div className="rounded-xl border border-navy-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy-200 bg-navy-50">
            <tr>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Discount</th>
              <th className="p-4 font-medium">Trigger (Days)</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {campaigns?.map((c) => (
              <tr key={c.id} className="hover:bg-navy-50/50">
                <td className="p-4 font-medium">{c.title}</td>
                <td className="p-4">{c.coupon_code || '-'}</td>
                <td className="p-4">
                  {c.discount_type === 'percentage' ? `${c.percentage}%` : `₹${c.flat_amount}`}
                </td>
                <td className="p-4">{c.days_before_expiry || '-'}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setEditCampaign(c); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {campaigns?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-navy-500">No campaigns found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">{editCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input name="title" defaultValue={editCampaign?.title} required className="w-full rounded border p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Discount Type</label>
                  <select name="discount_type" defaultValue={editCampaign?.discount_type || 'percentage'} className="w-full rounded border p-2">
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Coupon Code (Optional)</label>
                  <input name="coupon_code" defaultValue={editCampaign?.coupon_code} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Percentage</label>
                  <input type="number" step="0.01" name="percentage" defaultValue={editCampaign?.percentage} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Flat Amount</label>
                  <input type="number" step="0.01" name="flat_amount" defaultValue={editCampaign?.flat_amount} className="w-full rounded border p-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Trigger (Days before expiry)</label>
                <input type="number" name="days_before_expiry" defaultValue={editCampaign?.days_before_expiry} placeholder="e.g. 5" className="w-full rounded border p-2" />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_active" defaultChecked={editCampaign ? editCampaign.is_active : true} className="rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer" />
                  Is Active
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded px-4 py-2 hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
