import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { UserCircle } from 'lucide-react';

export function AgentProfile() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Profile" badge="Agent">
      <PageHeader title="Public Profile" subtitle="Manage how you appear to customers." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<UserCircle className="h-8 w-8 text-navy-400" />}
          title="Profile setup"
          description="Manage your specializations, service areas, and bio."
        />
      </Card>
    </DashboardLayout>
  );
}
