import { supabase } from './supabase';
import { useQuery } from '@tanstack/react-query';

const FAVORITES_KEY = 'realtynow_favorite_ids';

export function getLocalFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setLocalFavoriteIds(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('realtynow-favorites-updated'));
  } catch {
    /* ignore */
  }
}

export async function isFavorited(propertyId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();
    return !!data;
  }
  return getLocalFavoriteIds().includes(propertyId);
}

export async function toggleFavoriteProperty(propertyId: string, userId?: string, currentStatus?: boolean): Promise<boolean> {
  if (userId) {
    if (currentStatus) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('property_id', propertyId);
      window.dispatchEvent(new Event('realtynow-favorites-updated'));
      return false;
    } else {
      await supabase.from('favorites').insert({ user_id: userId, property_id: propertyId });
      window.dispatchEvent(new Event('realtynow-favorites-updated'));
      return true;
    }
  } else {
    const ids = getLocalFavoriteIds();
    const isNowFavorited = !ids.includes(propertyId);
    const updated = isNowFavorited ? [...ids, propertyId] : ids.filter((id) => id !== propertyId);
    setLocalFavoriteIds(updated);
    return isNowFavorited;
  }
}

// Optional: A function to sync local favorites to DB when a user logs in
export async function syncLocalFavoritesToDb(userId: string) {
  const localIds = getLocalFavoriteIds();
  if (localIds.length === 0) return;

  for (const propertyId of localIds) {
    // Ignore errors for duplicates
    await supabase.from('favorites').insert({ user_id: userId, property_id: propertyId }).select('id').maybeSingle();
  }
  
  // Clear local storage after sync
  setLocalFavoriteIds([]);
}

export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return getLocalFavoriteIds();
      const { data } = await supabase.from('favorites').select('property_id').eq('user_id', userId);
      return (data || []).map(f => f.property_id as string);
    },
    // We can rely on the event listener for guest, but for DB we might need invalidation
  });
}
