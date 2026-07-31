import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SubscriptionConfig = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
};

class RealtimeManager {
  private channels = new Map<
    string,
    {
      channel: RealtimeChannel;
      callbacks: Set<(payload: any) => void>;
    }
  >();

  /**
   * Safely subscribe to a Supabase Realtime channel.
   * Prevents "cannot add postgres_changes callbacks after subscribe" by centralizing listeners.
   */
  subscribe(channelName: string, config: SubscriptionConfig, callback: (payload: any) => void) {
    const existingEntry = this.channels.get(channelName);

    if (existingEntry) {
      console.warn(`[RealtimeManager] Duplicate realtime channel detected. Reusing: ${channelName}`);
      existingEntry.callbacks.add(callback);
      return;
    }

    // Clean up stale channels from Supabase before recreating
    const existingSupabaseChannels = supabase.getChannels();
    const staleChannel = existingSupabaseChannels.find((c) => c.topic === `realtime:${channelName}`);
    if (staleChannel) {
      console.warn(`[RealtimeManager] Removing stale realtime channel: ${channelName}`);
      supabase.removeChannel(staleChannel);
    }

    const channel = supabase.channel(channelName);
    const callbacks = new Set<(payload: any) => void>();
    callbacks.add(callback);

    channel.on('postgres_changes', config, (payload) => {
      callbacks.forEach((cb) => cb(payload));
    });

    channel.subscribe((status, err) => {
      if (err) {
        console.error(`[RealtimeManager] Error subscribing to ${channelName}:`, err);
      } else if (status === 'SUBSCRIBED') {
        console.log(`[RealtimeManager] Successfully subscribed to ${channelName}`);
      }
    });

    this.channels.set(channelName, { channel, callbacks });
  }

  /**
   * Safely unsubscribe a specific callback from a channel, or completely remove the channel if it's the last listener.
   */
  unsubscribe(channelName: string, callback?: (payload: any) => void) {
    const entry = this.channels.get(channelName);
    if (!entry) return;

    if (callback) {
      entry.callbacks.delete(callback);
      // If there are still listeners, do not remove the channel
      if (entry.callbacks.size > 0) return;
    }

    console.log(`[RealtimeManager] Unsubscribing and removing channel: ${channelName}`);
    supabase.removeChannel(entry.channel);
    this.channels.delete(channelName);
  }

  /**
   * Complete cleanup of all channels (e.g., on user logout)
   */
  cleanup() {
    console.log(`[RealtimeManager] Cleaning up all ${this.channels.size} channels...`);
    this.channels.forEach((entry) => {
      supabase.removeChannel(entry.channel);
    });
    this.channels.clear();
  }
}

export const realtimeManager = new RealtimeManager();
