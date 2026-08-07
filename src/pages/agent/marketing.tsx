import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Megaphone } from 'lucide-react';

export function AgentMarketing() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Marketing" badge="Agent">
      <PageHeader title="Marketing Hub" subtitle="Create flyers, social media assets, and run campaigns." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Megaphone className="h-8 w-8 text-navy-400" />}
          title="No campaigns yet"
          description="Marketing tools will be available here soon."
        />
      </Card>
    </DashboardLayout>
  );
}
