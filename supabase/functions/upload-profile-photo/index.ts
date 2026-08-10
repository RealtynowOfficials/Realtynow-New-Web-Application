import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const BUCKET_BY_ROLE: Record<string, string> = {
  agent: 'profile-images',
  builder: 'builder-media',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') throw new Error('Method not allowed');

    const formData = await req.formData();
    const file = formData.get('file');
    const role = String(formData.get('role') || '');

    if (!(file instanceof File)) throw new Error('file is required');
    const bucket = BUCKET_BY_ROLE[role];
    if (!bucket) throw new Error('Invalid role — must be "agent" or "builder"');
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Allowed: JPG, PNG, WEBP`);
    }
    if (file.size > MAX_SIZE) throw new Error('File size exceeds 5MB limit');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `applications/${role}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    return new Response(JSON.stringify({ url: publicUrlData.publicUrl, path, bucket }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('upload-profile-photo error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
