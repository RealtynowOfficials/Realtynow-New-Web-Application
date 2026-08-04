import { supabase } from './supabase';

const PRIVATE_BUCKETS = new Set(['property-documents', 'agent-documents', 'customer-documents', 'company-assets']);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
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
  | 'company-assets';

function validateFile(bucket: StorageBucket, file: File) {
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  let allowedTypes: string[] = [];
  if (bucket.endsWith('-images') || bucket === 'profile-images') {
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
    const { data: signedUrlData } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
    if (signedUrlData?.signedUrl) {
      return { url: signedUrlData.signedUrl, path: filePath, error: null };
    }
    return { url: '', path: filePath, error: 'Failed to create signed URL' };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath, error: null };
}

export async function deleteFile(bucket: StorageBucket, path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error?.message ?? null };
}
