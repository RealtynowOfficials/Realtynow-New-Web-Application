import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Users } from 'lucide-react';

export function AgentClients() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Clients" badge="Agent">
      <PageHeader title="Client Management" subtitle="Manage your buyers and sellers." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Users className="h-8 w-8 text-navy-400" />}
          title="No clients found"
          description="Start adding clients to build your CRM roster."
        />
      </Card>
    </DashboardLayout>
  );
}
