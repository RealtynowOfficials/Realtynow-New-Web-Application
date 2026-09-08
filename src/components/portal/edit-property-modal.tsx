import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Star, X, Check, Building2, MapPin, Image as ImageIcon, Sliders, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFile, deleteFile } from '../../lib/storage';
import { triggerAiVerification, triggerPropertySeoGeneration } from '../../lib/properties';
import { validatePropertyPrice, validateUnitPrice } from '../../lib/price-validation';
import { isLandProperty, toAreaUnitCode, getAreaUnitDisplay, calculatePlotTotalPrice } from '../../lib/plot-pricing';
import { useToast } from '../toast';
import { Modal, Button, Input, Textarea, Select } from '../ui';
import { cn } from '../../lib/utils';
import {
  type MediaItem,
  AMENITIES_LIST,
  compressImage,
  isVideoUrl,
  MAX_MEDIA_FILES,
  MAX_VIDEO_FILE_SIZE,
  ACCEPTED_MEDIA_TYPES,
  FieldLabel,
} from '../../pages/portal/property-form-shared';

interface EditPropertyModalProps {
  propertyId: string | null;
  onClose: () => void;
}

interface EditFormState {
  purpose: 'Sale' | 'Rent';
  category: string;
  listing_category: string;
  property_sub_type: string;
  title: string;
  description: string;
  price: string;
  rent_amount: string;
  price_per_unit: string;
  area_unit: string;
  security_deposit: string;
  maintenance: string;
  negotiable: boolean;
  address: string;
  city_name: string;
  locality_name: string;
  state_name: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  built_up_area: string;
  carpet_area: string;
  plot_area: string;
  floor_number: string;
  total_floors: string;
  facing: string;
  furnishing: string;
  age_of_property: string;
  parking_indoor: string;
  parking_outdoor: string;
  ownership_type: string;
  ownership_role: string;
  rera_number: string;
}

const FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

function emptyForm(): EditFormState {
  return {
    purpose: 'Sale',
    category: '',
    listing_category: '',
    property_sub_type: '',
    title: '',
    description: '',
    price: '',
    rent_amount: '',
    price_per_unit: '',
    area_unit: 'Sq. Ft',
    security_deposit: '',
    maintenance: '',
    negotiable: true,
    address: '',
    city_name: '',
    locality_name: '',
    state_name: '',
    pincode: '',
    latitude: null,
    longitude: null,
    place_id: '',
    bedrooms: '',
    bathrooms: '',
    balconies: '',
    built_up_area: '',
    carpet_area: '',
    plot_area: '',
    floor_number: '',
    total_floors: '',
    facing: '',
    furnishing: '',
    age_of_property: '',
    parking_indoor: '',
    parking_outdoor: '',
    ownership_type: '',
    ownership_role: '',
    rera_number: '',
  };
}

export function EditPropertyModal({ propertyId, onClose }: EditPropertyModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'basic' | 'specs' | 'location' | 'media'>('basic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [propertyStatus, setPropertyStatus] = useState<string>('published');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingFeatures, setExistingFeatures] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<EditFormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const toggleAmenity = (id: string) =>
    setSelectedAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Gallery
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Hero cover banner / video / virtual tour
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [virtualTourUploading, setVirtualTourUploading] = useState(false);

  const set = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      const { data, error } = await supabase.from('properties').select('*').eq('id', propertyId).single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message ?? 'Could not load this property');
        setLoading(false);
        return;
      }
      setPropertyStatus(data.status || 'published');
      const features = (data.features as Record<string, unknown>) ?? {};
      const mediaUrls = (data.media_urls as Record<string, unknown>) ?? {};
      setExistingFeatures(features);
      setForm({
        purpose: data.purpose === 'Rent' ? 'Rent' : 'Sale',
        category: String(features.category ?? ''),
        listing_category: data.listing_category ?? '',
        property_sub_type: String(features.property_sub_type ?? ''),
        title: data.title ?? '',
        description: data.description ?? '',
        price: data.price != null ? String(data.price) : '',
        rent_amount: data.rent_amount != null ? String(data.rent_amount) : '',
        price_per_unit: data.price_per_unit != null ? String(data.price_per_unit) : '',
        area_unit: data.area_unit ? getAreaUnitDisplay(data.area_unit) : 'Sq. Ft',
        security_deposit: data.security_deposit != null ? String(data.security_deposit) : '',
        maintenance: features.maintenance != null ? String(features.maintenance) : '',
        negotiable: features.negotiable !== false,
        address: data.address ?? '',
        city_name: String(features.city_name ?? ''),
        locality_name: String(features.locality_name ?? ''),
        state_name: data.state ?? '',
        pincode: data.pincode ?? '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        place_id: data.place_id ?? '',
        bedrooms: data.bedrooms != null ? String(data.bedrooms) : '',
        bathrooms: data.bathrooms != null ? String(data.bathrooms) : '',
        balconies: data.balconies != null ? String(data.balconies) : '',
        built_up_area: data.built_up_area != null ? String(data.built_up_area) : '',
        carpet_area: data.carpet_area != null ? String(data.carpet_area) : '',
        plot_area: data.plot_area != null ? String(data.plot_area) : '',
        floor_number: data.floor_number != null ? String(data.floor_number) : '',
        total_floors: data.total_floors != null ? String(data.total_floors) : '',
        facing: data.facing ?? '',
        furnishing: data.furnishing ?? '',
        age_of_property: data.age_of_property != null ? String(data.age_of_property) : '',
        parking_indoor: features.parking_indoor != null ? String(features.parking_indoor) : '',
        parking_outdoor: features.parking_outdoor != null ? String(features.parking_outdoor) : '',
        ownership_type: data.ownership_type ?? '',
        ownership_role: String(features.ownership_role ?? ''),
        rera_number: String(features.rera_number ?? ''),
      });

      setSelectedAmenities(Array.isArray(data.amenities) ? (data.amenities as string[]) : []);

      const cover = data.cover_image_url ?? null;
      setCoverImageUrl(cover);
      const vids = Array.isArray(mediaUrls.videos) ? (mediaUrls.videos as string[]) : [];
      setVideoUrl(vids[0] ?? '');
      setVirtualTourUrl(typeof mediaUrls.virtual_tour === 'string' ? mediaUrls.virtual_tour : '');

      const loadedMedia: MediaItem[] = [];
      const fMedia = features.media_items;
      if (Array.isArray(fMedia) && fMedia.length > 0) {
        for (let i = 0; i < fMedia.length; i++) {
          const item = fMedia[i] as Record<string, unknown>;
          if (typeof item.url === 'string') {
            loadedMedia.push({
              id: String(item.id ?? crypto.randomUUID()),
              url: item.url,
              type: item.type === 'video' ? 'video' : 'image',
              isCover: item.url === cover || !!item.isCover,
              order: typeof item.order === 'number' ? item.order : i,
              bucket: typeof item.bucket === 'string' ? (item.bucket as any) : undefined,
              path: typeof item.path === 'string' ? item.path : undefined,
            });
          }
        }
      } else if (Array.isArray(data.images)) {
        (data.images as string[]).forEach((url, i) => {
          loadedMedia.push({
            id: crypto.randomUUID(),
            url,
            type: isVideoUrl(url) ? 'video' : 'image',
            isCover: url === cover || i === 0,
            order: i,
          });
        });
      }
      setMediaItems(loadedMedia);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const reindex = (items: MediaItem[]): MediaItem[] => items.map((m, i) => ({ ...m, order: i }));

  const handleMediaUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const room = MAX_MEDIA_FILES - mediaItems.length;
    if (room <= 0) {
      toast.addToast('error', `Maximum ${MAX_MEDIA_FILES} media files allowed.`);
      return;
    }
    for (const raw of arr.slice(0, room)) {
      if (!ACCEPTED_MEDIA_TYPES.includes(raw.type)) {
        toast.addToast('error', `${raw.name}: Unsupported file type.`);
        continue;
      }
      const isVideo = raw.type.startsWith('video/');
      const file = isVideo ? raw : await compressImage(raw);
      const tempId = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);
      setMediaItems((prev) =>
        reindex([
          ...prev,
          {
            id: tempId,
            url: localUrl,
            type: isVideo ? 'video' : 'image',
            isCover: prev.length === 0 && !isVideo,
            order: 0,
            uploading: true,
          },
        ])
      );
      const bucket = isVideo ? 'property-videos' : 'property-images';
      const { url, path, error } = await uploadFile(bucket as any, file);
      if (error || !url) {
        toast.addToast('error', `${file.name}: ${error || 'Upload failed'}`);
        setMediaItems((prev) => reindex(prev.filter((m) => m.id !== tempId)));
        continue;
      }
      setMediaItems((prev) =>
        reindex(
          prev.map((m) =>
            m.id === tempId ? { ...m, url, path, bucket: bucket as any, uploading: false } : m
          )
        )
      );
    }
  };

  const addMediaUrl = () => {
    const u = mediaUrlInput.trim();
    if (!u) return;
    const isVid = isVideoUrl(u);
    const isCov = mediaItems.length === 0 && !isVid;
    if (isCov) setCoverImageUrl(u);
    setMediaItems((prev) =>
      reindex([...prev, { id: crypto.randomUUID(), url: u, type: isVid ? 'video' : 'image', isCover: isCov, order: 0 }])
    );
    setMediaUrlInput('');
  };

  const setCoverMedia = (id: string) => {
    setMediaItems((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) setCoverImageUrl(target.url);
      return prev.map((m) => ({ ...m, isCover: m.id === id }));
    });
  };

  const removeMedia = (item: MediaItem) => {
    if (item.bucket && item.path) deleteFile(item.bucket, item.path).catch(() => {});
    setMediaItems((prev) => {
      const next = reindex(prev.filter((m) => m.id !== item.id));
      if (item.isCover) {
        if (next.length > 0) {
          next[0].isCover = true;
          setCoverImageUrl(next[0].url);
        } else {
          setCoverImageUrl(null);
        }
      }
      return next;
    });
  };

  const moveMedia = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= mediaItems.length) return;
    setMediaItems((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return reindex(copy);
    });
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const compressed = await compressImage(file);
      const { url, error } = await uploadFile('property-images', compressed);
      if (error || !url) throw new Error(error || 'Upload failed');
      setCoverImageUrl(url);
      setMediaItems((prev) => {
        const match = prev.find((m) => m.url === url);
        if (match) return prev.map((m) => ({ ...m, isCover: m.id === match.id }));
        return reindex([{ id: crypto.randomUUID(), url, type: 'image', isCover: true, order: 0 }, ...prev.map((m) => ({ ...m, isCover: false }))]);
      });
      toast.addToast('success', 'Cover image uploaded');
    } catch (err: any) {
      toast.addToast('error', err.message || 'Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (file.size > MAX_VIDEO_FILE_SIZE) {
      toast.addToast('error', 'Video exceeds 20MB limit');
      return;
    }
    setVideoUploading(true);
    try {
      const { url, error } = await uploadFile('property-videos', file);
      if (error || !url) throw new Error(error || 'Upload failed');
      setVideoUrl(url);
      toast.addToast('success', 'Video uploaded');
    } catch (err: any) {
      toast.addToast('error', err.message || 'Failed to upload video');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVirtualTourUpload = async (file: File) => {
    setVirtualTourUploading(true);
    try {
      const { url, error } = await uploadFile('property-images', file);
      if (error || !url) throw new Error(error || 'Upload failed');
      setVirtualTourUrl(url);
      toast.addToast('success', 'Virtual tour uploaded');
    } catch (err: any) {
      toast.addToast('error', err.message || 'Failed to upload virtual tour');
    } finally {
      setVirtualTourUploading(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.city_name.trim()) errs.city_name = 'City is required';
    if (!form.locality_name.trim()) errs.locality_name = 'Locality is required';

    const isLand = isLandProperty({
      listing_category: form.listing_category,
      property_sub_type: form.property_sub_type,
      price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
      area_unit: form.area_unit,
      plot_area: form.plot_area ? parseFloat(form.plot_area) : null,
    });

    if (isLand && form.purpose === 'Sale') {
      const unitPriceErr = validateUnitPrice(form.price_per_unit, form.area_unit);
      if (unitPriceErr) errs.price_per_unit = unitPriceErr;
      if (!form.plot_area || Number(form.plot_area) <= 0) errs.plot_area = 'Plot area is required';
    } else {
      const priceStr = form.purpose === 'Sale' ? form.price : form.rent_amount;
      const priceErr = validatePropertyPrice(priceStr);
      if (priceErr) {
        if (form.purpose === 'Sale') errs.price = priceErr;
        else errs.rent_amount = priceErr;
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0];
      toast.addToast('error', first);
      return false;
    }
    return true;
  };

  const handleSave = async (shouldSubmit = false) => {
    if (!propertyId) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));

      const isLand = isLandProperty({
        listing_category: form.listing_category,
        property_sub_type: form.property_sub_type,
        price_per_unit: form.price_per_unit ? parseFloat(form.price_per_unit) : null,
        area_unit: form.area_unit,
        plot_area: form.plot_area ? parseFloat(form.plot_area) : null,
      });

      let priceVal: number | null = null;
      let rentVal: number | null = null;
      let pricePerUnitVal: number | null = null;
      let plotAreaVal: number | null = null;
      let areaUnitVal: string | null = null;

      if (isLand && form.purpose === 'Sale') {
        pricePerUnitVal = num(form.price_per_unit);
        plotAreaVal = num(form.plot_area);
        areaUnitVal = toAreaUnitCode(form.area_unit);
        if (plotAreaVal && pricePerUnitVal) {
          priceVal = calculatePlotTotalPrice(plotAreaVal, pricePerUnitVal);
        }
      } else {
        priceVal = form.purpose === 'Sale' ? num(form.price) : 0;
        rentVal = form.purpose === 'Rent' ? num(form.rent_amount) : null;
      }

      const payload: Record<string, unknown> = {
        purpose: form.purpose,
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: priceVal,
        rent_amount: rentVal,
        price_per_unit: pricePerUnitVal,
        area_unit: areaUnitVal,
        plot_area: plotAreaVal || num(form.plot_area),
        security_deposit: num(form.security_deposit),
        address: form.address.trim(),
        state: form.state_name || null,
        pincode: form.pincode || null,
        latitude: form.latitude,
        longitude: form.longitude,
        place_id: form.place_id || null,
        bedrooms: num(form.bedrooms) || 0,
        bathrooms: num(form.bathrooms) || 0,
        balconies: num(form.balconies) || 0,
        furnishing: form.furnishing || null,
        floor_number: num(form.floor_number),
        total_floors: num(form.total_floors),
        built_up_area: num(form.built_up_area),
        carpet_area: num(form.carpet_area),
        parking: (Number(form.parking_indoor) || 0) + (Number(form.parking_outdoor) || 0),
        facing: form.facing || null,
        age_of_property: num(form.age_of_property),
        ownership_type: form.ownership_type || null,
        amenities: selectedAmenities,
        images: [...mediaItems]
          .filter((m) => m.type === 'image' && !m.uploading)
          .sort((a, b) => (a.isCover === b.isCover ? a.order - b.order : a.isCover ? -1 : 1))
          .map((m) => m.url),
        cover_image_url: coverImageUrl || null,
        media_urls: {
          videos: videoUrl ? [videoUrl] : [],
          virtual_tour: virtualTourUrl || null,
        },
        features: {
          ...existingFeatures,
          category: form.category || null,
          property_sub_type: form.property_sub_type || null,
          city_name: form.city_name || null,
          locality_name: form.locality_name || null,
          maintenance: num(form.maintenance),
          negotiable: form.negotiable,
          rera_number: form.rera_number || null,
          ownership_role: form.ownership_role || null,
          parking_indoor: Number(form.parking_indoor) || 0,
          parking_outdoor: Number(form.parking_outdoor) || 0,
          media_items: mediaItems
            .filter((m) => !m.uploading)
            .map(({ id, url, type, isCover, order, bucket, path }) => ({ id, url, type, isCover, order, bucket, path })),
        },
      };

      if (shouldSubmit) {
        payload.status = 'submitted';
        payload.approval_status = 'Pending';
        payload.is_draft = false;
        payload.is_live = false;
      } else if (propertyStatus === 'draft') {
        payload.status = 'draft';
        payload.is_draft = true;
      }

      const { error } = await supabase.from('properties').update(payload).eq('id', propertyId);
      if (error) throw error;

      if (shouldSubmit) {
        triggerAiVerification(propertyId);
        triggerPropertySeoGeneration(propertyId);
      }

      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });

      toast.addToast('success', shouldSubmit ? 'Property submitted for admin review!' : 'Property updated successfully');
      onClose();
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic & Pricing', icon: Building2 },
    { id: 'specs', label: 'Specifications', icon: Sliders },
    { id: 'location', label: 'Location & Amenities', icon: MapPin },
    { id: 'media', label: 'Photos & Media', icon: ImageIcon },
  ] as const;

  return (
    <Modal open={!!propertyId} onClose={onClose} size="lg">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-red-600 mb-2" />
          <span className="text-xs font-semibold text-navy-500">Loading property details...</span>
        </div>
      ) : loadError ? (
        <div className="py-10 text-center space-y-3">
          <p className="text-sm font-semibold text-error-600">{loadError}</p>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-navy-900 flex items-center gap-2">
                Edit Property Details
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                  propertyStatus === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                )}>
                  {propertyStatus}
                </span>
              </h3>
              <p className="text-xs text-navy-400">Update property pricing, specifications, and photos</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-navy-400 hover:bg-navy-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Compact Tab Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-navy-50 rounded-xl border border-navy-100 overflow-x-auto">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                    isActive ? 'bg-white text-red-600 shadow-xs' : 'text-navy-500 hover:text-navy-900'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Container */}
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {/* TAB 1: BASIC & PRICING */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy-600">Basic Information</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Purpose" value={form.purpose} onChange={(e) => set('purpose', e.target.value as 'Sale' | 'Rent')}>
                      <option value="Sale">Sale</option>
                      <option value="Rent">Rent</option>
                    </Select>
                    <Input label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Apartment, House, Plot..." />
                    <div className="sm:col-span-2">
                      <Input label="Property Title *" value={form.title} error={errors.title} onChange={(e) => set('title', e.target.value)} placeholder="Title..." />
                    </div>
                    <div className="sm:col-span-2">
                      <Textarea label="Description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Highlight key features..." />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">Pricing & Commercials</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {form.purpose === 'Sale' ? (
                      <Input
                        label="Asking Price (₹) *"
                        type="number"
                        value={form.price}
                        error={errors.price}
                        onChange={(e) => set('price', e.target.value)}
                        placeholder="e.g. 8500000"
                      />
                    ) : (
                      <Input
                        label="Monthly Rent (₹) *"
                        type="number"
                        value={form.rent_amount}
                        error={errors.rent_amount}
                        onChange={(e) => set('rent_amount', e.target.value)}
                        placeholder="e.g. 25000"
                      />
                    )}
                    <Input label="Security Deposit (₹)" type="number" value={form.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} placeholder="e.g. 50000" />
                    <Input label="Maintenance (₹/mo)" type="number" value={form.maintenance} onChange={(e) => set('maintenance', e.target.value)} placeholder="e.g. 2500" />
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="modal-negotiable"
                        checked={form.negotiable}
                        onChange={(e) => set('negotiable', e.target.checked)}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="modal-negotiable" className="text-xs font-semibold text-navy-800">
                        Price is Negotiable
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SPECIFICATIONS */}
            {activeTab === 'specs' && (
              <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy-600">Layout & Areas</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Bedrooms" type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} placeholder="e.g. 3" />
                  <Input label="Bathrooms" type="number" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} placeholder="e.g. 2" />
                  <Input label="Balconies" type="number" value={form.balconies} onChange={(e) => set('balconies', e.target.value)} placeholder="e.g. 1" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Carpet Area (Sq.Ft)" type="number" value={form.carpet_area} onChange={(e) => set('carpet_area', e.target.value)} placeholder="e.g. 1450" />
                  <Input label="Built-Up Area" type="number" value={form.built_up_area} onChange={(e) => set('built_up_area', e.target.value)} placeholder="e.g. 1750" />
                  <Input label="Plot Area" type="number" value={form.plot_area} onChange={(e) => set('plot_area', e.target.value)} placeholder="e.g. 200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Floor No." type="number" value={form.floor_number} onChange={(e) => set('floor_number', e.target.value)} placeholder="e.g. 4" />
                  <Input label="Total Floors" type="number" value={form.total_floors} onChange={(e) => set('total_floors', e.target.value)} placeholder="e.g. 12" />
                  <Select label="Facing" value={form.facing} onChange={(e) => set('facing', e.target.value)}>
                    <option value="">Select Facing</option>
                    {FACING_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Furnishing Status" value={form.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
                    <option value="">Select Furnishing</option>
                    {FURNISHING_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                  <Input label="RERA Number" value={form.rera_number} onChange={(e) => set('rera_number', e.target.value)} placeholder="e.g. P51800047XXX" />
                </div>
              </div>
            )}

            {/* TAB 3: LOCATION & AMENITIES */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy-600">Location</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="City *" value={form.city_name} error={errors.city_name} onChange={(e) => set('city_name', e.target.value)} placeholder="e.g. Hyderabad" />
                    <Input label="Locality *" value={form.locality_name} error={errors.locality_name} onChange={(e) => set('locality_name', e.target.value)} placeholder="e.g. Gachibowli" />
                    <div className="sm:col-span-2">
                      <Input label="Full Address *" value={form.address} error={errors.address} onChange={(e) => set('address', e.target.value)} placeholder="Door / Flat, Tower, Street..." />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy-600">Amenities ({selectedAmenities.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AMENITIES_LIST.map((a) => {
                      const isSelected = selectedAmenities.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAmenity(a.id)}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold text-left transition-all',
                            isSelected ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-navy-150 bg-white text-navy-700 hover:border-navy-250'
                          )}
                        >
                          <span>{a.icon}</span>
                          <span className="truncate">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PHOTOS & MEDIA */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-3">
                  <FieldLabel>Photo Gallery ({mediaItems.length}/{MAX_MEDIA_FILES})</FieldLabel>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-navy-200 rounded-xl cursor-pointer hover:bg-navy-50 transition-colors">
                    <Camera className="h-6 w-6 text-navy-400 mb-1" />
                    <span className="text-xs font-bold text-navy-800">Add Property Photos</span>
                    <span className="text-[10px] text-navy-400">JPG, PNG, WEBP up to 5MB</span>
                    <input type="file" multiple accept={ACCEPTED_MEDIA_TYPES.join(',')} className="hidden" onChange={(e) => { if (e.target.files) handleMediaUpload(e.target.files); e.target.value = ''; }} />
                  </label>

                  {mediaItems.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                      {mediaItems.map((item, i) => (
                        <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-navy-100 border border-navy-200 group">
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                          {item.isCover && (
                            <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                              Cover
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            {!item.isCover && (
                              <button type="button" onClick={() => setCoverMedia(item.id)} className="h-6 w-6 rounded-full bg-white text-navy-800 flex items-center justify-center">
                                <Star className="h-3 w-3" />
                              </button>
                            )}
                            <button type="button" onClick={() => removeMedia(item)} className="h-6 w-6 rounded-full bg-white text-red-600 flex items-center justify-center">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submission Confirmation Prompt */}
          {showConfirmSubmit && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mt-3 text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <Send className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Submit Property for Admin Approval?</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    Once submitted, this property will be sent to the admin team for verification and will move to Pending review.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Cancel / Keep Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={async () => {
                    setShowConfirmSubmit(false);
                    await handleSave(true);
                  }}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Confirm & Submit
                </Button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="rounded-xl text-xs font-bold"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save Changes
              </Button>
              {propertyStatus === 'draft' && !showConfirmSubmit && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowConfirmSubmit(true)}
                  disabled={saving}
                  className="rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Submit for Review
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
