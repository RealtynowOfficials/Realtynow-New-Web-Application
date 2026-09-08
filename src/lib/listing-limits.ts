import { supabase } from './supabase';
import { fetchActiveCustomerSubscription } from './subscriptions';

export const FREE_PLAN_LIMIT = 5;

export interface ListingUsage {
  used: number;
  limit: number;
  planName: string;
  isFree: boolean;
  canList: boolean;
}

export async function checkListingLimit(userId: string): Promise<ListingUsage> {
  if (!userId) {
    return { used: 0, limit: FREE_PLAN_LIMIT, planName: 'Free', isFree: true, canList: false };
  }

  try {
    // 1. Check user role: Admin, agent, builder, partner, developer roles have elevated/unlimited quota
    const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (userProfile?.role && userProfile.role !== 'customer') {
      return { used: 0, limit: Infinity, planName: `${userProfile.role.toUpperCase()} Unlimited`, isFree: false, canList: true };
    }

    // 2. Check if user has an active agent package
    const { count: pkgCount } = await supabase
      .from('agent_packages')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (pkgCount && pkgCount > 0) {
      return { used: 0, limit: Infinity, planName: 'Agent Package (Active)', isFree: false, canList: true };
    }

    // 3. Count non-draft listings owned by this user
    const { count: propertyCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .neq('status', 'draft')
      .in('status', ['submitted', 'published', 'approved', 'active', 'live', 'pending_verification', 'under_review']);

    const used = propertyCount || 0;

    // 4. Check active subscription plan
    const activeSub = await fetchActiveCustomerSubscription(userId);

    if (activeSub && (activeSub.status === 'ACTIVE' || activeSub.status === 'EXPIRING_SOON')) {
      const limit = Number(activeSub.listing_limit) || 5;
      return {
        used,
        limit,
        planName: activeSub.plan_name || 'Active Subscription',
        isFree: false,
        canList: used < limit,
      };
    }

    // 5. Fallback: Starter Free Tier
    return {
      used,
      limit: FREE_PLAN_LIMIT,
      planName: 'Starter Free',
      isFree: true,
      canList: used < FREE_PLAN_LIMIT,
    };
  } catch (err) {
    console.error('Error in checkListingLimit:', err);
    return {
      used: 0,
      limit: FREE_PLAN_LIMIT,
      planName: 'Starter Free',
      isFree: true,
      canList: true,
    };
  }
}

