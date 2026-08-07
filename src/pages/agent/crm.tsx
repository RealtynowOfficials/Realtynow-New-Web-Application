import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Activity } from 'lucide-react';

export function AgentCrm() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="CRM" badge="Agent">
      <PageHeader title="CRM Pipeline" subtitle="Track lead progression and communications." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Activity className="h-8 w-8 text-navy-400" />}
          title="No active pipeline"
          description="Your CRM pipeline will appear here."
        />
      </Card>
    </DashboardLayout>
  );
}
