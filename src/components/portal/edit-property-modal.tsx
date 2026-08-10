import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Eye, Loader2, PlayCircle, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFile, deleteFile } from '../../lib/storage';
import { useToast } from '../toast';
import { Modal, Button, Input, Textarea, Select } from '../ui';
import { LocationAutocomplete, type SelectedPlace } from '../location-autocomplete';
import {
  type MediaItem,
  AMENITIES_LIST,
  compressImage,
  isVideoUrl,
  MAX_MEDIA_FILES,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  ACCEPTED_MEDIA_TYPES,
  FieldLabel,
} from '../../pages/portal/property-form-shared';

// Flat, single-page edit form for an EXISTING property — deliberately not the
// List Property wizard's multi-step react-hook-form setup. That schema
// (propertyWizardSchema) is almost entirely `.optional()` at the zod level —
// real requiredness lives in the wizard's imperative per-step validateStep(),
// which is tied to wizard navigation state and not reusable here. This modal
// re-implements the same handful of required-field rules (see validate())
// instead of dragging in the whole wizard machinery for a one-screen form.
interface EditPropertyModalProps {
  propertyId: string | null;
  onClose: () => void;
}

interface EditFormState {
  purpose: 'Sale' | 'Rent';
  category: string;
  property_sub_type: string;
  title: string;
  description: string;
  price: string;
  rent_amount: string;
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
    property_sub_type: '',
    title: '',
    description: '',
    price: '',
    rent_amount: '',
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Hero cover banner / video / virtual tour — same "URL or upload" pattern as the wizard
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
      const features = (data.features as Record<string, unknown>) ?? {};
      const mediaUrls = (data.media_urls as Record<string, unknown>) ?? {};
      setExistingFeatures(features);
      setForm({
        purpose: data.purpose === 'Rent' ? 'Rent' : 'Sale',
        category: String(features.category ?? ''),
        property_sub_type: String(features.property_sub_type ?? ''),
        title: data.title ?? '',
        description: data.description ?? '',
        price: data.price != null ? String(data.price) : '',
        rent_amount: data.rent_amount != null ? String(data.rent_amount) : '',
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
      setSelectedAmenities(Array.isArray(data.amenities) ? data.amenities : []);
      setCoverImageUrl(data.cover_image_url ?? null);
      setVideoUrl(String((mediaUrls.videos as string[] | undefined)?.[0] ?? ''));
      setVirtualTourUrl(String(mediaUrls.virtual_tour ?? ''));

      const items = (features.media_items as MediaItem[] | undefined) ?? [];
      if (items.length > 0) {
        setMediaItems(items);
      } else if (Array.isArray(data.images) && data.images.length > 0) {
        // Rows saved before features.media_items existed only have the flat images[] column.
        setMediaItems(
          (data.images as string[]).map((url, i) => ({
            id: crypto.randomUUID(),
            url,
            type: isVideoUrl(url) ? 'video' : 'image',
            isCover: i === 0,
            order: i,
          })),
        );
      } else {
        setMediaItems([]);
      }
      setErrors({});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // ── Gallery handlers (mirrors list-property.tsx's inline media logic) ──
  const reindexMedia = (items: MediaItem[]): MediaItem[] => items.map((m, i) => ({ ...m, order: i }));

  const handleGalleryFiles = async (rawFiles: File[]) => {
    const room = MAX_MEDIA_FILES - mediaItems.length;
    if (room <= 0) {
      toast.addToast('error', `Maximum ${MAX_MEDIA_FILES} files allowed`);
      return;
    }
    for (const rawFile of rawFiles.slice(0, room)) {
      if (!ACCEPTED_MEDIA_TYPES.includes(rawFile.type)) {
        toast.addToast('error', `${rawFile.name}: unsupported file type`);
        continue;
      }
      const isVideo = rawFile.type.startsWith('video/');
      if (isVideo && rawFile.size > MAX_VIDEO_FILE_SIZE) {
        toast.addToast('error', `${rawFile.name}: exceeds 20MB limit`);
        continue;
      }
      const file = isVideo ? rawFile : await compressImage(rawFile);
      if (!isVideo && file.size > MAX_IMAGE_FILE_SIZE) {
        toast.addToast('error', `${rawFile.name}: still exceeds 5MB after compression`);
        continue;
      }
      const bucket = isVideo ? 'property-videos' : 'property-images';
      const tempId = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);
      setMediaItems((prev) =>
        reindexMedia([...prev, { id: tempId, url: localUrl, type: isVideo ? 'video' : 'image', isCover: prev.length === 0, order: 0, uploading: true }]),
      );
      const { url, path, error } = await uploadFile(bucket, file);
      if (error) {
        toast.addToast('error', `${file.name}: ${error}`);
        setMediaItems((prev) => reindexMedia(prev.filter((m) => m.id !== tempId)));
        continue;
      }
      setMediaItems((prev) =>
        reindexMedia(prev.map((m) => (m.id === tempId ? { ...m, url: url!, bucket, path, uploading: false } : m))),
      );
    }
  };

  const addMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      toast.addToast('error', 'Enter a valid image/video URL');
      return;
    }
    setMediaItems((prev) =>
      reindexMedia([...prev, { id: crypto.randomUUID(), url, type: isVideoUrl(url) ? 'video' : 'image', isCover: prev.length === 0, order: 0 }]),
    );
    setMediaUrlInput('');
  };

  const removeMedia = async (item: MediaItem) => {
    if (item.bucket && item.path) await deleteFile(item.bucket, item.path);
    setMediaItems((prev) => {
      const next = prev.filter((m) => m.id !== item.id);
      if (item.isCover && next.length > 0) next[0] = { ...next[0], isCover: true };
      return reindexMedia(next);
    });
  };

  const setCoverMedia = (id: string) =>
    setMediaItems((prev) => prev.map((m) => ({ ...m, isCover: m.id === id })));

  const moveMedia = (index: number, dir: -1 | 1) => {
    setMediaItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return reindexMedia(next);
    });
  };

  // ── Hero cover / video / virtual tour ──
  const handleCoverUpload = async (rawFile: File) => {
    if (!ACCEPTED_MEDIA_TYPES.includes(rawFile.type) || rawFile.type.startsWith('video/')) {
      toast.addToast('error', 'Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }
    setCoverUploading(true);
    try {
      const file = await compressImage(rawFile);
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        toast.addToast('error', `${rawFile.name}: exceeds 5MB limit`);
        return;
      }
      const { url, error } = await uploadFile('property-images', file);
      if (error) toast.addToast('error', error);
      else if (url) setCoverImageUrl(url);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleVideoUpload = async (rawFile: File) => {
    if (!rawFile.type.startsWith('video/')) {
      toast.addToast('error', 'Please select a valid video file (MP4 or MOV)');
      return;
    }
    if (rawFile.size > MAX_VIDEO_FILE_SIZE) {
      toast.addToast('error', `${rawFile.name}: exceeds ${MAX_VIDEO_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }
    setVideoUploading(true);
    try {
      const { url, error } = await uploadFile('property-videos', rawFile);
      if (error) toast.addToast('error', error);
      else if (url) setVideoUrl(url);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVirtualTourUpload = async (rawFile: File) => {
    if (!ACCEPTED_MEDIA_TYPES.includes(rawFile.type)) {
      toast.addToast('error', 'Unsupported file type for virtual tour');
      return;
    }
    const isVideo = rawFile.type.startsWith('video/');
    if (isVideo && rawFile.size > MAX_VIDEO_FILE_SIZE) {
      toast.addToast('error', `${rawFile.name}: exceeds ${MAX_VIDEO_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }
    if (!isVideo && rawFile.size > MAX_IMAGE_FILE_SIZE) {
      toast.addToast('error', `${rawFile.name}: exceeds ${MAX_IMAGE_FILE_SIZE / 1024 / 1024}MB limit`);
      return;
    }
    setVirtualTourUploading(true);
    try {
      const { url, error } = await uploadFile(isVideo ? 'property-videos' : 'property-images', rawFile);
      if (error) toast.addToast('error', error);
      else if (url) setVirtualTourUrl(url);
    } finally {
      setVirtualTourUploading(false);
    }
  };

  const handleLocationSelect = (place: SelectedPlace) => {
    setForm((f) => ({
      ...f,
      address: place.address || f.address,
      city_name: place.city || f.city_name,
      locality_name: place.locality || f.locality_name,
      state_name: place.state || f.state_name,
      pincode: place.postalCode || f.pincode,
      latitude: place.latitude,
      longitude: place.longitude,
      place_id: place.placeId,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.title.trim() && !form.city_name.trim()) {
      errs.title = 'Enter a title, or at least a city so one can be generated';
    }
    if (form.purpose === 'Sale' && (!form.price || Number(form.price) <= 0)) {
      errs.price = 'Enter a valid price';
    }
    if (form.purpose === 'Rent' && (!form.rent_amount || Number(form.rent_amount) <= 0)) {
      errs.rent_amount = 'Enter a valid monthly rent';
    }
    const numericFields: (keyof EditFormState)[] = [
      'built_up_area', 'carpet_area', 'plot_area', 'floor_number', 'total_floors',
      'bedrooms', 'bathrooms', 'balconies', 'parking_indoor', 'parking_outdoor', 'age_of_property',
    ];
    for (const key of numericFields) {
      const v = form[key] as string;
      if (v && Number.isNaN(Number(v))) errs[key] = 'Must be a number';
    }
    if (mediaItems.filter((m) => !m.uploading).length === 0) {
      errs.media = 'Add at least one photo';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.addToast('error', Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!propertyId) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const num = (v: string) => (v.trim() ? Number(v) : null);
      const autoTitle = form.title.trim() || `${form.purpose} - ${form.property_sub_type || form.category || 'Property'}${form.city_name ? ` in ${form.city_name}` : ''}`;
      const autoAddress = form.address.trim() || [form.locality_name, form.city_name].filter(Boolean).join(', ') || null;

      // Explicit whitelist of editable columns — never spreads the fetched row, so
      // system-managed fields (status, approval_status, is_live, owner_id, created_at,
      // ai_*, verification_*, seo_*, etc.) can never be touched by this update.
      const payload: Record<string, unknown> = {
        purpose: form.purpose,
        title: autoTitle,
        description: form.description || null,
        address: autoAddress,
        state: form.state_name || null,
        pincode: form.pincode || null,
        place_id: form.place_id || null,
        latitude: form.latitude,
        longitude: form.longitude,
        price: form.purpose === 'Sale' ? num(form.price) ?? 0 : num(form.price) ?? 0,
        rent_amount: num(form.rent_amount),
        security_deposit: num(form.security_deposit),
        bedrooms: num(form.bedrooms) ?? 0,
        bathrooms: num(form.bathrooms) ?? 0,
        balconies: num(form.balconies) ?? 0,
        furnishing: form.furnishing || null,
        floor_number: num(form.floor_number),
        total_floors: num(form.total_floors),
        built_up_area: num(form.built_up_area),
        carpet_area: num(form.carpet_area),
        plot_area: num(form.plot_area),
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
          media_items: mediaItems.filter((m) => !m.uploading).map(({ id, url, type, isCover, order, bucket, path }) => ({ id, url, type, isCover, order, bucket, path })),
        },
      };

      const { error } = await supabase.from('properties').update(payload).eq('id', propertyId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      toast.addToast('success', 'Property updated successfully');
      onClose();
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!propertyId} onClose={onClose} title="Edit Property" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-navy-400" />
        </div>
      ) : loadError ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-error-600">{loadError}</p>
          <Button variant="secondary" className="mt-4" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
          {/* Basic Information */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Basic Information</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Purpose" value={form.purpose} onChange={(e) => set('purpose', e.target.value as 'Sale' | 'Rent')}>
                <option value="Sale">Sale</option>
                <option value="Rent">Rent</option>
              </Select>
              <Input label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Residential, Commercial, Land..." />
              <Input label="Property Type" value={form.property_sub_type} onChange={(e) => set('property_sub_type', e.target.value)} placeholder="Apartment, Villa, Plot..." />
              <Input label="Title" value={form.title} error={errors.title} onChange={(e) => set('title', e.target.value)} placeholder="Auto-generated if left blank" />
              <div className="sm:col-span-2">
                <Textarea label="Description" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Pricing</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Price (₹)" type="number" value={form.price} error={errors.price} onChange={(e) => set('price', e.target.value)} disabled={form.purpose === 'Rent'} />
              <Input label="Monthly Rent (₹)" type="number" value={form.rent_amount} error={errors.rent_amount} onChange={(e) => set('rent_amount', e.target.value)} disabled={form.purpose === 'Sale'} />
              <Input label="Security Deposit (₹)" type="number" value={form.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} />
              <Input label="Maintenance (₹/mo)" type="number" value={form.maintenance} onChange={(e) => set('maintenance', e.target.value)} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-navy-700">
              <input type="checkbox" checked={form.negotiable} onChange={(e) => set('negotiable', e.target.checked)} className="h-4 w-4 rounded border-navy-300 text-red-600" />
              Price is negotiable
            </label>
          </section>

          {/* Location */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Location</h4>
            <div className="mb-3">
              <FieldLabel>Search to update location (optional)</FieldLabel>
              <LocationAutocomplete onSelect={handleLocationSelect} initialAddress={form.address} initialLat={form.latitude ?? undefined} initialLng={form.longitude ?? undefined} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <Input label="City" value={form.city_name} onChange={(e) => set('city_name', e.target.value)} />
              <Input label="Locality" value={form.locality_name} onChange={(e) => set('locality_name', e.target.value)} />
              <Input label="State" value={form.state_name} onChange={(e) => set('state_name', e.target.value)} />
              <Input label="Pincode" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
            </div>
          </section>

          {/* Specifications */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Specifications</h4>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Input label="Bedrooms" type="number" value={form.bedrooms} error={errors.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
              <Input label="Bathrooms" type="number" value={form.bathrooms} error={errors.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
              <Input label="Balconies" type="number" value={form.balconies} error={errors.balconies} onChange={(e) => set('balconies', e.target.value)} />
              <Input label="Built-up Area (sqft)" type="number" value={form.built_up_area} error={errors.built_up_area} onChange={(e) => set('built_up_area', e.target.value)} />
              <Input label="Carpet Area (sqft)" type="number" value={form.carpet_area} error={errors.carpet_area} onChange={(e) => set('carpet_area', e.target.value)} />
              <Input label="Plot Area (sqft)" type="number" value={form.plot_area} error={errors.plot_area} onChange={(e) => set('plot_area', e.target.value)} />
              <Input label="Floor Number" type="number" value={form.floor_number} error={errors.floor_number} onChange={(e) => set('floor_number', e.target.value)} />
              <Input label="Total Floors" type="number" value={form.total_floors} error={errors.total_floors} onChange={(e) => set('total_floors', e.target.value)} />
              <Select label="Facing" value={form.facing} onChange={(e) => set('facing', e.target.value)}>
                <option value="">Select</option>
                {FACING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
              <Select label="Furnishing" value={form.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
                <option value="">Select</option>
                {FURNISHING_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
              <Input label="Age of Property (years)" type="number" value={form.age_of_property} error={errors.age_of_property} onChange={(e) => set('age_of_property', e.target.value)} />
              <Input label="Indoor Parking" type="number" value={form.parking_indoor} error={errors.parking_indoor} onChange={(e) => set('parking_indoor', e.target.value)} />
              <Input label="Outdoor Parking" type="number" value={form.parking_outdoor} error={errors.parking_outdoor} onChange={(e) => set('parking_outdoor', e.target.value)} />
              <Input label="Ownership Type" value={form.ownership_type} onChange={(e) => set('ownership_type', e.target.value)} placeholder="Freehold, Leasehold..." />
            </div>
          </section>

          {/* Amenities */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Amenities</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AMENITIES_LIST.map((a) => {
                const active = selectedAmenities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAmenity(a.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${active ? 'border-red-400 bg-red-50 text-red-700' : 'border-navy-150 bg-white text-navy-600 hover:bg-navy-50'}`}
                  >
                    <span>{a.icon}</span> {a.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ownership & Legal */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-navy-500">Ownership &amp; Legal</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Ownership Role" value={form.ownership_role} onChange={(e) => set('ownership_role', e.target.value)} placeholder="Owner, Agent, Builder..." />
              <Input label="RERA Number" value={form.rera_number} onChange={(e) => set('rera_number', e.target.value)} />
            </div>
          </section>

          {/* Property Media */}
          <section className="rounded-2xl border border-navy-100 p-4">
            <h4 className="mb-1 text-sm font-bold uppercase tracking-widest text-navy-500">Property Gallery</h4>
            {errors.media && <p className="mb-2 text-xs font-semibold text-error-600">{errors.media}</p>}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleGalleryFiles(Array.from(e.dataTransfer.files)); }}
              className="rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/30 p-6 text-center"
            >
              <Camera className="mx-auto mb-2 h-6 w-6 text-navy-400" />
              <p className="mb-1 text-xs font-semibold text-navy-700">Drag &amp; drop or upload photos/videos</p>
              <p className="mb-3 text-[11px] text-navy-400">Images: Max 5MB each. Videos: Max 20MB each. Up to {MAX_MEDIA_FILES} files ({mediaItems.length}/{MAX_MEDIA_FILES})</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800">
                <Camera className="h-3.5 w-3.5" /> Choose Files
                <input type="file" multiple accept={ACCEPTED_MEDIA_TYPES.join(',')} className="hidden" onChange={(e) => { handleGalleryFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <Input value={mediaUrlInput} onChange={(e) => setMediaUrlInput(e.target.value)} placeholder="Or paste image/video URL..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMediaUrl(); } }} className="flex-1" />
              <Button type="button" variant="secondary" onClick={addMediaUrl}>Add</Button>
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {mediaItems.map((item, i) => (
                  <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-navy-100 shadow-sm">
                    {item.type === 'video' ? <video src={item.url} className="h-full w-full object-cover" muted /> : <img src={item.url} alt="" className="h-full w-full object-cover" />}
                    {item.type === 'video' && <PlayCircle className="pointer-events-none absolute inset-0 m-auto h-7 w-7 text-white drop-shadow" />}
                    {item.uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                    {item.isCover && !item.uploading && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white shadow"><Star className="h-2.5 w-2.5 fill-current" /> Cover</span>
                    )}
                    {!item.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                        <button type="button" onClick={() => setPreviewItem(item)} title="Preview" className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy-800 hover:bg-white"><Eye className="h-3 w-3" /></button>
                        {!item.isCover && <button type="button" onClick={() => setCoverMedia(item.id)} title="Set as cover" className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy-800 hover:bg-white"><Star className="h-3 w-3" /></button>}
                        <button type="button" onClick={() => moveMedia(i, -1)} title="Move left" className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy-800 hover:bg-white">‹</button>
                        <button type="button" onClick={() => moveMedia(i, 1)} title="Move right" className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-navy-800 hover:bg-white">›</button>
                        <button type="button" onClick={() => removeMedia(item)} title="Delete" className="grid h-6 w-6 place-items-center rounded-full bg-white/90 text-red-600 hover:bg-red-600 hover:text-white"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Hero Cover Banner */}
          <section className="rounded-2xl border border-navy-100 bg-navy-50/30 p-4 mb-4">
            <FieldLabel>COVER IMAGE</FieldLabel>
            <p className="mb-3 text-xs text-navy-400">Upload the main cover image for your property. Supported: JPG, JPEG, PNG, WEBP. Maximum size: 5 MB.</p>
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <div className="w-full flex-1 space-y-2">
                <Input value={coverImageUrl ?? ''} onChange={(e) => setCoverImageUrl(e.target.value || null)} placeholder="Paste cover image URL..." />
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50 ${coverUploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <Camera className="h-3.5 w-3.5" /> {coverUploading ? 'Uploading…' : 'Upload Cover Image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ''; }} />
                </label>
              </div>
              {coverImageUrl && (
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-navy-150 bg-navy-100">
                  <img src={coverImageUrl} alt="Cover preview" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setCoverImageUrl(null)} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><X className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          </section>

          {/* Video + Virtual Tour */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-navy-100 p-4">
              <FieldLabel>Property Video (YouTube / Vimeo)</FieldLabel>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="mb-2" />
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50 ${videoUploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Camera className="h-3.5 w-3.5" /> {videoUploading ? 'Uploading…' : 'Upload Video File'}
                <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />
              </label>
              {videoUrl && !videoUrl.includes('youtube') && !videoUrl.includes('vimeo') && (
                <video src={videoUrl} controls className="mt-2 h-28 w-full rounded-xl bg-black object-contain" />
              )}
            </div>
            <div className="rounded-2xl border border-navy-100 p-4">
              <FieldLabel>Virtual Tour URL</FieldLabel>
              <Input value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} placeholder="https://..." className="mb-2" />
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50 ${virtualTourUploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Camera className="h-3.5 w-3.5" /> {virtualTourUploading ? 'Uploading…' : 'Upload Virtual Tour File'}
                <input type="file" accept={ACCEPTED_MEDIA_TYPES.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVirtualTourUpload(f); e.target.value = ''; }} />
              </label>
              {virtualTourUrl && <p className="mt-2 truncate text-xs font-medium text-navy-500">📎 {virtualTourUrl}</p>}
            </div>
          </section>

          {previewItem && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6" onClick={() => setPreviewItem(null)}>
              {previewItem.type === 'video' ? (
                <video src={previewItem.url} controls autoPlay className="max-h-[80vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
              ) : (
                <img src={previewItem.url} alt="" className="max-h-[80vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !loadError && (
        <div className="mt-6 flex justify-end gap-3 border-t border-navy-100 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      )}
    </Modal>
  );
}
