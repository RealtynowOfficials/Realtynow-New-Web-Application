import { z } from 'zod';
import type { WorkflowField } from '../../../lib/listing-config';

/** Builds a zod object schema for one workflow step from its field config. */
export function buildStepSchema(fields: WorkflowField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.field_key] = buildFieldSchema(field);
  }
  return z.object(shape);
}

function buildFieldSchema(field: WorkflowField): z.ZodTypeAny {
  const v = field.validation ?? {};

  switch (field.field_type) {
    case 'number': {
      let s = z.coerce.number();
      if (v.min != null) s = s.min(v.min, `${field.label} must be at least ${v.min}`);
      if (v.max != null) s = s.max(v.max, `${field.label} must be at most ${v.max}`);
      return field.is_required ? s : s.optional();
    }
    case 'boolean':
      return z.boolean().optional();
    case 'multiselect':
    case 'checklist':
      return field.is_required
        ? z.array(z.string()).min(1, `${field.label} is required`)
        : z.array(z.string()).optional();
    case 'file':
      return field.is_required
        ? z.array(z.object({ url: z.string(), path: z.string() })).min(1, `${field.label} is required`)
        : z.array(z.object({ url: z.string(), path: z.string() })).optional();
    case 'location':
      return field.is_required
        ? z.object({
            address: z.string().min(1, 'Address is required'),
            city_id: z.string().min(1, 'City is required'),
            locality_id: z.string().optional(),
          }).passthrough()
        : z.object({}).passthrough().optional();
    default: {
      let s = z.string();
      if (v.minLength != null) s = s.min(v.minLength, `${field.label} must be at least ${v.minLength} characters`);
      if (v.maxLength != null) s = s.max(v.maxLength, `${field.label} must be at most ${v.maxLength} characters`);
      if (v.pattern) s = s.regex(new RegExp(v.pattern), `Invalid ${field.label}`);
      return field.is_required ? s.min(1, `${field.label} is required`) : s.optional();
    }
  }
}

/** Validates one step's answers; returns a field_key -> error message map (empty if valid). */
export function validateStep(fields: WorkflowField[], answers: Record<string, unknown>): Record<string, string> {
  const schema = buildStepSchema(fields);
  const relevant: Record<string, unknown> = {};
  for (const field of fields) relevant[field.field_key] = answers[field.field_key];

  const result = schema.safeParse(relevant);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
