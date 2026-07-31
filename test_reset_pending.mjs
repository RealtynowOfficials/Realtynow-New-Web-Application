import { createClient } from '@supabase/supabase-js';

// Use the SERVICE ROLE key to bypass RLS for this admin operation
// IMPORTANT: Never expose this key in frontend code!
const supabase = createClient(
  'https://ccpratciirppzwjjyrsb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg',
);

async function resetOneToPending() {
  // Get one published property
  const { data: props } = await supabase.from('properties').select('id, title').eq('status', 'published').limit(1);
  if (!props || props.length === 0) {
    console.log('No published properties found.');
    return;
  }

  const p = props[0];
  console.log(`Resetting "${p.title}" to pending_verification...`);

  const { error } = await supabase.from('properties').update({ status: 'pending_verification' }).eq('id', p.id);
  if (error) console.error('Error:', error);
  else console.log(`✅ Done! Property ID: ${p.id} is now pending_verification`);
}

resetOneToPending();
