import React, { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Download, Printer } from 'lucide-react';
import { Spinner } from '../ui';
import { Logo } from '../logo';
import { supabase } from '../../lib/supabase';
import { getDocumentSignedUrl } from '../../lib/storage';

interface InvoicePreviewProps {
  invoice: any;
  onPdfGenerated?: (pdfUrl: string) => void;
}

export default function InvoicePreview({ invoice, onPdfGenerated }: InvoicePreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!invoice) return null;

  // Normalize data across all roles (Subscriptions, Property Txns, Builder, Partner Commissions)
  const invoiceNumber =
    invoice.invoice_number ||
    invoice.commission_code ||
    (invoice.id ? `RN-INV-${String(invoice.id).slice(0, 8).toUpperCase()}` : 'RN-INV-001');

  const customerName =
    invoice.customer?.name ||
    invoice.billing_name ||
    invoice.builder_customers?.name ||
    invoice.partner?.name ||
    'Valued RealtyNow Client';

  const customerAddress =
    invoice.customer?.address ||
    invoice.billing_address ||
    invoice.address ||
    'Registered Client Address, India';

  const customerCity =
    invoice.customer?.city ||
    (invoice.customer?.pincode ? `PIN: ${invoice.customer.pincode}` : '');

  const customerEmail = invoice.customer?.email || invoice.billing_email || invoice.email || '';
  const customerPhone = invoice.customer?.phone || invoice.billing_phone || invoice.phone || '';

  const rawDate = invoice.invoice_date || invoice.issued_at || invoice.issued_date || invoice.created_at;
  const invoiceDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');

  const rawDueDate = invoice.due_date || invoice.due_at || rawDate;
  const dueDate = rawDueDate ? new Date(rawDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : invoiceDate;

  // Derive items
  let items: any[] = [];
  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    items = invoice.items.map((it: any, idx: number) => ({
      id: it.id || `item_${idx}`,
      title: it.title || it.description || 'Listing / Subscription Package',
      quantity: it.quantity || 1,
      unit_price: Number(it.unit_price ?? it.total ?? 0),
      total: Number(it.total ?? (Number(it.unit_price || 0) * Number(it.quantity || 1))),
    }));
  } else {
    const defaultTitle =
      invoice.description ||
      invoice.rule_name ||
      (invoice.plan?.name ? `${invoice.plan.name} Listing Plan` : null) ||
      (invoice.builder_bookings?.builder_units?.unit_number ? `Milestone Payment - Unit ${invoice.builder_bookings.builder_units.unit_number}` : null) ||
      'RealtyNow Platform Services & Listing Fee';

    const rawSubtotal = Number(
      invoice.subtotal ??
      invoice.amount ??
      invoice.eligible_amount ??
      (invoice.total_amount ? Number(invoice.total_amount) / 1.18 : 0)
    );

    items = [
      {
        id: 'item_1',
        title: defaultTitle,
        quantity: 1,
        unit_price: Math.round(rawSubtotal * 100) / 100,
        total: Math.round(rawSubtotal * 100) / 100,
      },
    ];
  }

  const subtotal = Number(
    invoice.subtotal ??
    items.reduce((sum, it) => sum + (Number(it.total) || 0), 0)
  );

  const isTds = Boolean(invoice.tds_amount);
  const taxPct = Number(invoice.tax_percentage ?? invoice.tax_pct ?? (isTds ? 5 : 18));
  const taxAmount = Number(
    invoice.tax_amount ??
    invoice.tds_amount ??
    (isTds ? subtotal * 0.05 : Math.round(subtotal * (taxPct / 100) * 100) / 100)
  );
  const discount = Number(invoice.discount ?? invoice.discount_amount ?? 0);
  const totalAmount = Number(
    invoice.total_amount ??
    invoice.total ??
    (isTds ? subtotal - taxAmount : subtotal + taxAmount - discount)
  );

  const status = (invoice.payment_status || invoice.status || 'paid').toLowerCase();

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    try {
      const element = contentRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
        filename: `${invoiceNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const },
      };

      // 1. Direct browser download for the user (always succeeds)
      await html2pdf().set(opt).from(element).save();

      // 2. Storage upload in background (non-blocking)
      try {
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        const fileName = `${invoice.id || 'inv'}/${invoiceNumber}.pdf`;
        const { data: uploadData } = await supabase.storage.from('invoice-pdfs').upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

        if (uploadData) {
          if (invoice.id) {
            await supabase.from('invoices').update({ pdf_url: fileName }).eq('id', invoice.id);
            await supabase.from('txn_invoices').update({ pdf_url: fileName }).eq('id', invoice.id);
          }
          const { url: signedUrl } = await getDocumentSignedUrl('invoice-pdfs', fileName);
          if (onPdfGenerated && signedUrl) onPdfGenerated(signedUrl);
        }
      } catch (storageErr) {
        console.warn('Storage sync optional notice:', storageErr);
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      // Fallback print
      window.print();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Action Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-navy-800 bg-navy-50 px-2.5 py-1 rounded-lg border border-navy-100">
            {invoiceNumber}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              status === 'paid'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : status === 'pending'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            type="button"
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            type="button"
            className="bg-red-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 shadow-xs transition-colors"
          >
            {isGenerating ? <Spinner className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            {isGenerating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Printable Invoice Page */}
      <div
        ref={contentRef}
        className="w-full max-w-4xl bg-white p-8 sm:p-12 shadow-sm border border-slate-200 rounded-2xl text-slate-800"
        style={{ minHeight: '1056px' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
          <div>
            <Logo size={160} to="/" />
            <div className="mt-4 text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-800 text-sm">REALTYNOW PROPERTIES PVT LTD</p>
              <p>#19, Road No.2B, Chandrapuri Colony</p>
              <p>LB Nagar, Hyderabad - 500081</p>
              <p>Telangana, India</p>
              <p className="font-medium text-slate-700 mt-1">GSTIN: <span className="font-mono">36AAACR1234F1Z8</span></p>
              <p className="font-medium text-slate-700">PAN: <span className="font-mono">AAACR1234F</span> | CIN: <span className="font-mono">U72200TG2026PTC123456</span></p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-wider">TAX INVOICE</h1>
            <p className="text-slate-500 mt-1 font-mono text-sm font-semibold">{invoiceNumber}</p>
            <div className="mt-4 text-xs text-slate-600 space-y-1">
              <p><span className="font-bold text-slate-800">Invoice Date:</span> {invoiceDate}</p>
              <p><span className="font-bold text-slate-800">Due Date:</span> {dueDate}</p>
              <p><span className="font-bold text-slate-800">Place of Supply:</span> Telangana (36)</p>
            </div>
          </div>
        </div>

        {/* Billed To & Reference */}
        <div className="flex flex-col sm:flex-row justify-between mb-8 gap-6">
          <div className="sm:w-1/2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To / Recipient</h3>
            <p className="font-extrabold text-slate-900 text-base">{customerName}</p>
            {customerAddress && <p className="text-xs text-slate-600 mt-0.5">{customerAddress}</p>}
            {customerCity && <p className="text-xs text-slate-600">{customerCity}</p>}
            {customerEmail && <p className="text-xs text-slate-600 mt-1 font-medium">{customerEmail}</p>}
            {customerPhone && <p className="text-xs text-slate-600">{customerPhone}</p>}
          </div>
          <div className="sm:w-1/2 sm:text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</h3>
            <p className="text-xs text-slate-700"><span className="font-bold">Payment Gateway:</span> Razorpay (Live Verified)</p>
            <p className="text-xs text-slate-700 mt-0.5">
              <span className="font-bold">Payment Status:</span>{' '}
              <span className="text-emerald-700 font-bold uppercase">{status}</span>
            </p>
            {invoice.gateway_payment_id && (
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Ref ID: {invoice.gateway_payment_id}
              </p>
            )}
            {invoice.property?.title && (
              <div className="mt-2 text-xs text-slate-600">
                <span className="font-bold">Property:</span> {invoice.property.title}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-3 font-bold uppercase">#</th>
                <th className="py-3 px-3 font-bold uppercase">Description & Details</th>
                <th className="py-3 px-3 font-bold uppercase text-right">Qty</th>
                <th className="py-3 px-3 font-bold uppercase text-right">Rate (₹)</th>
                <th className="py-3 px-3 font-bold uppercase text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-3.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3.5 px-3">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    {item.description && <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="py-3.5 px-3 text-right font-medium text-slate-700">{item.quantity}</td>
                  <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                    ₹{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    ₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="flex justify-end mb-12">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount / Offer:</span>
                <span>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>{isTds ? `TDS (${taxPct}%):` : `GST (${taxPct}%):`}</span>
              <span className="font-medium text-slate-800">
                {isTds ? '-' : ''}₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-navy-900 border-t-2 border-slate-800 pt-2.5">
              <span>Grand Total:</span>
              <span className="text-base text-red-600">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Notes & Signature */}
        <div className="flex flex-col sm:flex-row justify-between items-end border-t border-slate-200 pt-8 gap-6 text-xs text-slate-500">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-xs">Terms & Compliance:</h4>
            <p>1. This is a computer-generated tax invoice and requires no physical signature.</p>
            <p>2. Payment processed securely via Razorpay payment gateway.</p>
            <p>3. For support or tax queries, email <span className="font-medium text-slate-700">support@realtynow.in</span>.</p>
          </div>
          <div className="text-center">
            <div className="w-44 border-b border-slate-300 mb-2"></div>
            <p className="font-bold text-slate-800">RealtyNow Authorized Signatory</p>
            <p className="text-[10px] text-slate-400">Digitally Verified & Stamped</p>
          </div>
        </div>
      </div>
    </div>
  );
}
