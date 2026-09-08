import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Eye, FileText, CheckCircle, Clock, XCircle, Search, X, Trash2, AlertTriangle } from 'lucide-react';
import InvoicePreview from '../../../components/invoices/InvoicePreview';
import { BulkActionsBar } from '../../../components/data-table';
import { Modal, Button } from '../../../components/ui';

export default function InvoiceTable({ onCreateNew }: { onCreateNew: () => void }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);

  // Selection and Deletion State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteInvoices = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      // Delete invoice items first to prevent foreign key issues
      await supabase.from('txn_invoice_items').delete().in('invoice_id', ids);
      const { error } = await supabase.from('txn_invoices').delete().in('id', ids);
      if (error) throw error;

      setInvoices((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelectedIds(new Set());
      setToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice(s)');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{status}</span>;
    }
  };

  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold">Invoices</h2>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full sm:w-64 bg-white"
            />
          </div>
          <button
            onClick={onCreateNew}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 shadow-sm shadow-red-600/20 transition cursor-pointer whitespace-nowrap"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="p-4 border-b bg-red-50/50">
          <BulkActionsBar
            count={selectedIds.size}
            onDelete={() => setToDelete(Array.from(selectedIds))}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  className="rounded border-navy-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  checked={filteredInvoices.length > 0 && filteredInvoices.every((inv) => selectedIds.has(inv.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </th>
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
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Loading invoices...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="rounded border-navy-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.has(inv.id) ? next.delete(inv.id) : next.add(inv.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="p-4 font-medium">{inv.invoice_number}</td>
                  <td className="p-4">
                    <div className="font-medium">{inv.customer?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{inv.customer?.email}</div>
                  </td>
                  <td className="p-4">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">₹{inv.total_amount.toLocaleString()}</td>
                  <td className="p-4">{getStatusBadge(inv.payment_status)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        title="View & Download PDF"
                        className="p-1.5 text-navy-700 hover:bg-navy-50 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setToDelete([inv.id])}
                        title="Delete Invoice"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4">
              <InvoicePreview invoice={previewInvoice} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {toDelete && (
        <Modal
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          title={`Permanently Delete ${toDelete.length === 1 ? 'Invoice' : `${toDelete.length} Invoices`}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">This action cannot be undone.</p>
                <p>
                  {toDelete.length === 1
                    ? 'The selected invoice and all related line items will be permanently removed.'
                    : `All ${toDelete.length} selected invoices and their related line items will be permanently removed.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                loading={isDeleting}
                onClick={() => handleDeleteInvoices(toDelete)}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
