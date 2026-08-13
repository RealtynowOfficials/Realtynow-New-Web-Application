import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Monotonic request counter: only the response to the MOST RECENTLY fired
  // count query is allowed to update state. Without this, a burst of
  // realtime events (e.g. "mark all read" updating N rows fires N separate
  // postgres_changes events) can resolve out of order and let a stale
  // intermediate count overwrite the correct final one.
  const requestSeq = useRef(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    const seq = ++requestSeq.current;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (seq === requestSeq.current) setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Previously this hook only ever updated unreadCount from a realtime
    // event, so it showed 0 on every fresh mount (dashboard load, tab
    // switch, page refresh) until something happened to change afterward —
    // fetch the real starting count immediately instead.
    fetchUnreadCount();

    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          setRefetchFlag((f) => f + 1);
          fetchUnreadCount();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, fetchUnreadCount]);

  return { unreadCount, refetchFlag, setUnreadCount };
}
