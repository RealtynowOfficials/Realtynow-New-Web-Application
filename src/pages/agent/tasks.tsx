import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { LayoutTemplate } from 'lucide-react';

export function AgentTasks() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Tasks" badge="Agent">
      <PageHeader title="Tasks & Workflows" subtitle="Manage your daily to-dos and follow-ups." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<LayoutTemplate className="h-8 w-8 text-navy-400" />}
          title="No pending tasks"
          description="You're all caught up! Create a new task to get started."
        />
      </Card>
    </DashboardLayout>
  );
}
