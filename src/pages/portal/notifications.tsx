import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useRealtimeNotifications } from '../../lib/realtime';
import { cn, relativeTime } from '../../lib/utils';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getPortalSections } from './sections';
import { getAdminSections } from './sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Button, Card, EmptyState, Badge } from '../../components/ui';

export function PortalNotifications() {
  const { user, profile } = useAuth();
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { refetchFlag, setUnreadCount } = useRealtimeNotifications(user?.id);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications-page', user?.id, refetchFlag, filter],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'unread') {
        q = q.is('read_at', null);
      }

      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      setUnreadCount((c) => Math.max(0, c - 1));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      setUnreadCount(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
    },
  });

  const handleNotifClick = (notif: { id: string; link: string | null; read_at: string | null }) => {
    if (!notif.read_at) markReadMutation.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  };

  const sections = profile?.role === 'admin' ? getAdminSections(t) : getPortalSections(t);

  return (
    <DashboardLayout sections={sections} title={t('portal.notifications', 'Notifications')} badge={profile?.role}>
      <PageHeader
        title={t('portal.notifications', 'Notifications')}
        subtitle={t('portal.notificationsDesc', 'Stay updated with your latest alerts and reminders.')}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg bg-navy-100 p-1">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition',
              filter === 'all' ? 'bg-white text-navy-900 shadow' : 'text-navy-600 hover:text-navy-900',
            )}
          >
            {t('common.all', 'All')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition',
              filter === 'unread' ? 'bg-white text-navy-900 shadow' : 'text-navy-600 hover:text-navy-900',
            )}
          >
            {t('portal.unread', 'Unread')}
          </button>
        </div>

        <Button
          variant="secondary"
          onClick={() => markAllReadMutation.mutate()}
          loading={markAllReadMutation.isPending}
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          {t('portal.markAllRead', 'Mark all as read')}
        </Button>
      </div>

      <Card className="divide-y divide-navy-50">
        {isLoading ? (
          <div className="p-8 text-center text-navy-400">Loading...</div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'group flex items-start gap-4 p-4 transition hover:bg-navy-50',
                !notif.read_at && 'bg-gold-50/40',
              )}
            >
              <div className="mt-1 shrink-0">
                {!notif.read_at ? (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gold-100 text-gold-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-navy-100 text-navy-500">
                    <Bell className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900">{notif.title}</p>
                <p className="mt-1 text-sm text-navy-600">{notif.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-navy-400">
                  <span>{relativeTime(notif.created_at)}</span>
                  {notif.type && (
                    <Badge variant="default" className="text-[10px] capitalize">
                      {notif.type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 opacity-0 transition group-hover:opacity-100">
                {notif.link && (
                  <Button size="sm" variant="secondary" onClick={() => handleNotifClick(notif)}>
                    {t('portal.viewDetails', 'View')}
                  </Button>
                )}
                {!notif.read_at && (
                  <button
                    onClick={() => markReadMutation.mutate(notif.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-success-50 hover:text-success-600"
                    title={t('portal.markRead', 'Mark as read')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(notif.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-error-50 hover:text-error-600"
                  title={t('common.delete', 'Delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title={t('portal.noNotifications', 'No notifications')}
            description={
              filter === 'unread'
                ? t('portal.noUnreadNotifsDesc', "You're all caught up!")
                : t('portal.noNotifsDesc', 'When you get alerts, they will show up here.')
            }
          />
        )}
      </Card>
    </DashboardLayout>
  );
}
