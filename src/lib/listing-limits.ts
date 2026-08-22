import { supabase } from './supabase';

export const FREE_PLAN_LIMIT = 5;

export interface ListingUsage {
  used: number;
  limit: number;
  planName: string;
  isFree: boolean;
  canList: boolean;
}

export async function checkListingLimit(userId: string): Promise<ListingUsage> {
  // 1. Get user plan
  const { data: subData } = await supabase
    .from('customer_subscriptions')
    .select(`
      subscription_id,
      subscriptions ( name, features )
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  // @ts-expect-error Types might not exactly match join return
  const planName = subData?.subscriptions?.name || 'Free';
  const isFree = planName === 'Free';
  
  // If not free, no limit applies
  if (!isFree) {
    return { used: 0, limit: Infinity, planName, isFree, canList: true };
  }

  // 2. If free, get properties actually submitted this calendar month —
  // drafts (never submitted) and failed/incomplete attempts don't count.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .neq('status', 'draft')
    .gte('created_at', startOfMonth);

  if (error) {
    console.error('Error fetching listing usage:', error);
  }

  const used = count || 0;
  
  return {
    used,
    limit: FREE_PLAN_LIMIT,
    planName,
    isFree,
    canList: used < FREE_PLAN_LIMIT
  };
}
