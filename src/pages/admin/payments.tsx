import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Download, ExternalLink, Calendar, Filter, FileText } from 'lucide-react';
import { PaymentTransaction, Invoice } from '../../lib/enterprise-types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, packages(name)')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      setPayments(paymentsData || []);
      setInvoices(invoicesData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payments & Invoices</h1>
          <p className="text-gray-500 mt-1">Manage platform transactions and billing</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`pb-4 px-4 font-medium text-sm transition-colors ${
            activeTab === 'payments' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('payments')}
        >
          Transactions
        </button>
        <button
          className={`pb-4 px-4 font-medium text-sm transition-colors ${
            activeTab === 'invoices' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
        </button>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'payments' ? "Search transaction ID..." : "Search invoice number..."}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
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
      ) : activeTab === 'payments' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="p-4 font-medium">Transaction ID</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Gateway</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-mono text-xs text-gray-900">{payment.gateway_transaction_id || payment.id.split('-')[0]}</div>
                        <div className="text-xs text-gray-500 mt-1">{payment.payment_method}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(payment.created_at || '').toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-4 text-sm text-gray-600 uppercase">
                        {payment.payment_gateway}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-gray-400 hover:text-primary-600 transition-colors">
                          <ExternalLink className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="p-4 font-medium">Invoice No</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Amount (w/ Tax)</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-medium text-sm text-gray-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(invoice.issued_at || '').toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                        <div className="text-xs font-normal text-gray-500 mt-1">Tax: {formatCurrency(invoice.tax_amount)}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <a href={invoice.pdf_url || undefined} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary-600 transition-colors inline-block mr-2">
                          <FileText className="h-5 w-5" />
                        </a>
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
