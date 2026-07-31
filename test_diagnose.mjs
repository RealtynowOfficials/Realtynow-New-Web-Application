import { createClient } from '@supabase/supabase-js';

// Use ANON key - same as what the browser uses
const supabase = createClient(
  'https://ccpratciirppzwjjyrsb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg',
);

async function diagnose() {
  console.log('=== STEP 1: Fetch ALL properties with NO filters ===');
  const { data: all, error: allErr } = await supabase
    .from('properties')
    .select('id, title, status, owner_id, created_at');
  if (allErr) console.error('Error:', allErr);
  else {
    console.log(`Total properties: ${all.length}`);
    const statusGroups = {};
    all.forEach((p) => {
      statusGroups[p.status] = (statusGroups[p.status] || 0) + 1;
    });
    console.log('Status breakdown:', statusGroups);
  }

  console.log('\n=== STEP 2: Query exactly what Admin Approvals page queries ===');
  const { data: pending, error: pendingErr } = await supabase
    .from('properties')
    .select('id, title, status, owner_id')
    .in('status', ['submitted', 'pending_verification', 'changes_requested', 'approved', 'rejected']);

  if (pendingErr) console.error('Pending query error:', pendingErr);
  else
    console.log(
      `Admin Approvals would show: ${pending.length} properties`,
      pending.map((p) => p.status),
    );

  console.log('\n=== STEP 3: Check RLS - can anon read profiles? ===');
  const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id, role').limit(3);
  if (profileErr) console.error('Profiles RLS error:', profileErr);
  else
    console.log(
      'Profiles visible to anon:',
      profiles.length,
      profiles.map((p) => p.role),
    );
}

diagnose();
