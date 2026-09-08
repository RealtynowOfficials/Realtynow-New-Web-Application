// supabase/functions/admin-delete-members/index.ts
//
// Permanently deletes agent / builder / partner accounts.
// Requires a valid admin session (Authorization: Bearer <access_token>)
// and profiles.role IN ('admin','super_admin').  Uses the service-role key
// to bypass RLS on the relevant tables, so this is the ONLY safe path for
// hard-deleting member records without loosening per-table RLS policies.
//
// Actions (x-action header):
//   delete-agents   → { ids: string[] }   — profiles where role='agent'
//   delete-builders → { ids: string[] }   — rows in builders table
//   delete-partners → { ids: string[] }   — rows in partners table

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-action',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function fail(message: string, status = 400) {
  return json({ success: false, error: message }, status);
}

function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

async function resolveAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer '))
    return { error: 'Authentication required', status: 401 } as const;

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await callerClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: 'Authentication required', status: 401 } as const;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', userId)
    .maybeSingle();

  if (!['admin', 'super_admin'].includes(profile?.role ?? ''))
    return { error: 'Admin access required', status: 403 } as const;
  if (profile?.status !== 'active')
    return { error: 'Admin account is not active', status: 403 } as const;

  return { adminId: userId } as const;
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

  const resolved = await resolveAdmin(req, supabase);
  if ('error' in resolved) return fail(resolved.error, resolved.status);

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) return fail('ids array is required and must not be empty');
  // Validate all ids are non-empty strings (basic sanity check)
  if (!ids.every((id) => typeof id === 'string' && id.length > 0)) return fail('All ids must be non-empty strings');

  // ─── delete-agents ────────────────────────────────────────────────────────
  if (action === 'delete-agents') {
    // 1. Delete profile rows (service-role bypasses RLS)
    const { error: profileErr } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids)
      .eq('role', 'agent');

    if (profileErr) return fail(profileErr.message, 500);

    // 2. Attempt to delete auth.users for permanent removal.
    // We do best-effort; if any individual auth deletion fails we log and continue.
    const authErrors: string[] = [];
    for (const id of ids) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) authErrors.push(`${id}: ${error.message}`);
      } catch (e: unknown) {
        authErrors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({
      success: true,
      deleted: ids.length,
      authWarnings: authErrors.length > 0 ? authErrors : undefined,
    });
  }

  // ─── delete-builders ──────────────────────────────────────────────────────
  if (action === 'delete-builders') {
    const { error } = await supabase.from('builders').delete().in('id', ids);
    if (error) return fail(error.message, 500);
    return json({ success: true, deleted: ids.length });
  }

  // ─── delete-partners ──────────────────────────────────────────────────────
  if (action === 'delete-partners') {
    const { error } = await supabase.from('partners').delete().in('id', ids);
    if (error) return fail(error.message, 500);
    return json({ success: true, deleted: ids.length });
  }

  return fail('Unknown action. Use x-action: delete-agents | delete-builders | delete-partners');
});
