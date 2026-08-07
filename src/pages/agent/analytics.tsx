import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentKanbanBoard } from '../../components/agent/AgentKanbanBoard';
import { AgentAnalyticsDashboard } from '../../components/agent/AgentAnalyticsDashboard';
import { AiLeadAssistant } from '../../components/agent/AiLeadAssistant';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  MessageSquare,
  Eye,
  Calendar,
  Phone,
  Mail,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Star,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, StatCard, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Skeleton, Badge, Button, EmptyState, Modal, Input, Textarea, Select, Avatar } from '../../components/ui';
import { StatusBadge } from '../../components/property-card';
import { DataTable, type Column } from '../../components/data-table';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate, formatNumber , generatePropertyUrl} from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { RemindersWidget } from '../../components/reminders-widget';
import type { Property } from '../../lib/types';
import { ExportMenu } from '../../components/export-menu';
import { SavedFiltersMenu } from '../../components/saved-filters-menu';
import { useSavedFilters } from '../../lib/saved-filters';

const AGENT_PROPERTIES_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Property' },
  { key: 'locality_name', label: 'Locality' },
  { key: 'city_name', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'status', label: 'Status' },
  { key: 'view_count', label: 'Views' },
  { key: 'created_at', label: 'Created' },
];

interface AgentPropertiesFilterState {
  status: string;
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
}

const LEAD_STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
const APPT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export function AgentAnalytics() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user } = useAuth();
  const { data: properties } = useQuery({
    queryKey: ['agent-properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, view_count, status, purpose, price, created_at')
        .eq('assigned_agent_id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: leads } = useQuery({
    queryKey: ['agent-leads-analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('enquiries').select('status, created_at').eq('agent_id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalViews = (properties ?? []).reduce((a, p) => a + (p.view_count ?? 0), 0);
  const published = (properties ?? []).filter((p) => p.status === 'published').length;
  const newLeads = (leads ?? []).filter((l) => l.status === 'new').length;
  const closedLeads = (leads ?? []).filter((l) => l.status === 'closed').length;
  const conversionRate = leads && leads.length > 0 ? ((closedLeads / leads.length) * 100).toFixed(1) : '0.0';
  const totalValue = (properties ?? []).filter((p) => p.status === 'published').reduce((a, p) => a + (p.price ?? 0), 0);

  const topProperties = (properties ?? []).sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 8);

  return (
    <DashboardLayout sections={agentSections} title="Analytics" badge="Agent">
      <PageHeader title="Performance analytics" subtitle="Track your portfolio performance with real data." />
      
      <AgentAnalyticsDashboard />

      <h3 className="font-display font-semibold text-navy-900 mt-8 mb-4">Property Portfolio</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Views"
          value={formatNumber(totalViews)}
          icon={<Eye className="h-5 w-5" />}
          accent="navy"
          to="/agent/properties"
        />
        <StatCard
          label="Published"
          value={published}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
          to="/agent/properties"
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="gold"
          to="/agent/leads"
        />
        <StatCard
          label="Portfolio Value"
          value={formatPrice(totalValue, 'Sale')}
          icon={<Building2 className="h-5 w-5" />}
          accent="navy"
          to="/agent/properties"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900">Lead funnel</h3>
          <div className="mt-4 space-y-3">
            {[
              { label: 'New', count: newLeads, color: 'bg-navy-700' },
              {
                label: 'Contacted',
                count: (leads ?? []).filter((l) => l.status === 'contacted').length,
                color: 'bg-gold-400',
              },
              { label: 'Closed', count: closedLeads, color: 'bg-success-500' },
              { label: 'Spam', count: (leads ?? []).filter((l) => l.status === 'spam').length, color: 'bg-error-500' },
            ].map((s) => {
              const max = leads?.length ?? 1;
              const pct = max > 0 ? (s.count / max) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-700">{s.label}</span>
                    <span className="font-semibold text-navy-900">{s.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-100">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-navy-900">Top performing properties</h3>
          <div className="mt-4 space-y-2">
            {topProperties.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-navy-50/40 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium text-navy-800 truncate flex-1">
                  <span className="text-xs text-navy-400">#{i + 1}</span>
                  {p.title ?? p.id.slice(0, 8)}
                </span>
                <span className="flex items-center gap-1 text-sm text-navy-600">
                  <Eye className="h-4 w-4" /> {p.view_count ?? 0}
                </span>
              </div>
            ))}
            {topProperties.length === 0 && <p className="py-6 text-center text-sm text-navy-400">No data yet.</p>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

