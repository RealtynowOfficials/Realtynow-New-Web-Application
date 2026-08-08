import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Also get the user who invoked this (the admin)
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user: adminUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !adminUser) {
      throw new Error('Unauthorized');
    }

    const { application_id, type, action, remarks } = await req.json();

    if (!['agent', 'builder'].includes(type)) {
      throw new Error('Invalid application type');
    }
    
    const table = type === 'agent' ? 'agent_applications' : 'builder_applications';

    if (action === 'approve') {
      // 1. Fetch application details
      const { data: app, error: appError } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', application_id)
        .single();
        
      if (appError || !app) throw new Error('Application not found');
      if (app.status === 'approved') throw new Error('Already approved');

      // 2. Format Phone Number
      // Ensure phone is E.164 format. Here we do a basic format assuming India (+91) if 10 digits
      let phone = app.phone.replace(/[^0-9+]/g, '');
      if (phone.length === 10) phone = '+91' + phone;
      if (!phone.startsWith('+')) phone = '+' + phone;

      // 3. Create Auth User (or get if exists)
      let userId = null;
      
      const { data: existingUsers, error: existErr } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((u) => u.phone === phone || u.email === app.email);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          phone: phone,
          email: app.email,
          phone_confirm: true,
          email_confirm: true,
          user_metadata: {
            full_name: type === 'agent' ? `${app.first_name} ${app.last_name}` : app.contact_name,
            role: type
          }
        });
        
        if (createErr) {
          console.error("Auth creation error:", createErr);
          throw new Error('Failed to create auth user: ' + createErr.message);
        }
        userId = createdUser.user.id;
      }

      // 4. Update Profile Role
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        role: type,
        full_name: type === 'agent' ? `${app.first_name} ${app.last_name}` : app.contact_name,
        phone: phone,
      });

      // 5. Create specific record if builder (optional based on your schema)
      if (type === 'builder') {
        const { data: existingBuilder } = await supabaseAdmin.from('builders').select('id').eq('user_id', userId).maybeSingle();
        if (!existingBuilder) {
          await supabaseAdmin.from('builders').insert({
            user_id: userId,
            company_name: app.company_name,
            contact_name: app.contact_name,
            contact_email: app.email,
            contact_phone: phone,
          });
        }
      }

      // 6. Update Application Status
      await supabaseAdmin.from(table).update({ 
        status: 'approved',
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString()
      }).eq('id', application_id);

      // 7. Log Activity
      await supabaseAdmin.from('application_activity_logs').insert({
        application_id,
        application_type: type,
        action: 'Application Approved',
        details: remarks || 'Account provisioned successfully.',
        admin_id: adminUser.id
      });

      // 8. Notification Event Log (Mock for Phase 7)
      // Ideally, trigger Resend / Twilio here or insert into a notifications table
      console.log(`Notification Sent to ${phone}: Your ${type} application is approved.`);

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'reject') {
      
      await supabaseAdmin.from(table).update({ 
        status: 'rejected',
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: remarks
      }).eq('id', application_id);
      
      await supabaseAdmin.from('application_activity_logs').insert({
        application_id,
        application_type: type,
        action: 'Application Rejected',
        details: remarks || 'Rejected by admin.',
        admin_id: adminUser.id
      });
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (action === 'stage_change') {
      const { new_stage } = await req.json();
      
      await supabaseAdmin.from(table).update({ 
        status: new_stage 
      }).eq('id', application_id);
      
      await supabaseAdmin.from('application_activity_logs').insert({
        application_id,
        application_type: type,
        action: `Moved to ${new_stage.replace('_', ' ')}`,
        details: remarks,
        admin_id: adminUser.id
      });
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
