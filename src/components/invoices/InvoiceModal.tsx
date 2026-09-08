import React from 'react';
import InvoicePreview from './InvoicePreview';
import { Modal } from '../ui';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  title?: string;
  onPdfGenerated?: (pdfUrl: string) => void;
}

export function InvoiceModal({
  isOpen,
  onClose,
  invoice,
  title = 'Tax Invoice & Receipt',
  onPdfGenerated,
}: InvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      <div className="max-h-[80vh] overflow-y-auto p-2 sm:p-4 bg-slate-100 rounded-xl">
        <InvoicePreview invoice={invoice} onPdfGenerated={onPdfGenerated} />
      </div>
    </Modal>
  );
}

export default InvoiceModal;
