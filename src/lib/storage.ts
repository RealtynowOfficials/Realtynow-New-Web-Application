import { supabase } from './supabase';

const PRIVATE_BUCKETS = new Set(['property-documents', 'agent-documents', 'customer-documents', 'company-assets', 'bulk-import-files', 'builder-documents', 'partner-documents']);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_IMPORT_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type StorageBucket =
  | 'property-images'
  | 'property-videos'
  | 'property-documents'
  | 'agent-documents'
  | 'customer-documents'
  | 'profile-images'
  | 'blog-images'
  | 'advertisements'
  | 'company-assets'
  | 'bulk-import-files'
  | 'builder-documents'
  | 'builder-media'
  | 'partner-documents';

function validateFile(bucket: StorageBucket, file: File) {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  let allowedTypes: string[] = [];
  if (bucket === 'bulk-import-files') {
    allowedTypes = ALLOWED_IMPORT_TYPES;
  } else if (bucket.endsWith('-images') || bucket === 'profile-images') {
    allowedTypes = ALLOWED_IMAGE_TYPES;
  } else if (bucket.endsWith('-videos')) {
    allowedTypes = ALLOWED_VIDEO_TYPES;
  } else {
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
  }

  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`;
  }

  return null;
}

function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext) return ext;
  return 'bin';
}

/**
 * Upload a file to Supabase Storage.
 * For PRIVATE buckets: returns { path: permanent_storage_path, url: fresh_signed_url_for_immediate_use }
 * For PUBLIC buckets:  returns { path: storage_path, url: public_url }
 *
 * IMPORTANT: Always store `path` in the database, NOT `url`.
 * `url` for private buckets is a short-lived signed URL (1 hour) for immediate preview only.
 * To preview later, call `getDocumentSignedUrl(bucket, path)` to get a fresh URL.
 */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  path?: string,
): Promise<{ url: string; path: string; error: string | null }> {
  const validationError = validateFile(bucket, file);
  if (validationError) return { url: '', path: '', error: validationError };

  const ext = getExtension(file.name);
  const filePath = path ?? `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return { url: '', path: '', error: error.message };

  if (PRIVATE_BUCKETS.has(bucket)) {
    // For private buckets: generate a fresh signed URL for immediate use.
    // DO NOT store this URL in the database — store `path` instead.
    const { data: signedUrlData } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
    return { url: signedUrlData?.signedUrl ?? '', path: filePath, error: null };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath, error: null };
}

export async function deleteFile(bucket: StorageBucket, path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error?.message ?? null };
}

/**
 * Generate a fresh signed URL for a private document from its permanent storage path.
 * Always call this on-demand — never cache the result long-term.
 *
 * @param bucket  - The Supabase Storage bucket name
 * @param path    - The permanent storage object path (e.g. 'applications/id-123-govt.png')
 * @param expiresInSeconds - How long the signed URL is valid (default: 900 = 15 min)
 */
export async function getDocumentSignedUrl(
  bucket: StorageBucket | string,
  path: string,
  expiresInSeconds = 900,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error) return { url: null, error: error.message };
    return { url: data?.signedUrl ?? null, error: null };
  } catch (e: any) {
    return { url: null, error: e?.message ?? 'Failed to generate document URL' };
  }
}

/**
 * Parse a Supabase Storage URL (signed or public) to extract bucket and path.
 * Returns null if the URL is not a recognisable Supabase Storage URL.
 *
 * Handles:
 *   .../storage/v1/object/sign/{bucket}/{path}?token=...
 *   .../storage/v1/object/public/{bucket}/{path}
 */
export function parseStorageUrl(
  url: string,
): { bucket: string; path: string; isSignedUrl: boolean } | null {
  try {
    // Signed URL
    const signMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/);
    if (signMatch) {
      return {
        bucket: signMatch[1],
        path: decodeURIComponent(signMatch[2]),
        isSignedUrl: true,
      };
    }
    // Public URL
    const pubMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
    if (pubMatch) {
      return {
        bucket: pubMatch[1],
        path: decodeURIComponent(pubMatch[2]),
        isSignedUrl: false,
      };
    }
    return null;
  } catch {
    return null;
  }
}
