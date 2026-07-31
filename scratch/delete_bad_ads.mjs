import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
const envContent = fs.readFileSync('e:/Realtynow_new/.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('advertisements').select('*');
  if (error) {
    console.error('Select error:', error);
    return;
  }
  console.log('Ads in DB:', data.length);
  
  if (data.length > 0) {
    const { error: delError } = await supabase.from('advertisements').delete().not('id', 'is', null);
    if (delError) console.error('Delete error:', delError);
    else console.log('Deleted all ads to show default luxury banners!');
  } else {
    console.log('No ads to delete.');
  }
}
run();
