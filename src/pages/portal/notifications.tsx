import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, CheckCircle2, AlertCircle, Send, Search, X, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useRealtimeNotifications } from '../../lib/realtime';
import { cn, relativeTime } from '../../lib/utils';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getPortalSections } from './sections';
import { getAdminSections } from './sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Button, Card, EmptyState, Badge, Input, Textarea } from '../../components/ui';
import { useToast } from '../../components/toast';

type ProfileHit = { id: string; first_name: string | null; last_name: string | null; phone: string | null; role: string };

function AdminSendNotificationPanel() {
  const { t } = useLanguageContext();
  const toast = useToast();
  const [mode, setMode] = useState<'user' | 'broadcast'>('user');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ProfileHit | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const { data: hits } = useQuery({
    queryKey: ['admin-notif-user-search', search],
    queryFn: async () => {
      if (search.trim().length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, role')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(8);
      return (data ?? []) as ProfileHit[];
    },
    enabled: mode === 'user' && search.trim().length >= 2 && !selectedUser,
  });

  const reset = () => {
    setTitle('');
    setBody('');
    setLink('');
    setSelectedUser(null);
    setSearch('');
  };

  const send = async () => {
    if (!title.trim()) {
      toast.addToast('error', 'Title is required');
      return;
    }
    if (mode === 'user' && !selectedUser) {
      toast.addToast('error', 'Select a recipient first');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('admin_send_notification', {
        p_title: title.trim(),
        p_body: body.trim() || null,
        p_user_id: mode === 'user' ? selectedUser!.id : null,
        p_broadcast: mode === 'broadcast',
        p_link: link.trim() || null,
      });
      if (error) throw error;
      toast.addToast('success', mode === 'broadcast' ? `Sent to ${data} users` : 'Notification sent');
      reset();
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Send className="h-4 w-4 text-red-600" />
        <h3 className="font-bold text-navy-900">{t('admin.sendNotification', 'Send Notification')}</h3>
      </div>

      <div className="mb-4 flex rounded-lg bg-navy-100 p-1 w-fit">
        <button
          onClick={() => setMode('user')}
          className={cn('flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition', mode === 'user' ? 'bg-white text-navy-900 shadow' : 'text-navy-600')}
        >
          <Search className="h-3.5 w-3.5" /> One user
        </button>
        <button
          onClick={() => setMode('broadcast')}
          className={cn('flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition', mode === 'broadcast' ? 'bg-white text-navy-900 shadow' : 'text-navy-600')}
        >
          <Radio className="h-3.5 w-3.5" /> Broadcast to all
        </button>
      </div>

      {mode === 'user' && (
        <div className="mb-3">
          {selectedUser ? (
            <div className="flex items-center justify-between rounded-xl border border-navy-150 bg-navy-50 px-3 py-2">
              <span className="text-sm font-semibold text-navy-800">
                {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.phone || selectedUser.id}
                <span className="ml-2 text-xs font-normal text-navy-500">({selectedUser.role})</span>
              </span>
              <button onClick={() => setSelectedUser(null)} className="text-navy-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
              />
              {hits && hits.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-navy-100 bg-white shadow-lg">
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedUser(h);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-navy-50"
                    >
                      <span className="font-medium text-navy-800">
                        {[h.first_name, h.last_name].filter(Boolean).join(' ') || h.phone || h.id}
                      </span>
                      <span className="text-xs text-navy-400">{h.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Platform maintenance tonight" />
        <Input label="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/portal/..." />
      </div>
      <div className="mt-3">
        <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Notification body..." />
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={send} loading={sending} icon={<Send className="h-4 w-4" />}>
          {mode === 'broadcast' ? 'Send to everyone' : 'Send'}
        </Button>
      </div>
    </Card>
  );
}

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

      {profile?.role === 'admin' && <AdminSendNotificationPanel />}

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
