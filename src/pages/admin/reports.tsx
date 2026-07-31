import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, FileText, Calendar, Filter } from 'lucide-react';

interface RevenueReport {
  id: string;
  report_month: string;
  total_revenue: number;
  total_transactions: number;
  total_subscriptions: number;
  total_sponsored_listings: number;
  refunds_amount: number;
  tax_collected: number;
  net_revenue: number;
  status: string;
  generated_at: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<RevenueReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('revenue_reports')
        .select('*')
        .order('report_month', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Error fetching reports:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Revenue Reports</h1>
          <p className="text-gray-500 mt-1">Monthly financial summaries and tax reports</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            <FileText className="h-4 w-4" />
            <span>Generate New Report</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select className="border-none bg-transparent focus:ring-0 text-sm font-medium">
              <option>All Time</option>
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <Filter className="h-5 w-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="p-4 font-medium">Month</th>
                  <th className="p-4 font-medium">Transactions</th>
                  <th className="p-4 font-medium">Gross Revenue</th>
                  <th className="p-4 font-medium">Tax Collected</th>
                  <th className="p-4 font-medium">Refunds</th>
                  <th className="p-4 font-medium">Net Revenue</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No reports generated yet
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">
                          {new Date(report.report_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Generated: {new Date(report.generated_at).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {report.total_transactions}
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {formatCurrency(report.total_revenue)}
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {formatCurrency(report.tax_collected)}
                      </td>
                      <td className="p-4 text-sm text-red-600">
                        {report.refunds_amount > 0 ? `-${formatCurrency(report.refunds_amount)}` : '$0'}
                      </td>
                      <td className="p-4 font-medium text-green-600">
                        {formatCurrency(report.net_revenue)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-gray-400 hover:text-primary-600 transition-colors inline-block p-1">
                          <Download className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
