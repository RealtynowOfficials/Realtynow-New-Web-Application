import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Admin client (service role) — can bypass RLS for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse the request body ONCE
    const body = await req.json();
    const { application_id, type, action, remarks, new_stage } = body;

    // Validate required fields early
    if (!application_id) throw new Error('application_id is required');
    if (!type || !['agent', 'builder'].includes(type)) throw new Error('Invalid application type');
    if (!action) throw new Error('action is required');

    // Identify the calling user from JWT (best-effort — non-blocking)
    let adminUserId: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) adminUserId = user.id;
      }
    } catch (authErr) {
      console.warn('Could not resolve admin user from JWT:', authErr);
    }

    console.log(`process-application: action=${action} type=${type} app=${application_id} admin=${adminUserId}`);

    const table = type === 'agent' ? 'agent_applications' : 'builder_applications';

    // Helper: log activity without crashing the main operation
    const logActivity = async (actionLabel: string, details?: string) => {
      try {
        await supabaseAdmin.from('application_activity_logs').insert({
          application_id,
          application_type: type,
          action: actionLabel,
          details: details || null,
          admin_id: adminUserId || null,
        });
      } catch (logErr) {
        console.warn('Activity log insert failed (non-fatal):', logErr);
      }
    };

    // ─── APPROVE ─────────────────────────────────────────────────────────────
    if (action === 'approve') {
      const { data: app, error: appError } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', application_id)
        .single();

      if (appError || !app) throw new Error(`Application not found: ${appError?.message}`);
      if (app.status === 'approved') throw new Error('Application is already approved.');

      // Normalise phone to E.164
      let phone: string = (app.phone || '').replace(/[^0-9+]/g, '');
      if (phone.length === 10) phone = '+91' + phone;
      if (phone && !phone.startsWith('+')) phone = '+' + phone;

      // Create or find existing auth user
      let userId: string | null = null;
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => (phone && u.phone === phone) || u.email === app.email
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const createPayload: any = {
          email: app.email,
          email_confirm: true,
          user_metadata: {
            full_name: type === 'agent' ? `${app.first_name} ${app.last_name}` : app.contact_name,
            role: type,
          },
        };
        if (phone) {
          createPayload.phone = phone;
          createPayload.phone_confirm = true;
        }
        const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser(createPayload);
        if (createErr) throw new Error('Failed to create auth user: ' + createErr.message);
        userId = createdUser.user.id;
      }

      // Upsert profile
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        role: type,
        email: app.email,
        first_name: type === 'agent' ? app.first_name : app.contact_name?.split(' ')[0],
        last_name: type === 'agent' ? app.last_name : app.contact_name?.split(' ').slice(1).join(' '),
        phone: phone || null,
        // license_number carries the RERA number the agent entered at registration —
        // it does NOT mean RERA-verified. That's a separate admin decision (see
        // admin-agent-verification edge function), tracked by rera_verification_status.
        ...(type === 'agent' ? {
          license_number: app.license_number || null,
          company: app.company || null,
          bio: app.bio || null,
          specialization: app.specialization || null,
          assigned_areas: app.assigned_areas || null,
          avatar_url: app.profile_image || null,
          rera_document_url: app.license_doc_url || null,
          rera_verification_status: app.license_number ? 'pending' : 'not_submitted',
        } : {}),
      }, { onConflict: 'id' });

      // For builders, create the public-facing builders row (drives the homepage
      // Verified Builders carousel + public builder profile page). Non-fatal: a
      // failure here must not block the approval/portal-access flow itself.
      if (type === 'builder') {
        const { data: existingBuilder } = await supabaseAdmin
          .from('builders')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        if (!existingBuilder) {
          const { error: builderErr } = await supabaseAdmin.from('builders').insert({
            user_id: userId,
            name: app.company_name,
            logo_url: app.logo_url || null,
            description: app.description || null,
            established_year: app.established_year || null,
            contact_name: app.contact_name,
            contact_email: app.email,
            contact_phone: phone || null,
            status: 'approved',
            public_visible: true,
          });
          if (builderErr) console.error('Failed to create builders record:', builderErr.message);
        }
      }

      // Mark as approved
      const { error: updateErr } = await supabaseAdmin.from(table).update({
        status: 'approved',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', application_id);
      if (updateErr) throw new Error('Failed to update application status: ' + updateErr.message);

      await logActivity('Application Approved', remarks || 'Account provisioned successfully.');

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ─── REJECT ──────────────────────────────────────────────────────────────
    } else if (action === 'reject') {
      const { error: updateErr } = await supabaseAdmin.from(table).update({
        status: 'rejected',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: remarks || null,
      }).eq('id', application_id);
      if (updateErr) throw new Error('Failed to reject application: ' + updateErr.message);

      await logActivity('Application Rejected', remarks || 'Rejected by admin.');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // ─── STAGE CHANGE ─────────────────────────────────────────────────────────
    } else if (action === 'stage_change') {
      if (!new_stage) throw new Error('new_stage is required for stage_change action');

      const validStages = [
        'submitted', 'pending_review', 'document_verification',
        // Agent-specific
        'identity_verification',
        // Builder-specific
        'company_verification', 'project_verification',
        // Shared
        'rera_verification', 'background_verification', 'final_review',
        'approved', 'rejected', 'changes_requested',
      ];
      if (!validStages.includes(new_stage)) {
        throw new Error(`Invalid stage: ${new_stage}`);
      }

      const { error: updateErr } = await supabaseAdmin.from(table)
        .update({ status: new_stage })
        .eq('id', application_id);
      if (updateErr) throw new Error('Failed to update stage: ' + updateErr.message);

      await logActivity(
        `Moved to ${new_stage.replace(/_/g, ' ')}`,
        remarks || null
      );

      return new Response(JSON.stringify({ success: true, new_stage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error(`Invalid action: ${action}`);
    }

  } catch (err: any) {
    console.error('process-application error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
