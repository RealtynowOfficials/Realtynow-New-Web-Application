import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ccpratciirppzwjjyrsb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg',
);

async function test() {
  console.log('Inserting a pending property...');
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single();

  if (!user) {
    console.log('No users found to act as owner.');
    return;
  }

  const payload = {
    owner_id: user.id,
    title: 'Test Pending Property',
    description: 'This is a test property submitted by the customer.',
    purpose: 'Sale',
    status: 'pending_verification',
    price: 15000000,
  };

  const { error } = await supabase.from('properties').insert(payload);
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Successfully inserted a pending property!');
  }
}

test();
