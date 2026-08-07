import { useLanguageContext } from '../../lib/i18n/language-context';
import { getAgentSections } from '../portal/sections';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { Card, EmptyState } from '../../components/ui';
import { Wallet } from 'lucide-react';

export function AgentCommissions() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);

  return (
    <DashboardLayout sections={agentSections} title="Commissions" badge="Agent">
      <PageHeader title="Commissions & Invoices" subtitle="Track your earnings and pending payouts." />
      <Card className="p-8 mt-6">
        <EmptyState
          icon={<Wallet className="h-8 w-8 text-navy-400" />}
          title="No commission data"
          description="Your earnings and invoices will appear here."
        />
      </Card>
    </DashboardLayout>
  );
}
