import { supabase } from './supabase';
import type { UserRole } from './types';

export interface BulkImportJob {
  id: string;
  created_by: string;
  admin_id: string | null;
  created_by_role: UserRole;
  purpose: 'Sale' | 'Rent';
  file_name: string;
  file_path: string | null;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  duplicate_strategy: 'skip' | 'update' | 'replace' | 'create_new';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface BulkImportRowRecord {
  id: string;
  job_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  resolved_property_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'duplicate';
  duplicate_of_property_id: string | null;
  duplicate_reason: 'title_city_price' | 'reference_id' | 'rera_number' | 'mobile' | null;
}

export interface BulkImportErrorRecord {
  id: string;
  job_id: string;
  row_id: string | null;
  row_number: number;
  field: string | null;
  message: string;
}

export async function createJob(params: {
  ownerId: string;
  role: UserRole;
  purpose: 'Sale' | 'Rent';
  fileName: string;
  totalRows: number;
  duplicateStrategy: BulkImportJob['duplicate_strategy'];
}): Promise<BulkImportJob> {
  const { data, error } = await supabase
    .from('bulk_import_jobs')
    .insert({
      created_by: params.ownerId,
      created_by_role: params.role,
      purpose: params.purpose,
      file_name: params.fileName,
      total_rows: params.totalRows,
      duplicate_strategy: params.duplicateStrategy,
      status: 'Processing',
    })
    .select()
    .single();
  if (error) throw error;
  return data as BulkImportJob;
}

export async function updateJobProgress(
  jobId: string,
  counts: Partial<Pick<BulkImportJob, 'success_rows' | 'failed_rows' | 'skipped_rows'>>,
): Promise<void> {
  const { error } = await supabase.from('bulk_import_jobs').update(counts).eq('id', jobId);
  if (error) throw error;
}

export async function completeJob(jobId: string, status: 'Completed' | 'Failed', errorMessage?: string): Promise<void> {
  const { error } = await supabase
    .from('bulk_import_jobs')
    .update({ status, error_message: errorMessage ?? null, completed_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw error;
}

export async function insertRow(row: {
  jobId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  status: BulkImportRowRecord['status'];
  resolvedPropertyId?: string;
  duplicateOfPropertyId?: string;
  duplicateReason?: BulkImportRowRecord['duplicate_reason'];
}): Promise<void> {
  const { error } = await supabase.from('bulk_import_rows').insert({
    job_id: row.jobId,
    row_number: row.rowNumber,
    raw_data: row.rawData,
    status: row.status,
    resolved_property_id: row.resolvedPropertyId ?? null,
    duplicate_of_property_id: row.duplicateOfPropertyId ?? null,
    duplicate_reason: row.duplicateReason ?? null,
  });
  if (error) throw error;
}

export async function insertError(err: {
  jobId: string;
  rowNumber: number;
  field?: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('bulk_import_errors').insert({
    job_id: err.jobId,
    row_number: err.rowNumber,
    field: err.field ?? null,
    message: err.message,
  });
  if (error) throw error;
}

export async function listJobsForUser(ownerId: string): Promise<BulkImportJob[]> {
  const { data, error } = await supabase
    .from('bulk_import_jobs')
    .select('*')
    .eq('created_by', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as BulkImportJob[];
}

export async function getJobDetail(jobId: string): Promise<{ rows: BulkImportRowRecord[]; errors: BulkImportErrorRecord[] }> {
  const [{ data: rows, error: rowsErr }, { data: errors, error: errorsErr }] = await Promise.all([
    supabase.from('bulk_import_rows').select('*').eq('job_id', jobId).order('row_number', { ascending: true }),
    supabase.from('bulk_import_errors').select('*').eq('job_id', jobId).order('row_number', { ascending: true }),
  ]);
  if (rowsErr) throw rowsErr;
  if (errorsErr) throw errorsErr;
  return { rows: rows as BulkImportRowRecord[], errors: errors as BulkImportErrorRecord[] };
}
