import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Starting property views cleanup...');

  // 1. Fetch all properties that are NOT published
  const { data: nonPublishedProps, error: fetchError } = await supabase
    .from('properties')
    .select('id, status, view_count')
    .neq('status', 'published');

  if (fetchError) {
    console.error('Error fetching properties:', fetchError);
    return;
  }

  console.log(`Found ${nonPublishedProps.length} non-published properties.`);

  const invalidPropertyIds = nonPublishedProps.map(p => p.id);

  if (invalidPropertyIds.length > 0) {
    // 2. Delete all property_views for these properties
    console.log('Deleting invalid property_views...');
    const { error: deleteError } = await supabase
      .from('property_views')
      .delete()
      .in('property_id', invalidPropertyIds);
      
    if (deleteError) {
      console.error('Error deleting property_views:', deleteError);
    } else {
      console.log('Successfully deleted invalid property_views.');
    }

    // 3. Reset view_count to 0 for these properties
    console.log('Resetting view_count to 0 for non-published properties...');
    const { error: resetError } = await supabase
      .from('properties')
      .update({ view_count: 0 })
      .in('id', invalidPropertyIds);

    if (resetError) {
      console.error('Error resetting view_count:', resetError);
    } else {
      console.log('Successfully reset view_count.');
    }
  }

  // 4. For published properties, we should also fix the view_count based on valid property_views
  console.log('Recalculating view_count for published properties...');
  const { data: publishedProps, error: pubError } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('status', 'published');
    
  if (pubError) {
    console.error('Error fetching published properties:', pubError);
  } else if (publishedProps && publishedProps.length > 0) {
    let successCount = 0;
    for (const prop of publishedProps) {
      // First delete owner's own views
      await supabase
        .from('property_views')
        .delete()
        .eq('property_id', prop.id)
        .eq('viewer_id', prop.owner_id);

      // Then count remaining valid views
      const { count, error: countError } = await supabase
        .from('property_views')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', prop.id);
        
      if (!countError && count !== null) {
        await supabase
          .from('properties')
          .update({ view_count: count })
          .eq('id', prop.id);
        successCount++;
      }
    }
    console.log(`Successfully recalculated view_count for ${successCount} published properties.`);
  }

  console.log('Cleanup complete.');
}

run();
