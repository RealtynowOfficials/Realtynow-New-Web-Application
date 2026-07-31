import React, { useState } from 'react';
import { useLocationContext } from '../contexts/location-context';
import { MapPin, Search, Crosshair, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const topCities = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Surat',
  'Pune',
  'Jaipur',
];

export function LocationSelector({ isTransparent }: { isTransparent: boolean }) {
  const { city, isLocating, error, detectLocation, setCity } = useLocationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCities = topCities.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (selectedCity: string) => {
    setCity(selectedCity);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${
          isTransparent
            ? 'border-white/20 hover:bg-white/10 text-white'
            : 'border-navy-700 hover:bg-navy-800 text-navy-200'
        }`}
      >
        <MapPin className="h-3.5 w-3.5 text-red-500" />
        <span className="font-semibold text-xs">
          {isLocating ? 'Detecting...' : city || 'Select City'}
        </span>
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-100 bg-white p-3 shadow-xl"
          >
            {/* Auto detect button */}
            <button
              onClick={() => {
                detectLocation();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              <Crosshair className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Locating...' : 'Detect my location'}
            </button>

            {error && <p className="mt-2 text-[10px] text-red-500">{error}</p>}

            <hr className="my-3 border-slate-100" />

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            {/* City list */}
            <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
              {filteredCities.length > 0 ? (
                filteredCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleSelect(c)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                      city === c
                        ? 'bg-red-50 font-bold text-red-700'
                        : 'font-medium text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                    {city === c && <Check className="h-3.5 w-3.5 text-red-600" />}
                  </button>
                ))
              ) : (
                <p className="py-2 text-center text-xs text-slate-400">No cities found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
