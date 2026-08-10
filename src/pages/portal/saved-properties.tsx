import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PropertyCard } from '../../components/property-card';
import { Heart, Search, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Link } from 'react-router-dom';
import { useFavorites, getLocalFavoriteIds, toggleFavoriteProperty } from '../../lib/favorites';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useToast } from '../../components/toast';
import { DashboardLayout } from '../../components/dashboard-layout';
import { getPortalSections } from './sections';

export default function SavedProperties() {
  const { user, profile } = useAuth();
  const { t } = useLanguageContext();
  const sections = getPortalSections(t);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Sync state for guest users
  const [guestFavoriteIds, setGuestFavoriteIds] = useState<string[]>([]);
  
  const { data: dbFavoriteIds, isLoading: isLoadingFavorites } = useFavorites(user?.id);

  useEffect(() => {
    if (!user) {
      setGuestFavoriteIds(getLocalFavoriteIds());
      const handleSync = () => setGuestFavoriteIds(getLocalFavoriteIds());
      window.addEventListener('realtynow-favorites-updated', handleSync);
      return () => window.removeEventListener('realtynow-favorites-updated', handleSync);
    }
  }, [user]);

  const currentFavoriteIds = user ? dbFavoriteIds || [] : guestFavoriteIds;

  useEffect(() => {
    async function fetchSavedProperties() {
      if (currentFavoriteIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_properties_search')
          .select('*')
          .in('id', currentFavoriteIds);

        if (error) throw error;
        setProperties(data || []);
      } catch (err) {
        console.error('Error fetching saved properties:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user ? !isLoadingFavorites : true) {
      fetchSavedProperties();
    }
  }, [currentFavoriteIds, user, isLoadingFavorites]);

  const handleRemove = async (propertyId: string) => {
    setRemovingId(propertyId);
    try {
      await toggleFavoriteProperty(propertyId, user?.id, true);
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      if (user) queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
      toast.addToast('success', 'Removed from saved properties');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Could not remove property');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DashboardLayout sections={sections} title={t('common.saved', 'Saved Properties')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900">{t('dashboard.savedProperties', 'Saved Properties')}</h1>
            <p className="mt-1 text-sm text-navy-500">{t('dashboard.savedPropertiesDesc', 'Properties you have favorited')}</p>
          </div>
        </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[300px] rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-3xl border border-navy-50">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-red-50 text-red-500 mb-6 shadow-inner ring-8 ring-red-50/50">
            <Heart className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">No saved properties</h2>
          <p className="text-navy-500 max-w-sm mx-auto mb-8">
            You haven't favorited any properties yet. Browse our listings and click the heart icon to save properties here.
          </p>
          <Link to="/search">
            <Button icon={<Search className="h-4 w-4" />}>
              Browse Properties
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map(p => (
            <div key={p.id} className="relative">
              <button
                onClick={() => handleRemove(p.id)}
                disabled={removingId === p.id}
                title="Remove from saved properties"
                className="absolute left-2.5 top-11 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-navy-500 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-error-50 hover:text-error-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <PropertyCard property={p} />
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
