import { supabase } from './supabase';

export interface ListingPurpose {
  id: string;
  key: string;
  properties_purpose_value: string;
  label: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface WorkflowStep {
  id: string;
  purpose_id: string;
  step_key: string;
  label: string;
  icon: string | null;
  sort_order: number;
}

export type WorkflowFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checklist'
  | 'textarea'
  | 'file'
  | 'location'
  | 'boolean'
  | 'date'
  | 'date_range';

export interface WorkflowFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export interface WorkflowField {
  id: string;
  step_id: string;
  field_key: string;
  label: string;
  field_type: WorkflowFieldType;
  options: string[];
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  validation: WorkflowFieldValidation;
  maps_to: string | null;
  sort_order: number;
}

export async function getListingPurposes(): Promise<ListingPurpose[]> {
  const { data, error } = await supabase
    .from('listing_purposes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as ListingPurpose[];
}

export async function getWorkflowSteps(purposeId: string): Promise<WorkflowStep[]> {
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('purpose_id', purposeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as WorkflowStep[];
}

export async function getWorkflowFields(stepId: string): Promise<WorkflowField[]> {
  const { data, error } = await supabase
    .from('workflow_fields')
    .select('*')
    .eq('step_id', stepId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as WorkflowField[];
}

/** Loads every step + its fields for a purpose in two queries instead of N+1. */
export async function getWorkflowForPurpose(
  purposeId: string,
): Promise<{ steps: WorkflowStep[]; fieldsByStep: Record<string, WorkflowField[]> }> {
  const steps = await getWorkflowSteps(purposeId);
  if (steps.length === 0) return { steps, fieldsByStep: {} };

  const { data, error } = await supabase
    .from('workflow_fields')
    .select('*')
    .in('step_id', steps.map((s) => s.id))
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const fieldsByStep: Record<string, WorkflowField[]> = {};
  for (const field of data as WorkflowField[]) {
    (fieldsByStep[field.step_id] ??= []).push(field);
  }
  return { steps, fieldsByStep };
}
