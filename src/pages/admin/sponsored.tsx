import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Megaphone, Image as ImageIcon, CheckCircle, XCircle, Clock, Link as LinkIcon } from 'lucide-react';
import { Advertisement, SponsoredListing } from '../../lib/enterprise-types';

export default function AdminSponsoredPage() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [sponsoredListings, setSponsoredListings] = useState<SponsoredListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'banners' | 'listings'>('banners');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: adsData, error: adsError } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      
      const { data: sponsoredData, error: sponsoredError } = await supabase
        .from('sponsored_listings')
        .select('*, properties(title)')
        .order('created_at', { ascending: false });

      if (sponsoredError) throw sponsoredError;

      setAdvertisements(adsData || []);
      setSponsoredListings(sponsoredData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sponsored Ads & Banners</h1>
          <p className="text-gray-500 mt-1">Manage platform advertisements, sponsored property placements, and banners</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
            <Megaphone className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`pb-4 px-4 font-medium text-sm transition-colors ${
            activeTab === 'banners' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('banners')}
        >
          Banner Ads
        </button>
        <button
          className={`pb-4 px-4 font-medium text-sm transition-colors ${
            activeTab === 'listings' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('listings')}
        >
          Sponsored Listings
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : activeTab === 'banners' ? (
        <div className="grid grid-cols-1 gap-6">
          {advertisements.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No banners</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new banner campaign.</p>
            </div>
          ) : (
            advertisements.map((ad) => (
              <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-64 h-48 md:h-auto bg-gray-100 relative">
                  {ad.image_desktop ? (
                    <img src={ad.image_desktop} alt={ad.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ad.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{ad.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{ad.subtitle || 'No subtitle'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ad.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                        ad.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ad.approval_status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Placement</p>
                        <p className="text-sm font-medium text-gray-900">{ad.placement}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Banner Type</p>
                        <p className="text-sm font-medium text-gray-900">{ad.banner_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Impressions</p>
                        <p className="text-sm font-medium text-gray-900">{ad.impressions || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Clicks</p>
                        <p className="text-sm font-medium text-gray-900">{ad.clicks || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(ad.start_date || ad.created_at || '').toLocaleDateString()}
                      {ad.end_date && ` - ${new Date(ad.end_date).toLocaleDateString()}`}
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Edit</button>
                      {ad.approval_status === 'pending' && (
                        <>
                          <button className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="h-5 w-5" /></button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle className="h-5 w-5" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="p-4 font-medium">Property</th>
                  <th className="p-4 font-medium">Spot / Location</th>
                  <th className="p-4 font-medium">Duration</th>
                  <th className="p-4 font-medium">Cost</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sponsoredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No sponsored listings found
                    </td>
                  </tr>
                ) : (
                  sponsoredListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 flex items-center">
                          <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {listing.properties?.title || 'Unknown Property'}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {listing.spot_type} <br/>
                        <span className="text-xs text-gray-400">Idx: {listing.spot_index}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(listing.start_time || '').toLocaleDateString()} - <br/>
                        {new Date(listing.end_time || '').toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        ₹{listing.cost?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          listing.status === 'active' ? 'bg-green-100 text-green-800' :
                          listing.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Manage</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
