import { supabase } from './supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Uploads a profile photo via the `upload-profile-photo` edge function.
 * The function validates the file server-side and stores it in the
 * appropriate public bucket (profile-images for agents, builder-media for
 * builders), returning a permanent public URL.
 */
export async function uploadProfilePhoto(
  file: File,
  role: 'agent' | 'builder',
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WEBP` };
  }
  if (file.size > MAX_SIZE) {
    return { url: null, error: 'File size exceeds 5MB limit' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('role', role);

  const { data, error } = await supabase.functions.invoke('upload-profile-photo', { body: formData });
  if (error) return { url: null, error: error.message || 'Upload failed' };
  if (data?.error) return { url: null, error: data.error };
  return { url: data?.url ?? null, error: null };
}
