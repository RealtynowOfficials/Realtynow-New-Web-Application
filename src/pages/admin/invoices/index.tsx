import React, { useState } from 'react';
import InvoiceTable from './InvoiceTable';
import InvoiceWizard from './InvoiceWizard';
import { DashboardLayout } from '../../../components/dashboard-layout';
import { getAdminSections } from '../../portal/sections';

export default function AdminInvoicesPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const sections = getAdminSections((k: string, fb?: string) => fb || k);

  return (
    <DashboardLayout sections={sections} title="Invoice Management">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-500">Manage property transaction invoices, track payments, and generate PDFs.</p>
        </div>

        {view === 'list' ? (
          <InvoiceTable onCreateNew={() => setView('create')} />
        ) : (
          <InvoiceWizard onCancel={() => setView('list')} />
        )}
      </div>
    </DashboardLayout>
  );
}
