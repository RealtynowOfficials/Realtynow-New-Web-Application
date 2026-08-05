import { supabase } from './supabase';

export type SharePlatform = 
  | 'WhatsApp' 
  | 'Facebook' 
  | 'Instagram' 
  | 'Messenger' 
  | 'Telegram' 
  | 'X' 
  | 'LinkedIn' 
  | 'Email' 
  | 'SMS' 
  | 'Copy Link' 
  | 'QR Code' 
  | 'Share Card'
  | 'Native Share';

/**
 * Logs a property share to the database using the RPC function.
 * Tracks analytics for which platforms properties are being shared on.
 */
export async function logPropertyShare(propertyId: string, platform: SharePlatform): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_property_share', {
      p_property_id: propertyId,
      p_platform: platform,
    });
    
    if (error) {
      console.error('Failed to log property share:', error);
    }
  } catch (err) {
    console.error('Exception logging property share:', err);
  }
}
