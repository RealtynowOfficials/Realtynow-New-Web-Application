import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ccpratciirppzwjjyrsb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg');

async function test() {
  console.log('Testing advertisements...');
  const { data, error } = await supabase.from('advertisements').select('*').limit(1);
  if (error) console.error('advertisements error:', error);
  else console.log('advertisements success', data);
}
test();
