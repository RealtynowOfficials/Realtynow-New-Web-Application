import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { FileText } from 'lucide-react';

export function AgentDocuments() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Documents" badge="Agent">
      <PageHeader title="Documents" subtitle="Manage agreements, KYC, and property files." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<FileText className="h-8 w-8 text-navy-400" />}
          title="No documents"
          description="Upload or manage your documents here."
        />
      </Card>
    </DashboardLayout>
  );
}
