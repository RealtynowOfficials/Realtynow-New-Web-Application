import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function GlobalNotificationListener() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Only subscribe if the user is authenticated
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // We use a unique channel name for this specific listener to avoid conflict with `useRealtimeNotifications`
    const channelName = `global-notifications-${user.id}-${Math.random().toString(36).substring(7)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as any;
          
          // 1. Show an in-app Toast notification so the user sees it visually on the page
          addToast('info', newNotif.title || 'New Notification');

          // 2. Trigger browser's native Push Notification API if permission is granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.body,
              icon: '/pwa-192x192.png',
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, addToast]);

  return null; // This is a logic-only component, it renders nothing visible directly.
}
