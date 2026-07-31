import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ccpratciirppzwjjyrsb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjcHJhdGNpaXJwcHp3amp5cnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzY4MDgsImV4cCI6MjEwMDExMjgwOH0.tH-ksFsb5UDvAyd_XDnW3HWacDFIwHUqt1HW2Rp9eFg');

async function test() {
  console.log('Testing properties...');
  const { data, error } = await supabase.from('properties').select('*').limit(1);
  if (error) console.error('properties error:', error);
  else console.log('properties success');

  console.log('Testing profiles...');
  const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
  if (pError) console.error('profiles error:', pError);
  else console.log('profiles success');
  
  console.log('Testing languages...');
  const { data: lData, error: lError } = await supabase.from('languages').select('*').limit(1);
  if (lError) console.error('languages error:', lError);
  else console.log('languages success');
  
  console.log('Testing user_preferences...');
  const { data: upData, error: upError } = await supabase.from('user_preferences').select('*').limit(1);
  if (upError) console.error('user_preferences error:', upError);
  else console.log('user_preferences success');
  
  console.log('Testing builder_profiles...');
  const { data: bData, error: bError } = await supabase.from('builder_profiles').select('*').limit(1);
  if (bError) console.error('builder_profiles error:', bError);
  else console.log('builder_profiles success');

  console.log('Testing agents...');
  const { data: aData, error: aError } = await supabase.from('agents').select('*').limit(1);
  if (aError) console.error('agents error:', aError);
  else console.log('agents success');
}
test();
