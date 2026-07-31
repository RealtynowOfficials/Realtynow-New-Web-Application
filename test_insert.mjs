import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ccpratciirppzwjjyrsb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg',
);

async function test() {
  console.log('Fetching existing property to clone...');
  const { data: props, error: fetchErr } = await supabase.from('properties').select('*').limit(1);

  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    return;
  }

  if (!props || props.length === 0) {
    console.log('No existing properties found to clone.');
    return;
  }

  const original = props[0];
  console.log(`Cloning property owned by ${original.owner_id}...`);

  const payload = {
    ...original,
    id: undefined, // let DB generate new ID
    created_at: undefined,
    title: 'Dummy Pending Property for Testing',
    status: 'pending_verification', // Force status to pending
    is_featured: false,
    is_luxury: false,
  };

  // Remove fields that are undefined
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  const { error: insertErr } = await supabase.from('properties').insert(payload);
  if (insertErr) {
    console.error('Insert Error:', insertErr);
  } else {
    console.log('Successfully inserted a dummy pending property!');
  }
}

test();
