import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../lib/auth';
import { getAdminSections } from '../portal/sections';
import { Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function AdminRenewals() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-renewal-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_renewal_analytics', { p_user_id: null });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: userPackages, isLoading: packagesLoading } = useQuery({
    queryKey: ['admin-user-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_packages')
        .select('*, packages(name), profiles:auth.users(email)')
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  if (!profile || profile.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  const upcomingRenewals = userPackages?.filter((p) => p.status === 'active' && differenceInDays(new Date(p.expiry_date), new Date()) <= 15);
  const expiredPackages = userPackages?.filter((p) => p.status === 'expired');

  return (
    <DashboardLayout sections={getAdminSections((k: string, fb?: string) => t(k, fb as any) as string)} title="Package Renewals" badge="Admin">
      <PageHeader title="Package Renewals" subtitle="Monitor active packages, upcoming expiries, and generated revenue." />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3 text-blue-600"><TrendingUp className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-navy-500">Total Revenue</p>
              <p className="text-2xl font-bold">₹{analytics?.total_revenue || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3 text-green-600"><CheckCircle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-navy-500">Active Packages</p>
              <p className="text-2xl font-bold">{analytics?.active_packages || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-red-100 p-3 text-red-600"><AlertTriangle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-navy-500">Expired</p>
              <p className="text-2xl font-bold">{analytics?.expired_packages || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-navy-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600"><Clock className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-navy-500">Expiring in 15 Days</p>
              <p className="text-2xl font-bold">{analytics?.upcoming_renewals || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-navy-200 bg-white shadow-sm">
          <div className="border-b border-navy-200 p-4">
            <h3 className="font-bold">Upcoming Renewals (Next 15 Days)</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Package</th>
                <th className="p-4 font-medium">Expiry</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {upcomingRenewals?.map((p) => (
                <tr key={p.id}>
                  <td className="p-4">User ID: {p.user_id.substring(0,8)}...</td>
                  <td className="p-4">{p.packages?.name}</td>
                  <td className="p-4">{format(new Date(p.expiry_date), 'MMM dd, yyyy')}</td>
                  <td className="p-4 text-yellow-600 font-medium">Expiring Soon</td>
                </tr>
              ))}
              {upcomingRenewals?.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-navy-500">No upcoming renewals.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-navy-200 bg-white shadow-sm">
          <div className="border-b border-navy-200 p-4">
            <h3 className="font-bold">Recently Expired</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Package</th>
                <th className="p-4 font-medium">Expired On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {expiredPackages?.slice(0, 10).map((p) => (
                <tr key={p.id}>
                  <td className="p-4">User ID: {p.user_id.substring(0,8)}...</td>
                  <td className="p-4">{p.packages?.name}</td>
                  <td className="p-4 text-red-600">{format(new Date(p.expiry_date), 'MMM dd, yyyy')}</td>
                </tr>
              ))}
              {expiredPackages?.length === 0 && (
                <tr><td colSpan={3} className="p-4 text-center text-navy-500">No expired packages.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
