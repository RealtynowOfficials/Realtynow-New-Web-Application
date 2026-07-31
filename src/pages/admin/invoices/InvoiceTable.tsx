import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Eye, Send, FileText, CheckCircle, Clock, XCircle, Search, X } from 'lucide-react';
import InvoicePreview from '../../../components/invoices/InvoicePreview';

export default function InvoiceTable({ onCreateNew }: { onCreateNew: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('txn_invoices')
      .select(`
        *,
        customer:customer_id (name, email, address, city, pincode, phone),
        agent:agent_id (first_name, last_name),
        property:property_id (title, price),
        items:txn_invoice_items(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Paid</span>;
      case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>;
      case 'failed': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold">Invoices</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-64"
            />
          </div>
          <button onClick={onCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700">
            + Create Invoice
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="p-4">Invoice No</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Date</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading invoices...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No invoices found.</td></tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{inv.invoice_number}</td>
                  <td className="p-4">
                    <div className="font-medium">{inv.customer?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{inv.customer?.email}</div>
                  </td>
                  <td className="p-4">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">₹{inv.total_amount.toLocaleString()}</td>
                  <td className="p-4">{getStatusBadge(inv.payment_status)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setPreviewInvoice(inv)} title="View & Download PDF" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                      <button title="Send Email/WA" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Send className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setPreviewInvoice(null)} 
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4">
              <InvoicePreview invoice={previewInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
