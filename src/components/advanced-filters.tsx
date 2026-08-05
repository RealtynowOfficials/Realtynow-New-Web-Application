import React, { useState, useEffect } from 'react';
import { 
  Filter, X, ChevronDown, Check, SlidersHorizontal, MapPin, 
  Home, Building2, Calendar, Map, CheckCircle2 
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { PropertyFilters } from '../lib/properties';

interface AdvancedFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (filters: Partial<PropertyFilters>) => void;
  onCloseMobile?: () => void;
  cities?: { id: string; name: string }[];
}

const PROPERTY_CATEGORIES = ['Buy', 'Rent', 'PG', 'Commercial', 'Projects', 'Plots'];
const PROPERTY_TYPES = [
  'PG / Co-Living', 'Hostel', 'Apartment', 'Villa', 'Independent House', 'Penthouse', 'Studio', 
  'Farm Land', 'Office Space', 'Warehouse', 'Shop', 'Builder Floor'
];
const BHK_OPTIONS = [1, 2, 3, 4, 5];
const POSSESSION_STATUSES = ['Ready to Move', 'Under Construction', 'New Launch'];
const FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East'];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const VERIFIED_OPTIONS = ['Owner Listed', 'Agent Listed', 'Builder Listed', 'Verified'];
const AMENITIES = [
  'Lift', 'Gym', 'Swimming Pool', 'Security', 'Power Backup', 
  'Club House', 'Children Park', 'Parking', 'Garden'
];

export function AdvancedFilters({ filters, onFilterChange, onCloseMobile, cities = [] }: AdvancedFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    location: true,
    category: true,
    price: true,
    bhk: true,
    possession: false,
    area: false,
    amenities: false,
    more: false,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleAmenityChange = (amenity: string) => {
    const current = filters.amenities || [];
    const next = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    onFilterChange({ amenities: next });
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-xl shadow-slate-200/40 p-5 w-full flex flex-col h-full max-h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-navy-50 text-navy-600 rounded-xl">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-800">Filters</h3>
            <p className="text-[10px] text-slate-400 font-medium">Find your exact match</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onFilterChange({ 
              purpose: undefined, city_id: undefined, property_type_id: undefined, 
              min_price: undefined, max_price: undefined, bedrooms: undefined, 
              bathrooms: undefined, amenities: [], min_area: undefined, 
              max_area: undefined, possession_status: undefined, 
              facing: undefined, furnishing: undefined, verified_status: undefined 
            })}
            className="text-xs font-bold text-red-500 hover:text-red-600 transition"
          >
            Reset
          </button>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-6">
        
        {/* Category */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('category')}>
            Category <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.category && "rotate-180")} />
          </h4>
          {expandedSections.category && (
            <div className="flex flex-wrap gap-2">
              {PROPERTY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => onFilterChange({ purpose: cat === 'Buy' ? 'Sale' : cat })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                    (filters.purpose === cat || (filters.purpose === 'Sale' && cat === 'Buy') || (filters.purpose?.toLowerCase() === 'pg' && cat === 'PG'))
                      ? "bg-navy-900 text-white border-navy-900 shadow-md shadow-navy-900/20"
                      : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Location (City - Simplified for demo) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('location')}>
            Location <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.location && "rotate-180")} />
          </h4>
          {expandedSections.location && (
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                value={filters.city_id || ''}
                onChange={(e) => onFilterChange({ city_id: e.target.value || undefined })}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-500/20 appearance-none cursor-pointer"
              >
                <option value="">All Cities</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('price')}>
            Budget <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.price && "rotate-180")} />
          </h4>
          {expandedSections.price && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Min Price</label>
                <input
                  type="number"
                  placeholder="₹0"
                  value={filters.min_price || ''}
                  onChange={(e) => onFilterChange({ min_price: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Max Price</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={filters.max_price || ''}
                  onChange={(e) => onFilterChange({ max_price: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* BHK */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('bhk')}>
            Bedrooms <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.bhk && "rotate-180")} />
          </h4>
          {expandedSections.bhk && (
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map(bhk => (
                <button
                  key={bhk}
                  onClick={() => onFilterChange({ bedrooms: filters.bedrooms === bhk ? undefined : bhk })}
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                    filters.bedrooms === bhk
                      ? "bg-navy-900 text-white border-navy-900 shadow-md shadow-navy-900/20"
                      : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:bg-slate-50"
                  )}
                >
                  {bhk}{bhk === 5 ? '+' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Area */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('area')}>
            Area (Sq.ft) <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.area && "rotate-180")} />
          </h4>
          {expandedSections.area && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Min Sqft"
                value={filters.min_area || ''}
                onChange={(e) => onFilterChange({ min_area: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              />
              <input
                type="number"
                placeholder="Max Sqft"
                value={filters.max_area || ''}
                onChange={(e) => onFilterChange({ max_area: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              />
            </div>
          )}
        </div>

        {/* Possession Status */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('possession')}>
            Possession <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.possession && "rotate-180")} />
          </h4>
          {expandedSections.possession && (
            <div className="flex flex-col gap-2">
              {POSSESSION_STATUSES.map(status => (
                <label key={status} className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-all",
                    filters.possession_status === status ? "bg-navy-600 border-navy-600" : "border-slate-300 group-hover:border-navy-400 bg-white"
                  )}>
                    {filters.possession_status === status && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{status}</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={filters.possession_status === status}
                    onChange={() => onFilterChange({ possession_status: filters.possession_status === status ? undefined : status })}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex justify-between items-center cursor-pointer" onClick={() => toggleSection('amenities')}>
            Amenities <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSections.amenities && "rotate-180")} />
          </h4>
          {expandedSections.amenities && (
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(amenity => {
                const isSelected = (filters.amenities || []).includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => handleAmenityChange(amenity)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1.5",
                      isSelected
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                    {amenity}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
