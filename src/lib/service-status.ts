import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const SERVICE_KEYS = {
  AGENT: 'agent',
  BUILDER: 'builder',
  LIST_PROPERTY: 'list_property',
} as const;

export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS];

export interface ServiceSetting {
  service_key: string;
  service_name: string;
  is_active: boolean;
  updated_at: string;
}

// Centralized, DB-backed (not hardcoded) service availability check, with a
// realtime subscription so an admin toggling a service propagates to
// already-open tabs without a reload. Defaults to `true` while loading —
// consumers that need a hard block (registration forms, route guards)
// should gate on `loading === false && !isActive`, not just `!isActive`,
// so a slow network doesn't flash a false "unavailable" state.
export function useServiceStatus(key: ServiceKey): { isActive: boolean; loading: boolean } {
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('service_settings')
      .select('is_active')
      .eq('service_key', key)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsActive(data?.is_active ?? true);
        setLoading(false);
      });

    const channel = supabase
      .channel(`service-settings-${key}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_settings', filter: `service_key=eq.${key}` },
        (payload) => {
          if (cancelled) return;
          setIsActive((payload.new as { is_active: boolean }).is_active);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [key]);

  return { isActive, loading };
}

export async function setServiceStatus(key: ServiceKey, active: boolean, reason?: string) {
  const { data, error } = await supabase.rpc('fn_set_service_status', {
    p_key: key,
    p_active: active,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as { success: boolean; service_key: string; is_active: boolean };
}
