import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, ShieldCheck, Clock, Users, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useLanguageContext } from '../lib/i18n/language-context';
import { Card, Button, Badge } from './ui';
import { formatDateTime } from '../lib/utils';
import { useRealtimeMulti } from '../lib/realtime';

export function RemindersWidget() {
  const { user, profile } = useAuth();
  const { t } = useLanguageContext();
  const realtimeTick = useRealtimeMulti(['appointments', 'enquiries', 'properties', 'profiles']);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', user?.id, profile?.role, realtimeTick],
    queryFn: async () => {
      if (!user || !profile) return [];
      const role = profile.role;
      const now = new Date().toISOString();
      const items: any[] = [];

      if (role === 'customer') {
        const { data: appts } = await supabase
          .from('appointments')
          .select('*, property:properties(title)')
          .eq('customer_id', user.id)
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(3);

        if (appts) {
          appts.forEach((a) =>
            items.push({
              id: `appt-${a.id}`,
              title: `Upcoming Visit: ${Array.isArray(a.property) ? a.property[0]?.title : a.property?.title}`,
              subtitle: formatDateTime(a.scheduled_at),
              icon: Calendar,
              color: 'text-brand-600',
              bg: 'bg-brand-50',
              link: '/portal/enquiries',
            }),
          );
        }
      } else if (role === 'agent' || role === 'builder') {
        const { data: appts } = await supabase
          .from('appointments')
          .select('*, property:properties(title)')
          .eq('agent_id', user.id)
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(3);

        if (appts) {
          appts.forEach((a) =>
            items.push({
              id: `appt-${a.id}`,
              title: `Host Visit: ${Array.isArray(a.property) ? a.property[0]?.title : a.property?.title}`,
              subtitle: formatDateTime(a.scheduled_at),
              icon: Calendar,
              color: 'text-brand-600',
              bg: 'bg-brand-50',
              link: `/${role}/appointments`,
            }),
          );
        }

        const { data: enquiries } = await supabase
          .from('enquiries')
          .select('*, property:properties(title)')
          .eq('agent_id', user.id)
          .eq('status', 'new')
          .limit(3);

        if (enquiries) {
          enquiries.forEach((e) =>
            items.push({
              id: `enq-${e.id}`,
              title: `New Enquiry on ${Array.isArray(e.property) ? e.property[0]?.title : e.property?.title}`,
              subtitle: 'Awaiting your response',
              icon: MessageSquare,
              color: 'text-gold-600',
              bg: 'bg-gold-50',
              link: `/${role}/leads`,
            }),
          );
        }
      } else if (role === 'admin') {
        const { data: pendingAgents } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['agent', 'builder'])
          .eq('role_status', 'pending')
          .limit(3);

        if (pendingAgents) {
          pendingAgents.forEach((p) =>
            items.push({
              id: `pend-${p.id}`,
              title: `Pending Application: ${p.first_name} ${p.last_name}`,
              subtitle: `${p.role} account waiting for approval`,
              icon: Users,
              color: 'text-error-600',
              bg: 'bg-error-50',
              link: `/admin/${p.role}-applications`,
            }),
          );
        }

        const { data: pendingProps } = await supabase
          .from('properties')
          .select('id, title')
          .eq('status', 'pending_verification')
          .limit(3);

        if (pendingProps) {
          pendingProps.forEach((p) =>
            items.push({
              id: `prop-${p.id}`,
              title: `Verify Property: ${p.title}`,
              subtitle: 'New listing submitted',
              icon: Building2,
              color: 'text-gold-600',
              bg: 'bg-gold-50',
              link: `/admin/approvals`,
            }),
          );
        }
      }

      return items;
    },
    enabled: !!user && !!profile,
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-navy-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" />
          {t('dashboard:reminders', 'Upcoming Reminders')}
        </h3>
        <Badge variant="info">{reminders?.length || 0}</Badge>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-navy-400 py-2">Loading...</div>
        ) : reminders && reminders.length > 0 ? (
          reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-lg border border-navy-100 p-3 hover:bg-navy-50 transition"
            >
              <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.bg} ${r.color}`}>
                <r.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-900 truncate">{r.title}</p>
                <p className="text-xs text-navy-500 mt-0.5">{r.subtitle}</p>
              </div>
              <Link to={r.link}>
                <Button size="sm" variant="secondary" className="text-xs py-1 px-2 h-auto">
                  View
                </Button>
              </Link>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ShieldCheck className="h-8 w-8 text-navy-200 mb-2" />
            <p className="text-sm font-medium text-navy-900">All caught up!</p>
            <p className="text-xs text-navy-500 mt-1">You have no pending reminders.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
