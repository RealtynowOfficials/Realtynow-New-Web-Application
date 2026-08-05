import { supabase } from '../../../lib/supabase';
import { markDraftSubmitted } from '../../../lib/listing-drafts';
import { triggerAiVerification, triggerPropertySeoGeneration } from '../../../lib/properties';
import type { ListingPurpose, WorkflowField } from '../../../lib/listing-config';

interface PublishParams {
  draftId: string;
  ownerId: string;
  purpose: ListingPurpose;
  answers: Record<string, unknown>;
  allFields: WorkflowField[];
}

/**
 * Maps a listing_drafts.answers blob into a normal `properties` insert using
 * each field's maps_to ('properties.<column>' or 'features.<key>'), so the
 * result flows into the existing admin approval pipeline / v_properties_search
 * / my-properties unmodified.
 */
export async function publishDraft({ draftId, ownerId, purpose, answers, allFields }: PublishParams): Promise<string> {
  const payload: Record<string, unknown> = {
    owner_id: ownerId,
    purpose: purpose.properties_purpose_value,
    status: 'submitted',
    approval_status: 'Pending',
    is_live: false,
    is_draft: false,
  };
  const features: Record<string, unknown> = {};

  for (const field of allFields) {
    if (!field.maps_to) continue;
    const value = answers[field.field_key];
    if (value === undefined) continue;

    if (field.maps_to === 'properties.location') {
      const loc = value as { city_id?: string; locality_id?: string; address?: string };
      if (loc.city_id) payload.city_id = loc.city_id;
      if (loc.locality_id) payload.locality_id = loc.locality_id;
      if (loc.address) payload.address = loc.address;
      continue;
    }

    if (field.maps_to.startsWith('properties.')) {
      const column = field.maps_to.slice('properties.'.length);
      if (field.field_type === 'file') {
        payload[column] = (value as { url: string }[]).map((v) => v.url);
      } else {
        payload[column] = value;
      }
      continue;
    }

    if (field.maps_to.startsWith('features.')) {
      const key = field.maps_to.slice('features.'.length);
      features[key] = value;
    }
  }

  payload.features = features;

  const { data, error } = await supabase.from('properties').insert(payload).select('id').single();
  if (error) throw error;

  const propertyId = (data as { id: string }).id;
  await markDraftSubmitted(draftId, propertyId);
  triggerAiVerification(propertyId);
  triggerPropertySeoGeneration(propertyId);
  return propertyId;
}
