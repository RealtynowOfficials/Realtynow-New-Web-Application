import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Sparkles } from 'lucide-react';

export function AgentAiAssistant() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="AI Assistant" badge="Agent">
      <PageHeader title="AI Assistant" subtitle="Your smart copilot for real estate." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Sparkles className="h-8 w-8 text-navy-400" />}
          title="Coming Soon"
          description="AI-powered property descriptions and email drafting will be available here."
        />
      </Card>
    </DashboardLayout>
  );
}
