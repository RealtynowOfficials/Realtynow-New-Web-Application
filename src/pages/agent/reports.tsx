import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { ScrollText } from 'lucide-react';

export function AgentReports() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Reports" badge="Agent">
      <PageHeader title="Reports" subtitle="Exportable performance metrics and property reports." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<ScrollText className="h-8 w-8 text-navy-400" />}
          title="No reports generated"
          description="Your exported reports will appear here."
        />
      </Card>
    </DashboardLayout>
  );
}
