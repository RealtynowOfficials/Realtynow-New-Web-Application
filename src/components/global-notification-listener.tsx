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
          if (!newNotif) return;

          const title = String(newNotif.title || '').trim();
          const lowerTitle = title.toLowerCase();
          const notifType = String(newNotif.type || '').toLowerCase();

          // Suppress internal AI verification notifications (especially AI verification: Rejected)
          // from displaying as an intrusive toast or push notification
          if (
            lowerTitle.includes('ai verification') ||
            lowerTitle.includes('ai_verif') ||
            notifType === 'property_verification'
          ) {
            return;
          }

          // 1. Show an in-app Toast notification so the user sees it visually on the page
          const isError = lowerTitle.includes('reject') || lowerTitle.includes('fail') || lowerTitle.includes('error');
          addToast(isError ? 'error' : 'success', title || 'New Notification');

          // 2. Trigger browser's native Push Notification API if permission is granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
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
