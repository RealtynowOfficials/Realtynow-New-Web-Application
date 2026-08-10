// supabase/functions/admin-agent-verification/index.ts
//
// RERA verification decisions for agents. Like admin-customers, this validates
// the admin portal's custom session token against `admin_sessions` itself (the
// admin panel never establishes a real Supabase Auth session, so `auth.uid()`
// is always null for its requests — RLS-gated direct client writes to
// `profiles` would silently no-op). Also issues short-lived signed URLs for
// the agent's private RERA document (agent-documents bucket) so it is never
// exposed publicly — only to an authenticated admin, on demand.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-action',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function fail(message: string, status = 400) {
  return json({ success: false, error: message }, status);
}

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
}

async function resolveAdmin(supabase: ReturnType<typeof createClient>, token: unknown) {
  if (typeof token !== 'string' || !token) return { error: 'Admin session token is required', status: 401 } as const;

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('admin_id, expires_at')
    .eq('session_token', token)
    .maybeSingle();
  if (!session) return { error: 'Invalid or expired admin session', status: 401 } as const;
  if (new Date(session.expires_at as string).getTime() < Date.now()) {
    return { error: 'Admin session expired', status: 401 } as const;
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id, status')
    .eq('id', session.admin_id as string)
    .maybeSingle();
  if (!admin) return { error: 'Admin account not found', status: 401 } as const;
  if (admin.status !== 'active') return { error: 'Admin account is not active', status: 403 } as const;

  return { adminId: admin.id as string } as const;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return fail('Method not allowed', 405);

  const action = req.headers.get('x-action') || '';
  const supabase = serviceClient();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON body');
  }

  const resolved = await resolveAdmin(supabase, body.token);
  if ('error' in resolved) return fail(resolved.error, resolved.status);

  const agentId = body.agentId;
  if (typeof agentId !== 'string' || !agentId) return fail('agentId is required');

  const { data: agent } = await supabase.from('profiles').select('id, role, rera_document_url').eq('id', agentId).eq('role', 'agent').maybeSingle();
  if (!agent) return fail('Agent not found', 404);

  // ─── verify ────────────────────────────────────────────────────────────
  if (action === 'verify') {
    const { error } = await supabase
      .from('profiles')
      .update({
        rera_verified: true,
        rera_verification_status: 'verified',
        rera_verified_at: new Date().toISOString(),
        rera_verified_by: resolved.adminId,
        rera_rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);
    if (error) return fail(error.message, 500);
    return json({ success: true });
  }

  // ─── reject (reason mandatory) ───────────────────────────────────────
  if (action === 'reject') {
    const reason = body.reason;
    if (typeof reason !== 'string' || !reason.trim()) return fail('A rejection reason is required');

    const { error } = await supabase
      .from('profiles')
      .update({
        rera_verified: false,
        rera_verification_status: 'rejected',
        rera_verified_at: null,
        rera_verified_by: resolved.adminId,
        rera_rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);
    if (error) return fail(error.message, 500);
    return json({ success: true });
  }

  // ─── set-under-review ────────────────────────────────────────────────
  if (action === 'under-review') {
    const { error } = await supabase
      .from('profiles')
      .update({ rera_verification_status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', agentId);
    if (error) return fail(error.message, 500);
    return json({ success: true });
  }

  // ─── get-document (fresh signed URL, admin-only) ──────────────────────
  if (action === 'get-document') {
    if (!agent.rera_document_url) return fail('No RERA document on file', 404);
    const { data, error } = await supabase.storage.from('agent-documents').createSignedUrl(agent.rera_document_url as string, 600);
    if (error || !data?.signedUrl) return fail(error?.message ?? 'Could not generate document URL', 500);
    return json({ success: true, url: data.signedUrl });
  }

  return fail('Unknown action. Use x-action: verify | reject | under-review | get-document');
});
