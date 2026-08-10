import { supabase } from './supabase';
import { checkListingLimit } from './listing-limits';
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
  sort_by?: 'newest' | 'price_asc' | 'price_desc' | 'ai_recommended' | 'featured' | 'most_viewed' | 'most_contacted';
  limit?: number;
  offset?: number;
}

// Deterministic, explicit alias map for cities with well-known alternate names —
// NOT fuzzy/semantic matching, so "Bangalore" normalizes to "Bengaluru" (the name
// actually stored in public.cities) without any risk of loosely matching an
// unrelated city like Hyderabad or Chennai. Extend this list only with genuine
// former/alternate names, never near-matches.
const CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  bombay: 'Mumbai',
  mumbai: 'Mumbai',
  madras: 'Chennai',
  chennai: 'Chennai',
  calcutta: 'Kolkata',
  kolkata: 'Kolkata',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
};

// Normalizes known city aliases to the canonical name, and drops a redundant
// "City" qualifier immediately following one (e.g. "Bangalore City" -> "Bengaluru")
// so every phrasing in { Bangalore, Bengaluru, Bangalore City, Bengaluru City }
// collapses to the same query. ILIKE matching is case-insensitive, so the
// canonical casing here is purely for readable AI/UI text, not match correctness.
export function normalizeCityAliases(text: string): string {
  const words = text.split(' ').filter(Boolean);
  const normalized: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const alias = CITY_ALIASES[words[i].toLowerCase()];
    if (alias) {
      normalized.push(alias);
      if (words[i + 1]?.toLowerCase() === 'city') i++;
      continue;
    }
    normalized.push(words[i]);
  }
  return normalized.join(' ');
}

// Trims, collapses whitespace, and drops characters that aren't meaningful for a
// free-text locality/city/project/title search (also sidesteps '%'/'_' which are
// ILIKE pattern metacharacters) — shared by every search entry point so autocomplete,
// the search bar, and category pages all normalize a query the same way.
export function sanitizeSearchQuery(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeCityAliases(cleaned);
}

export function buildPublishedQuery(filters: PropertyFilters = {}) {
  let q = supabase
    .from('v_properties_search')
    .select('*', { count: 'exact' })
    .or('status.eq.published,is_live.eq.true');

  if (filters.purpose) {
    if (filters.purpose.toLowerCase() === 'pg') {
      q = q.or('purpose.ilike.pg,purpose.ilike.coliving,purpose.ilike.hostel,search_text.ilike.%pg%');
    } else {
      q = q.eq('purpose', filters.purpose);
    }
  }
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
    const cleaned = sanitizeSearchQuery(filters.q);
    if (cleaned) {
      const isNumeric = !isNaN(Number(cleaned));
      if (isNumeric) {
        q = q.or(`search_text.ilike.%${cleaned}%,price.eq.${cleaned},rent_amount.eq.${cleaned}`);
      } else {
        // search_text already concatenates title, description, address, city, locality,
        // property type, builder, project, and agent/owner names — so a locality- or
        // city-only query (e.g. "Hyde" → "Hyderabad") matches even when the property's
        // own title/description never mentions it. See v_properties_search view.
        q = q.ilike('search_text', `%${cleaned}%`);
      }
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
  // Direct table update (works with service role or open RLS)
  const { data, error } = await supabase
    .from('properties')
    .update({
      status: 'published',
      approval_status: 'Approved',
      is_live: true,
      approved_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  // Fallback to RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_approve_property', { p_property_id: id });
  if (rpcError) throw rpcError;
  return rpcData;
}

export async function rejectProperty(id: string, reason?: string) {
  const rejReason = reason ?? 'Property listing rejected by admin.';

  const { data, error } = await supabase
    .from('properties')
    .update({
      status: 'rejected',
      approval_status: 'Rejected',
      is_live: false,
      rejection_reason: rejReason,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_reject_property', {
    p_property_id: id,
    p_reason: rejReason,
  });
  if (rpcError) throw rpcError;
  return rpcData;
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
  triggerPropertySeoGeneration(propertyId);
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

/**
 * Fire-and-forget trigger for the `generatePropertySeo` edge function. Generates the SEO
 * title, description, slug, keywords, Open Graph and Twitter Card fields, canonical URL,
 * JSON-LD, and image alt text from the property's own details and writes them straight onto
 * the row — replaces the old customer-facing SEO wizard step. Called on submit, resubmit,
 * and admin approve/publish so SEO stays current whenever the underlying listing changes.
 */
export function triggerPropertySeoGeneration(propertyId: string) {
  supabase.functions.invoke('generatePropertySeo', { body: { property_id: propertyId } }).catch((err) => {
    console.error('SEO generation trigger failed:', err);
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

export async function savePropertyDraft(draftId: string | null, payload: any, submissionId?: string) {
  // Database-level protection against empty drafts
  if (!draftId && !payload.purpose && !payload.category && !payload.property_type_id && !payload.address) {
    throw new Error('Cannot create an empty draft property');
  }

  // Monthly listing limit enforcement for new drafts
  if (!draftId) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const limitStatus = await checkListingLimit(userData.user.id);
      if (!limitStatus.canList) {
        throw new Error('LISTING_LIMIT_REACHED');
      }
    }
  }
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
  } else if (submissionId) {
    const { data, error } = await supabase
      .from('properties')
      .upsert(
        { ...payload, submission_id: submissionId },
        { onConflict: 'submission_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Fallback if no submissionId is provided (e.g., from older callers)
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
