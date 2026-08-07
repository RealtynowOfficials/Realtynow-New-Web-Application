import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Tag } from 'lucide-react';

export function AgentNegotiations() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Negotiations" badge="Agent">
      <PageHeader title="Negotiations & Offers" subtitle="Track active property offers and deals." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Tag className="h-8 w-8 text-navy-400" />}
          title="No active negotiations"
          description="Offers and deals will appear here."
        />
      </Card>
    </DashboardLayout>
  );
}
