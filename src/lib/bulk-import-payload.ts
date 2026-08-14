import Papa from 'papaparse';
import { supabase } from './supabase';
import type { WorkflowField } from './listing-config';
import type { UserRole } from './types';

export interface ParsedRow {
  rowNumber: number; // 1-based, excludes header row
  raw: Record<string, string>;
}

export interface FieldError {
  rowNumber: number;
  field: string | null;
  message: string;
}

export interface ResolvedRow {
  rowNumber: number;
  raw: Record<string, string>;
  errors: FieldError[];
  payload: Record<string, unknown> | null;
  duplicateOfPropertyId?: string;
  duplicateOfRowNumber?: number;
  duplicateReason?: 'title_city_price' | 'reference_id' | 'rera_number' | 'mobile';
}

const EXTRA_COLUMNS = ['city', 'property_type', 'locality', 'reference_id', 'rera_number'] as const;
const ADMIN_ONLY_COLUMNS = ['mobile'] as const;

// Resolved via the friendly EXTRA_COLUMNS name-lookup columns instead of asking
// spreadsheet users to type a raw UUID.
const ID_RESOLVED_FIELD_KEYS = new Set(['property_type_id']);

export function templateColumns(fields: WorkflowField[], role: UserRole): string[] {
  const fieldCols = fields
    .filter((f) => f.field_type !== 'file' && f.field_type !== 'location' && !ID_RESOLVED_FIELD_KEYS.has(f.field_key))
    .map((f) => f.field_key);
  const cols = [...fieldCols, ...EXTRA_COLUMNS];
  return role === 'admin' ? [...cols, ...ADMIN_ONLY_COLUMNS] : cols;
}

export async function parseImportFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const records: Record<string, string>[] =
    ext === 'xlsx' || ext === 'xls' ? await parseXlsx(file) : await parseCsv(file);
  return records.map((raw, i) => ({ rowNumber: i + 1, raw: normalizeKeys(raw) }));
}

function normalizeKeys(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.trim()] = v == null ? '' : String(v).trim();
  }
  return out;
}

function parseCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (err: Error) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/** Coerces a raw CSV/XLSX string cell into the type the field needs. */
export function coerceValue(field: WorkflowField, rawValue: string): unknown {
  if (rawValue === '') return undefined;
  switch (field.field_type) {
    case 'number': {
      const cleaned = rawValue.replace(/[^0-9.-]+/g, '');
      const num = Number(cleaned);
      // Aggressive fallback: if they typed "New" or something with no digits, treat it as 0
      return Number.isNaN(num) || cleaned === '' ? 0 : num;
    }
    case 'boolean':
      return ['true', 'yes', '1', 'y', 't', 'active'].includes(rawValue.toLowerCase());
    case 'multiselect':
    case 'checklist': {
      const parts = rawValue.split(/[;,]/).map((v) => v.trim()).filter(Boolean);
      if (field.options && field.options.length > 0) {
        return parts.map(p => field.options!.find(o => o.trim().toLowerCase() === p.toLowerCase()) || p);
      }
      return parts;
    }
    case 'select': {
      if (field.options && field.options.length > 0) {
        const lowerRaw = rawValue.toLowerCase();
        let match = field.options.find(o => o.trim().toLowerCase() === lowerRaw);
        
        // Auto-correct common mistakes for various fields
        if (!match) {
          if (field.field_key === 'ownership_type') {
            if (lowerRaw.includes('owner')) match = 'Individual';
            else if (lowerRaw.includes('broker') || lowerRaw.includes('dealer')) match = 'Agent';
            else if (lowerRaw.includes('developer')) match = 'Builder';
            else match = field.options[0]; // aggressive fallback
          } else if (field.field_key === 'furnishing') {
            if (lowerRaw === 'furnished') match = 'Fully Furnished';
            else if (lowerRaw === 'none' || lowerRaw === 'no') match = 'Unfurnished';
            else if (lowerRaw.includes('semi')) match = 'Semi-Furnished';
            else match = 'Unfurnished';
          }
        }

        if (match) return match;
      }
      return rawValue;
    }
    default:
      return rawValue;
  }
}

/** Pure per-row field validation against workflow_fields config — no DB calls. */
export function validateRow(fields: WorkflowField[], raw: Record<string, string>, rowNumber: number): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of fields) {
    if (field.field_type === 'file' || field.field_type === 'location' || ID_RESOLVED_FIELD_KEYS.has(field.field_key)) continue;
    const rawValue = raw[field.field_key] ?? '';
    if (field.is_required && rawValue === '') {
      errors.push({ rowNumber, field: field.field_key, message: `${field.label} is required` });
      continue;
    }
    if (rawValue === '') continue;

    const value = coerceValue(field, rawValue);
    const v = field.validation ?? {};
    if (field.field_type === 'number') {
      const num = value as number;
      if (Number.isNaN(num)) {
        errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be a number` });
      } else {
        if (v.min != null && num < v.min) errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be at least ${v.min}` });
        if (v.max != null && num > v.max) errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be at most ${v.max}` });
      }
    }
    if (field.field_type === 'select' && field.options && field.options.length > 0 && field.field_key !== 'property_type_id') {
      const match = field.options.find((o) => o.trim().toLowerCase() === rawValue.toLowerCase());
      if (!match) errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be one of: ${field.options.map(o => o.trim()).join(', ')}` });
    }
    if (field.field_type === 'text' || field.field_type === 'textarea') {
      const str = value as string;
      if (v.minLength != null && str.length < v.minLength) errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be at least ${v.minLength} characters` });
      if (v.maxLength != null && str.length > v.maxLength) errors.push({ rowNumber, field: field.field_key, message: `${field.label} must be at most ${v.maxLength} characters` });
    }
  }
  return errors;
}

/** Pure maps_to-driven payload builder — same transform as dynamic-listing/publish.ts, standalone by design. */
export function buildRowPayload(
  fields: WorkflowField[],
  raw: Record<string, string>,
  base: { ownerId: string; assignedAgentId?: string; purposeValue: string; cityId?: string; localityId?: string },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    owner_id: base.ownerId,
    purpose: base.purposeValue,
    status: 'submitted',
    approval_status: 'Pending',
    is_live: false,
    is_draft: false,
  };
  if (base.assignedAgentId) payload.assigned_agent_id = base.assignedAgentId;
  if (base.cityId) payload.city_id = base.cityId;
  if (base.localityId) payload.locality_id = base.localityId;

  const features: Record<string, unknown> = {};
  const rera = raw.rera_number?.trim();
  if (rera) features.rera_number = rera;

  for (const field of fields) {
    if (!field.maps_to || field.field_type === 'file' || field.field_type === 'location') continue;
    const rawValue = raw[field.field_key] ?? '';
    // For empty cells: number fields that map directly to `properties.*` default
    // to 0 so NOT NULL columns (e.g. `price`) are never omitted from the payload.
    if (rawValue === '') {
      if (field.field_type === 'number' && field.maps_to.startsWith('properties.')) {
        const colName = field.maps_to.slice('properties.'.length);
        payload[colName] = 0;
      }
      continue;
    }
    const value = coerceValue(field, rawValue);

    if (field.maps_to === 'properties.property_type_id') {
      // resolved separately (name -> id) before this function runs; caller overwrites payload.property_type_id
      continue;
    }
    if (field.maps_to.startsWith('properties.')) {
      payload[field.maps_to.slice('properties.'.length)] = value;
    } else if (field.maps_to.startsWith('features.')) {
      features[field.maps_to.slice('features.'.length)] = value;
    }
  }
  payload.features = features;
  return payload;
}

export interface ReferenceData {
  cities: Map<string, string>; // lowercase name -> id
  propertyTypes: Map<string, string>;
  localitiesByCity: Map<string, Map<string, string>>; // city_id -> (lowercase locality name -> id)
}

/** Fetches cities/property_types once, and localities scoped to the cities actually referenced. */
export async function loadReferenceData(rows: ParsedRow[]): Promise<ReferenceData> {
  const [{ data: cities }, { data: types }] = await Promise.all([
    supabase.from('cities').select('id,name'),
    supabase.from('property_types').select('id,name'),
  ]);

  const cityMap = new Map<string, string>();
  for (const c of (cities as { id: string; name: string }[]) ?? []) cityMap.set(c.name.trim().toLowerCase(), c.id);

  const typeMap = new Map<string, string>();
  for (const t of (types as { id: string; name: string }[]) ?? []) typeMap.set(t.name.trim().toLowerCase(), t.id);

  const referencedCityIds = new Set<string>();
  for (const row of rows) {
    const cityId = cityMap.get((row.raw.city ?? '').trim().toLowerCase());
    if (cityId) referencedCityIds.add(cityId);
  }

  const localitiesByCity = new Map<string, Map<string, string>>();
  if (referencedCityIds.size > 0) {
    const { data: localities } = await supabase
      .from('localities')
      .select('id,name,city_id')
      .in('city_id', [...referencedCityIds]);
    for (const l of (localities as { id: string; name: string; city_id: string }[]) ?? []) {
      if (!localitiesByCity.has(l.city_id)) localitiesByCity.set(l.city_id, new Map());
      localitiesByCity.get(l.city_id)!.set(l.name.trim().toLowerCase(), l.id);
    }
  }

  return { cities: cityMap, propertyTypes: typeMap, localitiesByCity };
}

interface DuplicateMatch {
  propertyId: string;
  reason: 'title_city_price' | 'reference_id' | 'rera_number';
}

/** Cross-DB duplicate lookup, batched. Scoped to the importer's own rows (owner_id or assigned_agent_id). */
export async function findDbDuplicates(
  rows: { rowNumber: number; title: string; cityId?: string; referenceId?: string; reraNumber?: string }[],
  scope: { ownerId: string; assignedAgentId?: string },
): Promise<Map<number, DuplicateMatch>> {
  const result = new Map<number, DuplicateMatch>();
  const scopeColumn = scope.assignedAgentId ? 'assigned_agent_id' : 'owner_id';
  const scopeValue = scope.assignedAgentId ?? scope.ownerId;

  const referenceIds = rows.map((r) => r.referenceId).filter((v): v is string => !!v);
  if (referenceIds.length > 0) {
    const { data } = await supabase.from('properties').select('id').in('id', referenceIds).eq(scopeColumn, scopeValue);
    const found = new Set((data as { id: string }[] | null)?.map((p) => p.id) ?? []);
    for (const row of rows) {
      if (row.referenceId && found.has(row.referenceId)) {
        result.set(row.rowNumber, { propertyId: row.referenceId, reason: 'reference_id' });
      }
    }
  }

  const reraValues = [...new Set(rows.map((r) => r.reraNumber).filter((v): v is string => !!v))];
  if (reraValues.length > 0) {
    const { data } = await supabase
      .from('properties')
      .select('id, features')
      .eq(scopeColumn, scopeValue)
      .or(reraValues.map((v) => `features->>rera_number.eq.${v}`).join(','));
    const byRera = new Map<string, string>();
    for (const p of (data as { id: string; features: Record<string, unknown> }[] | null) ?? []) {
      const rera = p.features?.rera_number as string | undefined;
      if (rera) byRera.set(rera, p.id);
    }
    for (const row of rows) {
      if (result.has(row.rowNumber)) continue;
      if (row.reraNumber && byRera.has(row.reraNumber)) {
        result.set(row.rowNumber, { propertyId: byRera.get(row.reraNumber)!, reason: 'rera_number' });
      }
    }
  }

  const withTitleCity = rows.filter((r) => !result.has(r.rowNumber) && r.cityId);
  if (withTitleCity.length > 0) {
    const titles = [...new Set(withTitleCity.map((r) => r.title.toLowerCase()))];
    const cityIds = [...new Set(withTitleCity.map((r) => r.cityId!))];
    const { data } = await supabase
      .from('properties')
      .select('id, title, city_id')
      .eq(scopeColumn, scopeValue)
      .in('city_id', cityIds)
      .in('title', titles); // exact match on normalized casing is a reasonable Phase 1 heuristic
    const byKey = new Map<string, string>();
    for (const p of (data as { id: string; title: string; city_id: string }[] | null) ?? []) {
      byKey.set(`${p.title.toLowerCase()}|${p.city_id}`, p.id);
    }
    for (const row of withTitleCity) {
      const match = byKey.get(`${row.title.toLowerCase()}|${row.cityId}`);
      if (match) result.set(row.rowNumber, { propertyId: match, reason: 'title_city_price' });
    }
  }

  return result;
}

/** In-file duplicate detection by normalized title+city — pure, no DB calls. */
export function findInFileDuplicates(rows: { rowNumber: number; title: string; city: string }[]): Map<number, number> {
  const seen = new Map<string, number>();
  const duplicates = new Map<number, number>();
  for (const row of rows) {
    const key = `${row.title.trim().toLowerCase()}|${row.city.trim().toLowerCase()}`;
    if (!key.trim()) continue;
    if (seen.has(key)) {
      duplicates.set(row.rowNumber, seen.get(key)!);
    } else {
      seen.set(key, row.rowNumber);
    }
  }
  return duplicates;
}
