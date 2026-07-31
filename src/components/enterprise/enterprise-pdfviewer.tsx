import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { FileText, Download, Printer, ZoomIn, ZoomOut, ShieldCheck, Check } from 'lucide-react';

interface EnterprisePdfDocumentViewerProps {
  documentTitle?: string;
  documentUrl?: string;
}

export function EnterprisePdfDocumentViewer({
  documentTitle = 'Property Sale Agreement & RERA Title Certificate',
  documentUrl,
}: EnterprisePdfDocumentViewerProps) {
  const { t } = useLanguageContext();
  const [zoom, setZoom] = useState(100);

  return (
    <div className="w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-xl text-white font-sans overflow-hidden">
      {/* PDF Header Toolbar */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {documentTitle}
              <span className="text-[10px] bg-green-500/20 text-green-400 font-extrabold px-2 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> VERIFIED PDF
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">RERA Registration No: P02400003829</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-300 px-1">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {documentUrl && (
            <a
              href={documentUrl}
              download
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-all shadow-md shadow-red-600/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="p-8 bg-slate-950/80 flex items-center justify-center min-h-[400px] overflow-auto">
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-8 shadow-2xl transition-transform"
        >
          <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                RealtyNow Certified Document
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Official Legal Agreement & Ownership Verification Certificate
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-red-600">Doc ID: RN-2026-9482</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued: July 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900">
              THIS AGREEMENT is made and entered into between the Seller and Customer as verified on the RealtyNow
              Enterprise Real Estate Platform.
            </p>
            <p>
              1. **PROPERTY IDENTIFICATION**: All that piece and parcel of residential property located at Gachibowli
              Financial District, Hyderabad 500032, Telangana.
            </p>
            <p>
              2. **TITLE SEARCH & ENCUMBRANCE**: The property title has been subjected to legal audit and found clear,
              marketable, and free from encumbrances.
            </p>
            <p>
              3. **STAMP DUTY & REGISTRATION**: Registration shall be governed as per Telangana State Registration Rules
              & RERA compliance guidelines.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
            <div>Verified By: RealtyNow Compliance Audit Team</div>
            <div className="flex items-center gap-1 text-emerald-600">
              <Check className="w-4 h-4" /> E-Signed & Stamped
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
