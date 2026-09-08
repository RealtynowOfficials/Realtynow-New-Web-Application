import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoLight } from '../../components/logo';
import { useGooglePlaces, type GooglePlacePrediction, type GooglePlaceDetails } from '../../hooks/useGooglePlaces';
import {
  Home,
  Tag,
  Users,
  Rocket,
  Shield,
  Lock,
  Check,
  ArrowRight,
  ChevronDown,
  MapPin,
  Building2,
  CheckCircle2,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/toast';

interface FormData {
  fullName: string;
  phone: string;
  intent: 'sell' | 'rent';
  propertyType: string;
  subType: string;
  location: string;
  city: string;
  pincode: string;
  email: string;
  contactTime: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  propertyType?: string;
  location?: string;
  city?: string;
  pincode?: string;
  email?: string;
}

const PROPERTY_TYPES: Record<string, string[]> = {
  'Apartment / Flat': ['1 BHK Flat', '2 BHK Flat', '3 BHK Flat', '4+ BHK Flat', 'Studio Apartment', 'Penthouse'],
  'Independent House': ['Single Floor House', 'Duplex House', 'Triplex Villa', 'Row House'],
  'Villa': ['Gated Community Villa', 'Luxury Villa', 'Farmhouse / Resort Villa'],
  'Plot / Land': ['Residential Plot', 'Commercial Plot', 'Agricultural Land', 'Gated Community Plot'],
  'Commercial Property': ['Commercial Office', 'Co-working Space', 'Showroom', 'Retail Store'],
  'Office Space': ['Fully Furnished Office', 'Bare Shell Office', 'Managed IT Space'],
  'Shop': ['Retail Store', 'High-Street Retail', 'Corner Shop', 'Mall Kiosk'],
  'Warehouse': ['Industrial Warehouse', 'Storage Godown', 'Cold Storage Logistics'],
  'Other': ['Industrial Shed', 'Mixed Use Property', 'Farm House']
};

const POPULAR_CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'Pune',
  'Delhi NCR',
  'Chennai',
  'Kolkata',
  'Ahmedabad'
];

const LOCALITY_SUGGESTIONS: Record<string, string[]> = {
  Hyderabad: [
    'Gachibowli',
    'Hitec City',
    'Madhapur',
    'Kondapur',
    'Banjara Hills',
    'Jubilee Hills',
    'Kokapet',
    'Financial District',
    'Tellapur',
    'Manikonda',
    'Kukatpally',
    'Miyapur'
  ],
  Bengaluru: ['Whitefield', 'Indiranagar', 'Koramangala', 'HSR Layout', 'Electronic City', 'Bellandur'],
  Mumbai: ['Andheri West', 'Bandra West', 'Powai', 'Worli', 'Thane West', 'Malad West'],
  Pune: ['Wakad', 'Baner', 'Hinjewadi', 'Kharadi', 'Viman Nagar', 'Kothrud'],
  'Delhi NCR': ['Gurugram Phase 5', 'Golf Course Road', 'Noida Sector 62', 'Dwarka', 'South Extension'],
  Chennai: ['OMR', 'Velachery', 'Anna Nagar', 'Adyar', 'T. Nagar', 'Porur']
};

const CONTACT_TIMES = [
  'Anytime',
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 8 PM)',
  'Weekends Only'
];

export function FreeListPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Form State
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phone: '',
    intent: 'sell',
    propertyType: 'Apartment / Flat',
    subType: '2 BHK Flat',
    location: '',
    city: 'Hyderabad',
    pincode: '',
    email: '',
    contactTime: 'Anytime'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLeadNumber, setSubmittedLeadNumber] = useState<string | null>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Google Places API Integration
  const { isReady: isGooglePlacesReady, getPredictions, getPlaceDetails } = useGooglePlaces();
  const [googlePredictions, setGooglePredictions] = useState<GooglePlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<GooglePlaceDetails | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Debounced Google Places Autocomplete search as user types
  useEffect(() => {
    const query = formData.location.trim();
    if (!query || query.length < 2) {
      setGooglePredictions([]);
      setIsSearchingPlaces(false);
      return;
    }

    if (!isGooglePlacesReady) {
      return;
    }

    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      try {
        const results = await getPredictions(query, { city: formData.city });
        setGooglePredictions(results);
      } catch (err) {
        console.error('Google Places search error:', err);
        setGooglePredictions([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.location, formData.city, isGooglePlacesReady, getPredictions]);

  const handleSelectGooglePlace = async (prediction: GooglePlacePrediction) => {
    const mainText = prediction.structured_formatting?.main_text || prediction.description;
    setFormData((prev) => ({
      ...prev,
      location: mainText
    }));
    setShowLocationSuggestions(false);
    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));

    try {
      const details = await getPlaceDetails(prediction.place_id);
      if (details) {
        setSelectedPlaceDetails(details);
        // Auto-update pincode if detected from Google Maps
        if (details.postal_code && /^\d{6}$/.test(details.postal_code)) {
          setFormData((prev) => ({
            ...prev,
            pincode: details.postal_code
          }));
          if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: undefined }));
        }
        // Auto-update city if matched
        if (details.city) {
          const matchedCity = POPULAR_CITIES.find(
            (c) => c.toLowerCase() === details.city.toLowerCase()
          );
          if (matchedCity) {
            setFormData((prev) => ({ ...prev, city: matchedCity }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to get place details:', err);
    }
  };

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            setIsDetectingLocation(false);
            if (status === 'OK' && results && results[0]) {
              const r = results[0];
              let locName = '';
              let postal = '';
              r.address_components.forEach((c) => {
                if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) {
                  locName = c.long_name;
                }
                if (c.types.includes('postal_code')) {
                  postal = c.long_name;
                }
              });
              const finalLoc = locName || r.formatted_address.split(',')[0];
              setFormData((prev) => ({
                ...prev,
                location: finalLoc,
                ...(postal && /^\d{6}$/.test(postal) ? { pincode: postal } : {})
              }));
              setSelectedPlaceDetails({
                location_name: finalLoc,
                area: locName,
                locality: locName,
                city: formData.city,
                district: '',
                state: 'Telangana',
                country: 'India',
                postal_code: postal,
                latitude,
                longitude,
                google_place_id: r.place_id,
                formatted_address: r.formatted_address
              });
              setShowLocationSuggestions(false);
              if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
              if (postal && errors.pincode) setErrors((prev) => ({ ...prev, pincode: undefined }));
            }
          });
        } else {
          setIsDetectingLocation(false);
        }
      },
      () => setIsDetectingLocation(false),
      { timeout: 10000 }
    );
  };

  // Close location suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePropertyTypeChange = (newType: string) => {
    const subTypes = PROPERTY_TYPES[newType] || [];
    setFormData((prev) => ({
      ...prev,
      propertyType: newType,
      subType: subTypes[0] || ''
    }));
    if (errors.propertyType) {
      setErrors((prev) => ({ ...prev, propertyType: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Name should be at least 3 characters.';
    }

    // Phone (10 digits Indian mobile number)
    const phoneClean = formData.phone.replace(/\D/g, '');
    if (!phoneClean) {
      newErrors.phone = 'Please enter your phone number.';
    } else if (phoneClean.length !== 10 || !/^[6-9]/.test(phoneClean)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
    }

    // Property Type
    if (!formData.propertyType) {
      newErrors.propertyType = 'Please select property type.';
    }

    // Location
    if (!formData.location.trim()) {
      newErrors.location = 'Please enter property location / area.';
    }

    // City
    if (!formData.city) {
      newErrors.city = 'Please select a city.';
    }

    // Pincode (6 digits)
    const pincodeClean = formData.pincode.replace(/\D/g, '');
    if (!pincodeClean) {
      newErrors.pincode = 'Please enter pincode.';
    } else if (pincodeClean.length !== 6) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode.';
    }

    // Email (optional)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);
    const cleanName = formData.fullName.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();
    const intentLabel = formData.intent === 'sell' ? 'Sell' : 'Rent';
    const messageText = `Free Listing Request: Looking to ${intentLabel} ${formData.propertyType} (${formData.subType || 'Standard'}) in ${formData.location}, ${formData.city} - ${formData.pincode}. Preferred contact time: ${formData.contactTime}.`;

    const serviceData = {
      intent: formData.intent,
      property_type: formData.propertyType,
      sub_type: formData.subType,
      location: formData.location,
      city: formData.city,
      pincode: formData.pincode,
      contact_time: formData.contactTime,
      preferred_time: formData.contactTime,
      source_page: '/free_list_property',
      submitted_at: new Date().toISOString()
    };

    let leadNumber: string | null = null;
    let savedSuccess = false;

    // Tier 1: Try canonical submit_contact_enquiry RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_contact_enquiry', {
        p_name: cleanName,
        p_phone: cleanPhone,
        p_email: cleanEmail || null,
        p_message: messageText,
        p_source: 'website',
        p_customer_id: user?.id ?? null,
        p_property_id: null,
        p_tags: ['free-listing', 'FREE_LIST_PROPERTY', formData.intent, formData.propertyType],
        p_service_type: 'FREE_LIST_PROPERTY',
        p_service_data: serviceData,
        p_city: formData.city,
        p_location: `${formData.location} - ${formData.pincode}`,
        p_alternate_phone: null
      });

      if (!rpcError && (rpcData as any)?.success !== false) {
        savedSuccess = true;
        leadNumber = (rpcData as any)?.lead_number || null;
      }
    } catch (rpcErr) {
      console.warn('RPC submit_contact_enquiry error, falling back to direct insert:', rpcErr);
    }

    // Tier 2: Direct insert fallback into enquiries
    if (!savedSuccess) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('enquiries')
          .insert({
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail || null,
            message: messageText,
            service_request: `Free Listing: ${intentLabel} ${formData.propertyType} (${formData.subType})`,
            source: 'website',
            customer_id: user?.id ?? null,
            tags: ['free-listing', 'FREE_LIST_PROPERTY', formData.intent, formData.propertyType],
            service_type: 'FREE_LIST_PROPERTY',
            service_data: serviceData,
            city: formData.city,
            location: `${formData.location} - ${formData.pincode}`,
            status: 'new',
            lead_status: 'new',
            priority: 'high'
          })
          .select('id, lead_number')
          .maybeSingle();

        if (!insertError) {
          savedSuccess = true;
          if (insertData?.lead_number) leadNumber = insertData.lead_number;
        }
      } catch (insertErr) {
        console.error('Direct insert error:', insertErr);
      }
    }

    // Tier 3: LocalStorage offline queue fallback
    if (!savedSuccess) {
      try {
        const queue = JSON.parse(localStorage.getItem('realtynow_offline_leads') || '[]');
        queue.push({
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          service_type: 'FREE_LIST_PROPERTY',
          service_data: serviceData,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('realtynow_offline_leads', JSON.stringify(queue));
        savedSuccess = true;
      } catch (storageErr) {
        console.error('LocalStorage queue error:', storageErr);
      }
    }

    if (leadNumber) setSubmittedLeadNumber(leadNumber);
    setIsSubmitting(false);
    setIsSubmitted(true);
    addToast('success', 'Your property listing details have been saved successfully!');
  };

  const generateWhatsAppUrl = () => {
    const phone = '919494230774'; // Official RealtyNow WhatsApp line
    const refLine = submittedLeadNumber ? `*Ref ID:* ${submittedLeadNumber}\n` : '';
    const text = `*New Property Listing Request - RealtyNow*\n\n` +
      refLine +
      `*Name:* ${formData.fullName}\n` +
      `*Phone:* ${formData.phone}\n` +
      `*Looking to:* ${formData.intent === 'sell' ? 'Sell' : 'Rent'}\n` +
      `*Property Type:* ${formData.propertyType} (${formData.subType || 'Standard'})\n` +
      `*Location:* ${formData.location}, ${formData.city} - ${formData.pincode}\n` +
      (formData.email ? `*Email:* ${formData.email}\n` : '') +
      `*Preferred Time:* ${formData.contactTime}\n\n` +
      `Please assist me in verifying and publishing my property listing.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const currentCityLocalities = LOCALITY_SUGGESTIONS[formData.city] || LOCALITY_SUGGESTIONS['Hyderabad'];
  const filteredLocalities = currentCityLocalities.filter((loc) =>
    loc.toLowerCase().includes(formData.location.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-3 sm:p-5 lg:p-7 antialiased select-none-on-drag">
      {/* Main Single-Screen Application Card Container */}
      <div className="w-full max-w-[1360px] min-h-[760px] lg:h-[calc(100vh-56px)] max-h-[890px] bg-white rounded-[24px] shadow-2xl shadow-slate-300/40 border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row">
        
        {/* ========================================================== */}
        {/* LEFT SIDE — DARK THEME HYDERABAD CITY BANNER (≈ 52%) */}
        {/* ========================================================== */}
        <div className="w-full lg:w-[52%] bg-slate-950 text-white p-6 sm:p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between shrink-0">
          
          {/* Hyderabad City Skyline Background Image */}
          <img
            src="/hyderabad-night-skyline.jpg"
            alt="Hyderabad City Skyline"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none scale-105"
          />

          {/* Deep Dark Glass & Ambient Glow Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/80 backdrop-blur-[1px] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/40 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#D8232A]/20 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

          {/* 1. Header & Logo */}
          <div className="relative z-10">
            <LogoLight
              to="/"
              size={190}
              maxHeight={46}
              src="/2.png"
              className="hover:opacity-90 transition-opacity"
            />

            {/* 2. Promotional Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-[11px] font-extrabold tracking-wider uppercase text-slate-200 backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                LIST FOR FREE. SELL FAST.
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D8232A]/20 border border-[#D8232A]/30 text-[10.5px] font-bold text-rose-300 backdrop-blur-md">
                <MapPin className="w-3 h-3 text-[#D8232A]" />
                Hyderabad Prime
              </div>
            </div>

            {/* 3. Main Headline & Supporting Text */}
            <div className="mt-4 sm:mt-5 max-w-[460px]">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12]">
                List Your Property<br />
                for <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 drop-shadow-sm font-black">FREE</span>
              </h1>
              <p className="mt-2.5 text-slate-300 text-sm sm:text-[15px] font-normal leading-relaxed max-w-[420px]">
                Connect with verified buyers &amp; tenants across Hyderabad's top residential and commercial hubs with zero brokerage.
              </p>
            </div>
          </div>

          {/* 4. Middle Section: Benefit List (Left) + Two Mobile Phone Mockups (Right) */}
          <div className="relative z-10 my-4 sm:my-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center flex-1">
            
            {/* 4 Benefit List Items (md:col-span-6) */}
            <div className="md:col-span-6 space-y-2.5 sm:space-y-3 pr-1">
              {/* Benefit 1 */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.08] transition group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-[#D8232A]/30 group-hover:scale-105 transition">
                  <Tag className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-white text-xs sm:text-[13px] font-bold leading-snug">
                    100% Free Listing
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    No upfront fees or hidden charges.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.08] transition group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-[#D8232A]/30 group-hover:scale-105 transition">
                  <Users className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-white text-xs sm:text-[13px] font-bold leading-snug">
                    Verified Buyers &amp; Tenants
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    Connect with genuine Hyderabad leads.
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.08] transition group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-[#D8232A]/30 group-hover:scale-105 transition">
                  <Rocket className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-white text-xs sm:text-[13px] font-bold leading-snug">
                    Faster Visibility
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    Get prioritized in local search results.
                  </p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.08] transition group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D8232A] to-rose-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-[#D8232A]/30 group-hover:scale-105 transition">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-white text-xs sm:text-[13px] font-bold leading-snug">
                    Safe &amp; Protected
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-tight">
                    Your data &amp; privacy are fully protected.
                  </p>
                </div>
              </div>
            </div>

            {/* Two Realistic Smartphone Mockups (md:col-span-6) */}
            <div className="hidden md:flex md:col-span-6 items-center justify-center relative h-[310px] sm:h-[340px] pl-2">
              
              {/* Phone 2 (Behind & Offset to Right: Success Screen) */}
              <div className="absolute right-0 sm:right-2 top-4 w-[165px] sm:w-[185px] h-[280px] sm:h-[310px] bg-white rounded-[28px] border-[5px] border-slate-900 shadow-2xl shadow-black/60 overflow-hidden transform rotate-3 opacity-95 transition-transform hover:rotate-1 hover:scale-102 duration-300 ring-1 ring-white/10">
                {/* Dynamic Island Notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-black rounded-full z-20" />
                
                {/* Screen Content */}
                <div className="p-3 pt-5 flex flex-col h-full justify-between bg-white text-slate-800">
                  {/* Mini Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      <Home className="w-2.5 h-2.5 text-[#D8232A]" />
                      <span className="text-[9px] font-extrabold text-[#D8232A]">RealtyNow</span>
                    </div>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-[#D8232A] border border-red-200">FREE LISTING</span>
                  </div>

                  {/* Success Banner */}
                  <div className="text-center my-1">
                    <div className="w-7 h-7 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-1">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <h5 className="text-[10px] font-extrabold text-slate-900 leading-tight">
                      Your property is ready to list!
                    </h5>
                    <p className="text-[7.5px] text-slate-500 mt-0.5">
                      How would you like to continue?
                    </p>
                  </div>

                  {/* Option 1: Agent Assistance */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-1.5 text-center">
                    <span className="text-[7.5px] font-extrabold text-slate-800 uppercase block">GET AGENT ASSISTANCE</span>
                    <span className="text-[6.5px] text-slate-500 block">We'll help you complete the listing</span>
                    <div className="mt-1 py-1 rounded bg-[#D8232A] text-white text-[7.5px] font-bold flex items-center justify-center gap-0.5">
                      <MessageCircle className="w-2 h-2" /> Send Details on WhatsApp
                    </div>
                  </div>

                  <div className="text-[7px] text-center font-bold text-slate-400">OR</div>

                  {/* Option 2: Post It Yourself */}
                  <div className="rounded-lg border border-slate-200 bg-white p-1.5 text-center mb-1">
                    <span className="text-[7.5px] font-extrabold text-slate-800 uppercase block">POST IT YOURSELF</span>
                    <span className="text-[6.5px] text-slate-500 block">Complete listing directly on RealtyNow</span>
                    <div className="mt-1 py-1 rounded border border-[#D8232A] text-[#D8232A] text-[7.5px] font-bold">
                      Post Property Yourself
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone 1 (In Front: Form Screen) */}
              <div className="absolute left-1 sm:left-4 top-0 w-[175px] sm:w-[195px] h-[295px] sm:h-[325px] bg-white rounded-[30px] border-[5px] border-slate-900 shadow-2xl shadow-black/70 overflow-hidden z-10 transform -rotate-2 hover:rotate-0 hover:scale-102 transition-transform duration-300 ring-1 ring-white/10">
                {/* Dynamic Island Notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3 bg-black rounded-full z-20" />
                
                {/* Screen Content */}
                <div className="p-3 pt-5 flex flex-col h-full justify-between bg-white text-slate-800">
                  {/* Mini Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3 text-[#D8232A]" />
                      <span className="text-[10px] font-extrabold text-[#D8232A]">RealtyNow</span>
                    </div>
                    <span className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-[#D8232A] border border-red-200">FREE LISTING</span>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-extrabold text-slate-900 leading-tight">
                      List Your Property<br />for <span className="text-[#D8232A]">FREE</span>
                    </h5>
                    <p className="text-[8px] text-slate-500 mt-0.5">
                      Sell or Rent with RealtyNow
                    </p>
                  </div>

                  {/* Form Mock Inputs */}
                  <div className="space-y-1.5 my-1">
                    <div className="h-5 px-2 rounded-md bg-slate-50 border border-slate-200 flex items-center text-[7.5px] text-slate-400">
                      Enter your full name
                    </div>
                    <div className="h-5 px-2 rounded-md bg-slate-50 border border-slate-200 flex items-center text-[7.5px] text-slate-400">
                      Enter your phone number
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-4.5 rounded bg-[#D8232A] text-white flex items-center justify-center text-[7.5px] font-bold">
                        Sell
                      </div>
                      <div className="h-4.5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[7.5px] font-medium border border-slate-200">
                        Rent
                      </div>
                    </div>
                    <div className="h-5 px-2 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-[7.5px] text-slate-700">
                      <span>Apartment / Flat</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                    <div className="h-5 px-2 rounded-md bg-slate-50 border border-slate-200 flex items-center text-[7.5px] text-slate-400">
                      Enter property location
                    </div>
                  </div>

                  {/* Red CTA Button */}
                  <div className="py-1.5 rounded-lg bg-[#D8232A] text-white text-[8.5px] font-extrabold flex items-center justify-center gap-1 shadow-sm">
                    Continue <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* 5. Bottom Security & Hyderabad Location Message */}
          <div className="relative z-10 pt-2 flex items-center justify-between gap-3 border-t border-white/10">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-white leading-tight">Secure &amp; Trusted</h5>
                <p className="text-[9.5px] text-slate-400 leading-tight">Direct owner listings in Hyderabad</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HITEC City · Gachibowli · Hyderabad</span>
            </div>
          </div>

        </div>

        {/* ========================================================== */}
        {/* RIGHT SIDE — FORM PANEL (≈ 48%) */}
        {/* ========================================================== */}
        <div className="w-full lg:w-[48%] bg-white p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-center overflow-y-auto">
          
          <div className="w-full max-w-[540px] mx-auto">
            {!isSubmitted ? (
              <>
                {/* Form Header */}
                <div className="mb-5 sm:mb-6">
                  <h2 className="font-display text-2xl sm:text-[28px] font-extrabold text-[#111827] tracking-tight">
                    Get Started – List Your Property
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Fill in the details below to get started
                  </p>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* ROW 1: Full Name * | Phone / WhatsApp * */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name <span className="text-[#D8232A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                        }}
                        placeholder="Enter your full name"
                        className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none transition ${
                          errors.fullName
                            ? 'border-[#D8232A] ring-2 ring-[#D8232A]/20 bg-[#D8232A]/5'
                            : 'border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20'
                        }`}
                      />
                      {errors.fullName && (
                        <p className="text-[11px] font-semibold text-[#D8232A] mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Phone / WhatsApp <span className="text-[#D8232A]">*</span>
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, phone: val });
                          if (errors.phone) setErrors({ ...errors, phone: undefined });
                        }}
                        placeholder="Enter your phone number"
                        className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none transition ${
                          errors.phone
                            ? 'border-[#D8232A] ring-2 ring-[#D8232A]/20 bg-[#D8232A]/5'
                            : 'border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20'
                        }`}
                      />
                      {errors.phone && (
                        <p className="text-[11px] font-semibold text-[#D8232A] mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* ROW 2: Looking to * (Segmented Toggle) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Looking to <span className="text-[#D8232A]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, intent: 'sell' })}
                        className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer border ${
                          formData.intent === 'sell'
                            ? 'bg-[#D8232A] text-white border-[#D8232A] shadow-md shadow-[#D8232A]/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Tag className="w-4 h-4" />
                        Sell
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, intent: 'rent' })}
                        className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer border ${
                          formData.intent === 'rent'
                            ? 'bg-[#D8232A] text-white border-[#D8232A] shadow-md shadow-[#D8232A]/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        Rent
                      </button>
                    </div>
                  </div>

                  {/* ROW 3: Property Type * | Property Sub Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Property Type <span className="text-[#D8232A]">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.propertyType}
                          onChange={(e) => handlePropertyTypeChange(e.target.value)}
                          className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition cursor-pointer"
                        >
                          {Object.keys(PROPERTY_TYPES).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Property Sub Type
                      </label>
                      <div className="relative">
                        <select
                          value={formData.subType}
                          onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                          className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition cursor-pointer"
                        >
                          {(PROPERTY_TYPES[formData.propertyType] || []).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* ROW 4: Property Location * (Google Maps Places API Autocomplete) */}
                  <div ref={locationRef} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Property Location <span className="text-[#D8232A]">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectCurrentLocation}
                        disabled={isDetectingLocation}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D8232A] hover:text-[#b81d23] transition disabled:opacity-50 cursor-pointer"
                      >
                        {isDetectingLocation ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Detecting GPS...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3 h-3" />
                            <span>Locate on Map</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={formData.location}
                        onFocus={() => setShowLocationSuggestions(true)}
                        onChange={(e) => {
                          setFormData({ ...formData, location: e.target.value });
                          setShowLocationSuggestions(true);
                          setSelectedPlaceDetails(null);
                          if (errors.location) setErrors({ ...errors, location: undefined });
                        }}
                        placeholder="Search colony, society, street, or landmark..."
                        className={`w-full h-11 pl-3.5 pr-10 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none transition ${
                          errors.location
                            ? 'border-[#D8232A] ring-2 ring-[#D8232A]/20 bg-[#D8232A]/5'
                            : 'border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20'
                        }`}
                      />

                      {/* Right Icon: Loader or MapPin */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                        {isSearchingPlaces ? (
                          <Loader2 className="w-4 h-4 text-[#D8232A] animate-spin" />
                        ) : (
                          <MapPin className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {errors.location && (
                      <p className="text-[11px] font-semibold text-[#D8232A] mt-1">{errors.location}</p>
                    )}

                    {/* Verified Location Banner */}
                    {selectedPlaceDetails && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="truncate">
                          <strong className="font-bold">Google Place:</strong> {selectedPlaceDetails.formatted_address}
                        </span>
                      </div>
                    )}

                    {/* Autocomplete Dropdown */}
                    {showLocationSuggestions && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {isSearchingPlaces ? (
                          <div className="p-3.5 text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 text-[#D8232A] animate-spin" />
                            <span>Searching Google Maps places in {formData.city}...</span>
                          </div>
                        ) : googlePredictions.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#D8232A]" /> Google Maps Places
                              </span>
                              <span className="text-[9px] font-semibold text-slate-400">Google Places API</span>
                            </div>
                            <div className="p-1">
                              {googlePredictions.map((pred) => (
                                <button
                                  key={pred.place_id}
                                  type="button"
                                  onClick={() => handleSelectGooglePlace(pred)}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#D8232A]/5 hover:text-[#D8232A] rounded-lg transition flex items-start gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-[#D8232A] group-hover:text-white transition mt-0.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-900 group-hover:text-[#D8232A] truncate">
                                      {pred.structured_formatting?.main_text || pred.description}
                                    </div>
                                    {pred.structured_formatting?.secondary_text && (
                                      <div className="text-[11px] text-slate-400 font-normal truncate">
                                        {pred.structured_formatting.secondary_text}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : filteredLocalities.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                Popular Localities in {formData.city}
                              </span>
                            </div>
                            <div className="p-1">
                              {filteredLocalities.map((loc) => (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, location: loc });
                                    setShowLocationSuggestions(false);
                                    setSelectedPlaceDetails(null);
                                    if (errors.location) setErrors({ ...errors, location: undefined });
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#D8232A]/5 hover:text-[#D8232A] rounded-lg transition flex items-center gap-2 cursor-pointer"
                                >
                                  <MapPin className="w-3 h-3 text-[#D8232A]" />
                                  {loc}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400 font-medium">
                            No matching places found. Type freely to enter custom location.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ROW 5: City * | Pincode * */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        City <span className="text-[#D8232A]">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.city}
                          onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value });
                            if (errors.city) setErrors({ ...errors, city: undefined });
                          }}
                          className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition cursor-pointer"
                        >
                          {POPULAR_CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pincode <span className="text-[#D8232A]">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, pincode: val });
                          if (errors.pincode) setErrors({ ...errors, pincode: undefined });
                        }}
                        placeholder="Enter pincode"
                        className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none transition ${
                          errors.pincode
                            ? 'border-[#D8232A] ring-2 ring-[#D8232A]/20 bg-[#D8232A]/5'
                            : 'border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20'
                        }`}
                      />
                      {errors.pincode && (
                        <p className="text-[11px] font-semibold text-[#D8232A] mt-1">{errors.pincode}</p>
                      )}
                    </div>
                  </div>

                  {/* ROW 6: Email Address (optional) | Preferred Contact Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Email Address <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="Enter your email (optional)"
                        className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none transition ${
                          errors.email
                            ? 'border-[#D8232A] ring-2 ring-[#D8232A]/20 bg-[#D8232A]/5'
                            : 'border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20'
                        }`}
                      />
                      {errors.email && (
                        <p className="text-[11px] font-semibold text-[#D8232A] mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Preferred Contact Time
                      </label>
                      <div className="relative">
                        <select
                          value={formData.contactTime}
                          onChange={(e) => setFormData({ ...formData, contactTime: e.target.value })}
                          className="w-full h-11 px-3.5 pr-9 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition cursor-pointer"
                        >
                          {CONTACT_TIMES.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 sm:h-[50px] rounded-xl bg-[#D8232A] hover:bg-[#b81d23] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#D8232A]/25 transition active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving Your Listing Details...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Security message below button */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Your information is safe &amp; secure with us.</span>
                  </div>

                </form>
              </>
            ) : (
              /* ========================================================== */
              /* SUCCESS STATE (Matching Mobile Reference Card Options) */
              /* ========================================================== */
              <div className="py-4 text-center">
                {/* Green Check Icon */}
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm mb-4">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                <h3 className="font-display text-2xl font-extrabold text-[#111827]">
                  Your property is ready to list!
                </h3>
                {submittedLeadNumber && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-[#D8232A]" />
                    <span>Reference: {submittedLeadNumber}</span>
                  </div>
                )}
                <p className="text-slate-500 text-sm mt-2 mb-6">
                  How would you like to continue?
                </p>

                {/* Two Option Cards */}
                <div className="space-y-4 text-left">
                  
                  {/* OPTION 1: GET AGENT ASSISTANCE */}
                  <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#D8232A]/20 bg-[#D8232A]/5 hover:border-[#D8232A]/30 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-[#D8232A] text-white flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                        GET AGENT ASSISTANCE
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 ml-8 mb-3">
                      We'll help you complete the listing, verify titles, and connect with genuine buyers.
                    </p>
                    <a
                      href={generateWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send Details on WhatsApp
                    </a>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase">OR</span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>

                  {/* OPTION 2: POST IT YOURSELF */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                        POST IT YOURSELF
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 ml-8 mb-3">
                      Complete your property listing directly on RealtyNow web portal in simple steps.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/portal/list-property')}
                      className="w-full h-11 rounded-xl border-2 border-[#D8232A] text-[#D8232A] hover:bg-[#D8232A]/5 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Building2 className="w-4 h-4" />
                      Post Property Yourself
                    </button>
                  </div>

                </div>

                {/* Edit link */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#D8232A] transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Edit Property Details
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default FreeListPropertyPage;
