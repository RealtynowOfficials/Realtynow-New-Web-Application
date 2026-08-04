import { supabase } from './supabase';
import type { Property, PropertyStatus } from './types';

export interface PropertyFilters {
  purpose?: string;
  city_id?: string;
  locality_id?: string;
  property_type_id?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  q?: string;
  is_featured?: boolean;
  is_luxury?: boolean;
  min_area?: number;
  max_area?: number;
  facing?: string;
  possession_status?: string;
  verified_status?: string;
  parking?: number;
  property_age?: number;
  amenities?: string[];
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'ai_recommended' | 'featured' | 'most_viewed' | 'most_contacted';
  limit?: number;
  offset?: number;
}

export function buildPublishedQuery(filters: PropertyFilters = {}) {
  let q = supabase
    .from('v_properties_search')
    .select('*', { count: 'estimated' })
    .or('status.eq.published,is_live.eq.true');

  if (filters.purpose) q = q.eq('purpose', filters.purpose);
  if (filters.city_id) q = q.eq('city_id', filters.city_id);
  if (filters.locality_id) q = q.eq('locality_id', filters.locality_id);
  if (filters.property_type_id) q = q.eq('property_type_id', filters.property_type_id);
  if (filters.min_price != null) q = q.gte('price', filters.min_price);
  if (filters.max_price != null) q = q.lte('price', filters.max_price);
  if (filters.min_area != null) q = q.gte('built_up_area', filters.min_area);
  if (filters.max_area != null) q = q.lte('built_up_area', filters.max_area);
  if (filters.bedrooms != null) q = (filters.bedrooms === 5) ? q.gte('bedrooms', 5) : q.eq('bedrooms', filters.bedrooms);
  if (filters.bathrooms != null) q = (filters.bathrooms === 5) ? q.gte('bathrooms', 5) : q.eq('bathrooms', filters.bathrooms);
  if (filters.parking != null) q = q.gte('parking', filters.parking);
  if (filters.furnishing) q = q.eq('furnishing', filters.furnishing);
  if (filters.facing) q = q.eq('facing', filters.facing);
  if (filters.possession_status) q = q.eq('possession_status', filters.possession_status);
  if (filters.verified_status) q = q.eq('verified_status', filters.verified_status);
  if (filters.property_age != null) q = q.lte('age_of_property', filters.property_age);
  if (filters.is_featured) q = q.eq('is_featured', true);
  if (filters.is_luxury) q = q.eq('is_luxury', true);
  
  if (filters.amenities && filters.amenities.length > 0) {
    q = q.contains('amenities', filters.amenities);
  }

  if (filters.q) {
    const isNumeric = !isNaN(Number(filters.q)) && filters.q.trim() !== '';
    if (isNumeric) {
      q = q.or(`search_text.ilike.%${filters.q}%,price.eq.${filters.q},rent_amount.eq.${filters.q}`);
    } else {
      q = q.ilike('search_text', `%${filters.q}%`);
    }
  }

  const limit = filters.limit ?? 12;
  const offset = filters.offset ?? 0;

  // Sorting Logic
  switch (filters.sort_by) {
    case 'price_asc':
      q = q.order('price', { ascending: true });
      break;
    case 'price_desc':
      q = q.order('price', { ascending: false });
      break;
    case 'area_asc':
      q = q.order('built_up_area', { ascending: true, nullsFirst: false });
      break;
    case 'area_desc':
      q = q.order('built_up_area', { ascending: false, nullsFirst: false });
      break;
    case 'ai_recommended':
      q = q.order('ai_score', { ascending: false, nullsFirst: false });
      break;
    case 'most_viewed':
      q = q.order('view_count', { ascending: false, nullsFirst: false });
      break;
    case 'most_contacted':
      // Using view_count as a proxy if most_contacted column doesn't exist
      q = q.order('view_count', { ascending: false, nullsFirst: false });
      break;
    case 'featured':
      q = q.order('is_featured', { ascending: false }).order('published_at', { ascending: false });
      break;
    case 'newest':
    default:
      q = q.order('published_at', { ascending: false });
      break;
  }

  q = q.range(offset, offset + limit - 1);
  return q;
}

export async function fetchPublishedProperties(filters: PropertyFilters = {}) {
  const q = buildPublishedQuery(filters);
  const { data, error, count } = await q;
  if (error) throw error;
  
  // v_properties_search already returns city_name, locality_name, property_type_name
  return { data: data as Property[], count: count ?? 0 };
}

export async function fetchProperty(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, cities(name), localities(name), property_types(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as unknown as {
    cities?: { name: string };
    localities?: { name: string };
    property_types?: { name: string };
  };
  return {
    ...data,
    city_name: r.cities?.name ?? null,
    locality_name: r.localities?.name ?? null,
    property_type_name: r.property_types?.name ?? null,
  } as unknown as Property;
}

export async function trackPropertyView(propertyId: string, viewerId?: string) {
  await supabase.from('property_views').insert({ property_id: propertyId, viewer_id: viewerId ?? null });
}

export async function updatePropertyStatus(id: string, status: PropertyStatus, reason?: string) {
  if (status === 'approved' || status === 'published') {
    return approveProperty(id);
  } else if (status === 'rejected') {
    return rejectProperty(id, reason);
  }

  const { data, error } = await supabase
    .from('properties')
    .update({
      status,
      approval_status:
        status === 'submitted' || status === 'pending_verification'
          ? 'Pending'
          : status === 'changes_requested'
            ? 'Changes Requested'
            : null,
      is_live: false,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveProperty(id: string) {
  const { data, error } = await supabase.rpc('admin_approve_property', { p_property_id: id });
  if (error) throw error;
  return data;
}

export async function rejectProperty(id: string, reason?: string) {
  const { data, error } = await supabase.rpc('admin_reject_property', {
    p_property_id: id,
    p_reason: reason ?? 'Property listing rejected by admin.',
  });
  if (error) throw error;
  return data;
}

export async function assignAgentToProperty(propertyId: string, agentId: string) {
  const { data, error } = await supabase.rpc('admin_assign_agent', {
    p_property_id: propertyId,
    p_agent_id: agentId,
  });
  if (error) throw error;
  return data;
}

export async function resubmitProperty(propertyId: string) {
  const { data, error } = await supabase.rpc('customer_resubmit_property', {
    p_property_id: propertyId,
  });
  if (error) throw error;
  triggerAiVerification(propertyId);
  return data;
}

// ─── AI Verified Listings ───────────────────────────────────────────────────

/**
 * Fire-and-forget trigger for the `verifyProperty` edge function. Called after a property
 * is submitted/resubmitted so verification runs in the background without blocking the
 * customer's submit flow. Failures are swallowed (best-effort) — the property still ends
 * up in the admin queue with status 'Pending AI' if verification couldn't run.
 */
export function triggerAiVerification(propertyId: string) {
  supabase.functions.invoke('verifyProperty', { body: { property_id: propertyId } }).catch((err) => {
    console.error('AI verification trigger failed:', err);
  });
}

export async function getPropertyVerification(propertyId: string) {
  const { data, error } = await supabase.functions.invoke('getVerificationStatus', {
    body: { property_id: propertyId },
  });
  if (error) throw error;
  return data;
}

export async function adminApproveWithAi(propertyId: string, remarks?: string) {
  const { data, error } = await supabase.functions.invoke('approveProperty', {
    body: { property_id: propertyId, remarks },
  });
  if (error) throw error;
  return data;
}

export async function adminRejectWithAi(propertyId: string, reason: string, remarks?: string) {
  const { data, error } = await supabase.functions.invoke('rejectProperty', {
    body: { property_id: propertyId, reason, remarks },
  });
  if (error) throw error;
  return data;
}

export async function submitPropertyForReview(id: string) {
  return updatePropertyStatus(id, 'submitted');
}

export async function savePropertyDraft(draftId: string | null, payload: any) {
  if (draftId) {
    const { data, error } = await supabase
      .from('properties')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getDraftProperty(draftId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', draftId)
    .single();
  if (error) throw error;
  return data;
}
