import { supabase } from './supabase';

export interface ListingDraft {
  id: string;
  owner_id: string;
  purpose_id: string;
  answers: Record<string, unknown>;
  current_step: string | null;
  status: 'in_progress' | 'submitted';
  published_property_id: string | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
}

export async function createDraft(ownerId: string, purposeId: string): Promise<ListingDraft> {
  const { data, error } = await supabase
    .from('listing_drafts')
    .insert({ owner_id: ownerId, purpose_id: purposeId, answers: {} })
    .select()
    .single();
  if (error) throw error;
  return data as ListingDraft;
}

export async function saveDraft(
  id: string,
  answers: Record<string, unknown>,
  currentStep: string,
): Promise<void> {
  const { error } = await supabase
    .from('listing_drafts')
    .update({ answers, current_step: currentStep, last_saved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getDraft(id: string): Promise<ListingDraft | null> {
  const { data, error } = await supabase.from('listing_drafts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ListingDraft | null;
}

export async function markDraftSubmitted(id: string, publishedPropertyId: string): Promise<void> {
  const { error } = await supabase
    .from('listing_drafts')
    .update({ status: 'submitted', published_property_id: publishedPropertyId })
    .eq('id', id);
  if (error) throw error;
}

export async function listMyDrafts(ownerId: string): Promise<ListingDraft[]> {
  const { data, error } = await supabase
    .from('listing_drafts')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'in_progress')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as ListingDraft[];
}
