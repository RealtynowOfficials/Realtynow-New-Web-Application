import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PropertyCard } from '../../components/property-card';
import { Heart, Search, Trash2, LayoutGrid, List as ListIcon, Filter } from 'lucide-react';
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
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');

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
        let query;
        if (user) {
          query = supabase
            .from('v_saved_properties')
            .select('*')
            .eq('favorite_user_id', user.id);
        } else {
          query = supabase
            .from('v_properties_search')
            .select('*')
            .in('id', currentFavoriteIds);
        }

        if (searchQuery) {
          query = query.ilike('title', `%${searchQuery}%`);
        }

        const { data, error } = await query;
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
  }, [currentFavoriteIds, user, isLoadingFavorites, searchQuery]);

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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
              <input
                type="text"
                placeholder="Search saved..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 w-48 sm:w-64"
              />
            </div>
            <div className="flex bg-white rounded-lg border border-navy-200 p-1">
              <button
                onClick={() => setViewType('card')}
                className={`p-1.5 rounded-md transition-colors ${viewType === 'card' ? 'bg-navy-50 text-navy-900' : 'text-navy-400 hover:text-navy-700'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewType('table')}
                className={`p-1.5 rounded-md transition-colors ${viewType === 'table' ? 'bg-navy-50 text-navy-900' : 'text-navy-400 hover:text-navy-700'}`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
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
        viewType === 'card' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map(p => (
              <div key={p.id} className="relative group">
                <button
                  onClick={() => handleRemove(p.id)}
                  disabled={removingId === p.id}
                  title="Remove from saved properties"
                  className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-red-500 shadow-md backdrop-blur transition hover:scale-110 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <PropertyCard property={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-navy-600">
                <thead className="bg-navy-50/50 text-navy-900 font-semibold border-b border-navy-100">
                  <tr>
                    <th className="px-6 py-4">Property</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {properties.map(p => (
                    <tr key={p.id} className="hover:bg-navy-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={p.media_urls?.images?.[0] || 'https://via.placeholder.com/150'} 
                            alt={p.title} 
                            className="h-12 w-16 rounded-lg object-cover bg-navy-100"
                          />
                          <div>
                            <p className="font-semibold text-navy-900 line-clamp-1">{p.title}</p>
                            <p className="text-xs text-navy-500">{p.property_type_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {[p.locality_name, p.city_name].filter(Boolean).join(', ')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-navy-900">
                        ₹{(p.price || p.rent_amount || 0).toLocaleString('en-IN')}
                        {p.purpose === 'Rent' ? '/mo' : ''}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemove(p.id)}
                          disabled={removingId === p.id}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 px-3"
                          icon={<Trash2 className="h-4 w-4" />}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
    </DashboardLayout>
  );
}
