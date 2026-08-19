import { supabase } from './supabase';
import type { Profile, UserRole } from './types';

/**
 * Ensures that a corresponding row in `public.profiles` exists for the authenticated user.
 * If the row is missing (e.g. signup trigger missed it or guest session), it creates/upserts
 * the profile row so foreign key constraints like `properties_owner_id_profiles_fkey` succeed.
 */
export async function ensureUserProfile(userId?: string | null): Promise<Profile | null> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    const targetUid = userId || authUser?.id;
    if (!targetUid) return null;

    // 1. Check if the profile already exists in DB
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUid)
      .maybeSingle();

    if (existingProfile) {
      return existingProfile as Profile;
    }

    // 2. Profile is missing — synthesize values from auth metadata
    const meta = authUser?.user_metadata || {};
    const email = authUser?.email || null;
    const phone = authUser?.phone || meta.phone || null;

    const firstName =
      meta.first_name ||
      meta.full_name?.split(' ')[0] ||
      (email ? email.split('@')[0] : (phone ? `User-${phone.slice(-4)}` : 'User'));

    const lastName =
      meta.last_name ||
      (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : '') ||
      '';

    const role: UserRole = (meta.role as UserRole) || 'customer';

    // 3. Upsert the profile record into public.profiles
    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: targetUid,
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
          role,
          status: 'active',
          is_mobile_verified: !!phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn('ensureUserProfile insert warning:', insertError.message);
    }

    return (createdProfile as Profile) || null;
  } catch (err) {
    console.error('ensureUserProfile failed:', err);
    return null;
  }
}
