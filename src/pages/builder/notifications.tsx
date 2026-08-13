import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Building2, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useRealtimeNotifications } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { useToast } from '../../components/toast';
import { formatDateTime, cn } from '../../lib/utils';
import type { Notification } from '../../lib/types';

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: MessageSquare,
  project: Building2,
  success: CheckCircle2,
  warning: AlertTriangle,
};

function iconForType(type: string | null) {
  if (type && TYPE_ICON[type]) return TYPE_ICON[type];
  return type ? Info : Bell;
}

export function BuilderNotifications() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { refetchFlag, unreadCount, setUnreadCount } = useRealtimeNotifications(user?.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['builder-notifications', user?.id, refetchFlag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
  });

  const notifications = useMemo(() => data ?? [], [data]);
  const unread = useMemo(() => notifications.filter((n) => !n.read_at), [notifications]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-notifications', user?.id] });
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    onError: (err: any) => addToast('error', err.message),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = unread.map((n) => n.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      await logBuilderAudit('mark_all_notifications_read', 'notification', null, { count: ids.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-notifications', user?.id] });
      setUnreadCount(0);
      addToast('success', 'All notifications marked as read.');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  const handleRowClick = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout sections={builderSections} title="Notifications" badge="Builder">
      <PageHeader
        title="Notifications"
        subtitle="Stay on top of leads, project updates, and account alerts."
        actions={
          unread.length > 0
            ? [
                {
                  label: 'Mark all as read',
                  onClick: () => markAllRead.mutate(),
                  primary: true,
                },
              ]
            : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
        <StatCard label="Unread" value={unreadCount} icon={<Bell className="h-5 w-5" />} accent="gold" />
        <StatCard label="Total" value={notifications.length} icon={<Info className="h-5 w-5" />} accent="navy" />
      </div>

      {isLoading ? (
        <Card className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </Card>
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load notifications.'} onRetry={() => refetch()} />
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" description="You're all caught up. New alerts will show up here." />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = iconForType(n.type);
            const isUnread = !n.read_at;
            return (
              <Card
                key={n.id}
                className={cn(
                  'p-4 flex items-start gap-3 cursor-pointer transition-colors hover:border-navy-300',
                  isUnread && 'bg-navy-50 border-navy-200',
                )}
                onClick={() => handleRowClick(n)}
              >
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', isUnread ? 'bg-gold-100 text-gold-600' : 'bg-navy-100 text-navy-500')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-sm font-semibold text-navy-900 truncate', isUnread && 'font-bold')}>{n.title}</p>
                    <span className="shrink-0 text-xs text-navy-400">{formatDateTime(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-1 text-sm text-navy-600">{n.body}</p>}
                </div>
                {isUnread && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(n.id);
                    }}
                  >
                    Mark as read
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
