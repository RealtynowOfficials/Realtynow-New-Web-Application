import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { useToast } from '../../components/toast';
import { LayoutList, Trello } from 'lucide-react';
import { BuilderKanbanBoard } from '../../components/builder/BuilderKanbanBoard';
import { UnifiedLeadDetailModal } from '../../components/crm/UnifiedLeadDetailModal';
import { ProfessionalCrmTable } from '../../components/crm/ProfessionalCrmTable';

export function BuilderLeads() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['builder-leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_leads')
        .select('*, builder_projects(id, name, status, cover_image, cities(name), localities(name))')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('builder_leads').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-leads', user?.id] });
      addToast('success', 'Lead status updated');
    },
    onError: (err) => {
      addToast('error', err.message);
    },
  });

  return (
    <DashboardLayout sections={builderSections} title="Leads CRM" badge="Builder">
      <PageHeader
        title="Leads & Inquiries"
        subtitle="Manage leads for your projects."
        actions={[
          {
            icon: viewMode === 'list' ? <Trello className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />,
            label: viewMode === 'list' ? 'Kanban View' : 'CRM Table View',
            onClick: () => setViewMode((v) => (v === 'list' ? 'kanban' : 'list')),
          },
        ]}
      />

      <div className="mt-6">
        {viewMode === 'kanban' ? (
          <BuilderKanbanBoard
            leads={data || []}
            onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
            onOpenLead={(lead) => setSelectedLead(lead)}
          />
        ) : (
          <ProfessionalCrmTable
            leads={data || []}
            isLoading={isLoading}
            error={error instanceof Error ? error.message : null}
            sourceType="builder"
            onRefresh={() => refetch()}
            onViewActivity={(leadId) => navigate(`/builder/crm/${leadId}`)}
          />
        )}
      </div>

      {/* Unified Lead Detail & Stage Stepper Modal */}
      <UnifiedLeadDetailModal
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        sourceType="builder"
        onLeadUpdated={() => refetch()}
      />
    </DashboardLayout>
  );
}
