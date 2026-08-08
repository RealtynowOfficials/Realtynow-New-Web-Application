import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Subscribe to realtime changes on a table filtered by a column.
 * Returns a counter that increments on every change, so consumers can
 * refetch via react-query's `refetch` or invalidate query keys.
 */
export function useRealtimeCount(
  table: string,
  filter?: { column: string; value: string },
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
): number {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = (filter?.value ? `realtime-${table}-${filter.column}-${filter.value}` : `realtime-${table}-all`) + `-${Math.random().toString(36).substring(7)}`;

    const channel = supabase.channel(channelName);

    if (filter) {
      channel.on(
        'postgres_changes',
        { event, schema: 'public', table, filter: `${filter.column}=eq.${filter.value}` },
        () => setCount((c) => c + 1),
      );
    } else {
      channel.on('postgres_changes', { event, schema: 'public', table }, () => setCount((c) => c + 1));
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, filter?.column, filter?.value, event]);

  return count;
}

/**
 * Subscribe to realtime changes on multiple tables.
 * Returns a single counter that increments on any table change.
 */
export function useRealtimeMulti(tables: string[], filter?: { column: string; value: string }): number {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `realtime-multi-${tables.join('-')}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      if (filter) {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `${filter.column}=eq.${filter.value}` },
          () => setCount((c) => c + 1),
        );
      } else {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => setCount((c) => c + 1));
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tables.join(','), filter?.column, filter?.value]);

  return count;
}

/**
 * Subscribe to notifications for the current user.
 * Returns the unread count and a refetch trigger.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [refetchFlag, setRefetchFlag] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setRefetchFlag((f) => f + 1);
          (async () => {
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .is('read_at', null);
            setUnreadCount(count ?? 0);
          })();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  return { unreadCount, refetchFlag, setUnreadCount };
}
