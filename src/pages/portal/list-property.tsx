import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Save,
  Shield,
  X,
  MapPin,
  Home,
  Star,
  Camera,
  Loader2,
  Edit3,
  CheckCircle2,
  ChevronDown,
  Send,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard-layout';
import { getPortalSections, getAgentSections } from './sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Button } from '../../components/ui';
import { propertyWizardSchema, PropertyWizardForm, UNIVERSAL_STEPS } from './wizard-schema';
import {
  getPropertyCategoryDef,
  getCategoriesByMainType,
  MainPropertyType,
  PropertyCategoryDefinition,
} from '../../lib/property-category-config';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { LocationAutocomplete, type SelectedPlace } from '../../components/location-autocomplete';
import { supabase } from '../../lib/supabase';
import { checkListingLimit, FREE_PLAN_LIMIT, type ListingUsage } from '../../lib/listing-limits';
import { triggerAiVerification, triggerPropertySeoGeneration } from '../../lib/properties';
import { ensureUserProfile } from '../../lib/profile-utils';
import { uploadFile, deleteFile, type StorageBucket } from '../../lib/storage';
import { cn, formatPrice } from '../../lib/utils';
import { validatePropertyPrice } from '../../lib/price-validation';
import { useServiceStatus, SERVICE_KEYS } from '../../lib/service-status';
import { ServiceUnavailable } from '../../components/service-unavailable';
import {
  type MediaItem,
  MAX_MEDIA_FILES,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  ACCEPTED_MEDIA_TYPES,
  compressImage,
  isVideoUrl,
  isValidMediaUrl,
  PURPOSE_OPTIONS,
  AMENITIES_LIST,
  FieldLabel,
  InputField,
  TextAreaField,
  SelectField,
  SectionTitle,
} from './property-form-shared';

export type { MediaItem };

export function ListPropertyWizard({
  isAdminMode = false,
  disableLayout = false,
  initialCategory,
}: {
  isAdminMode?: boolean;
  disableLayout?: boolean;
  initialCategory?: string;
} = {}) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useLanguageContext();
  const wizardSections = profile?.role === 'agent' ? getAgentSections(t) : getPortalSections(t);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Exactly 3 Steps: 0 = Property Basics, 1 = Details & Media, 2 = Review & Publish
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const draftIdParam = searchParams.get('draft_id') || searchParams.get('id');
  const urlCategoryParam = searchParams.get('category') || initialCategory;
  const [draftId, setDraftId] = useState<string | null>(draftIdParam);
  const [submissionId] = useState(() => crypto.randomUUID());
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDraftSavedModal, setShowDraftSavedModal] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);
  const [savedDraftInfo, setSavedDraftInfo] = useState<{ id: string; title: string } | null>(null);
  const [submittedPropertyId, setSubmittedPropertyId] = useState<string | null>(null);

  // Quota & Service Status
  const [quotaChecked, setQuotaChecked] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<ListingUsage | null>(null);
  const { isActive: listPropertyActive, loading: listPropertyLoading } = useServiceStatus(SERVICE_KEYS.LIST_PROPERTY);

  // Selected Category Object
  const [selectedMainType, setSelectedMainType] = useState<MainPropertyType>('Residential');
  const [selectedCategoryDef, setSelectedCategoryDef] = useState<PropertyCategoryDefinition>(() =>
    getPropertyCategoryDef(urlCategoryParam || 'apartment-flats')
  );

  // Step 2 Specifications local state
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [balconies, setBalconies] = useState(1);
  const [furnishing, setFurnishing] = useState('Semi-Furnished');
  const [negotiable, setNegotiable] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Step 2 Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['parking', 'security', 'power_backup']);
  const toggleAmenity = (id: string) =>
    setSelectedAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Step 2 Media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageUploading, setCoverImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [virtualTourUploading, setVirtualTourUploading] = useState(false);

  // Form State & Validation
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(!!draftIdParam);
  const isSubmittedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Area-Based Pricing State (Commercial & Plot Support)
  const [rateUnit, setRateUnit] = useState<'Sq.Ft' | 'Sq.Yd'>('Sq.Ft');
  const [ratePerUnit, setRatePerUnit] = useState<string>('');
  const [pricingMode, setPricingMode] = useState<'rate' | 'total'>('rate');

  const methods = useForm<PropertyWizardForm>({
    resolver: zodResolver(propertyWizardSchema) as any,
    mode: 'onChange',
    defaultValues: {
      purpose: 'Sale',
      property_type: 'Residential',
      category: 'Apartment Flats',
      category_slug: 'apartment-flats',
      property_sub_type: 'Apartment',
      amenities: ['parking', 'security', 'power_backup'],
      images: [],
      negotiable: true,
      ownership_role: 'Owner',
      ownership_type: 'Freehold',
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
    },
  });

  const { handleSubmit, watch, register, getValues, setValue, reset } = methods;

  // Sync category on change
  const handleSelectCategory = (cat: PropertyCategoryDefinition) => {
    setSelectedCategoryDef(cat);
    setSelectedMainType(cat.mainType);
    setValue('category', cat.name, { shouldDirty: true });
    setValue('category_slug', cat.slug, { shouldDirty: true });
    setValue('property_type', cat.mainType, { shouldDirty: true });
    setValue('property_sub_type', cat.name, { shouldDirty: true });

    if (cat.mainType === 'Plot') {
      setRateUnit('Sq.Yd');
    } else if (cat.mainType === 'Commercial') {
      setRateUnit('Sq.Ft');
    }

    // Set recommended amenities if none selected
    if (selectedAmenities.length === 0 && cat.recommendedAmenities.length > 0) {
      setSelectedAmenities(cat.recommendedAmenities.slice(0, 4));
    }
  };

  const handleSelectMainType = (type: MainPropertyType) => {
    setSelectedMainType(type);
    setValue('property_type', type, { shouldDirty: true });
    if (type === 'Plot') {
      setRateUnit('Sq.Yd');
    } else if (type === 'Commercial') {
      setRateUnit('Sq.Ft');
    }
    const available = getCategoriesByMainType(type);
    if (available.length > 0 && (!selectedCategoryDef || selectedCategoryDef.mainType !== type)) {
      handleSelectCategory(available[0]);
    }
  };

  // Quota check
  useEffect(() => {
    if (!user) return;
    async function checkQuota() {
      if (!user) return;
      if (draftIdParam) {
        setQuotaChecked(true);
        return;
      }
      const usage = await checkListingLimit(user.id);
      setQuotaInfo(usage);
      if (!usage.canList) {
        setQuotaExceeded(true);
      } else {
        setQuotaExceeded(false);
      }
      setQuotaChecked(true);
    }
    checkQuota();
  }, [user, draftIdParam]);

  // Draft recovery
  useEffect(() => {
    if (draftIdParam && isRestoring) {
      import('../../lib/properties').then(({ getDraftProperty }) => {
        getDraftProperty(draftIdParam)
          .then((draft) => {
            if (draft) {
              const formData: Partial<PropertyWizardForm> = draft.draft_data || {
                purpose: draft.purpose || 'Sale',
                category: draft.features?.category || 'Apartment Flats',
                category_slug: draft.features?.category_slug || 'apartment-flats',
                property_type: (draft.features?.property_type || 'Residential') as any,
                property_sub_type: draft.features?.property_sub_type || 'Apartment',
                title: draft.title || '',
                description: draft.description || '',
                price: draft.price ? String(draft.price) : '',
                rent_amount: draft.rent_amount ? String(draft.rent_amount) : '',
                security_deposit: draft.security_deposit ? String(draft.security_deposit) : '',
                maintenance: draft.features?.maintenance ? String(draft.features.maintenance) : '',
                negotiable: draft.features?.negotiable !== false,
                address: draft.address || '',
                city_name: draft.features?.city_name || '',
                locality_name: draft.features?.locality_name || '',
                state_name: draft.state || '',
                pincode: draft.pincode || '',
                latitude: draft.latitude ? String(draft.latitude) : '',
                longitude: draft.longitude ? String(draft.longitude) : '',
                place_id: draft.place_id || '',
                carpet_area: draft.carpet_area ? String(draft.carpet_area) : '',
                built_up_area: draft.built_up_area ? String(draft.built_up_area) : '',
                super_area: draft.features?.super_area ? String(draft.features.super_area) : '',
                plot_area: draft.plot_area ? String(draft.plot_area) : '',
                floor_number: draft.floor_number ? String(draft.floor_number) : '',
                total_floors: draft.total_floors ? String(draft.total_floors) : '',
                facing: draft.facing || '',
                age_of_property: draft.age_of_property ? String(draft.age_of_property) : '',
                parking_indoor: draft.features?.parking_indoor ? String(draft.features.parking_indoor) : '',
                parking_outdoor: draft.features?.parking_outdoor ? String(draft.features.parking_outdoor) : '',
                ownership_type: draft.ownership_type || 'Freehold',
                ownership_role: draft.features?.ownership_role || 'Owner',
                rera_number: draft.features?.rera_number || '',
                custom_attributes: draft.features?.custom_attributes || {},
              };

              reset(formData as any);
              setDraftId(draftIdParam);
              setActiveStep(Math.min(2, Math.max(0, draft.current_step ?? 0)));
              setBedrooms(draft.bedrooms ?? 2);
              setBathrooms(draft.bathrooms ?? 2);
              setBalconies(draft.balconies ?? 1);
              setFurnishing(draft.furnishing || 'Semi-Furnished');
              setSelectedAmenities(draft.amenities || []);

              // Restore Category Definition
              const foundCat = getPropertyCategoryDef(formData.category_slug || formData.category);
              setSelectedCategoryDef(foundCat);
              setSelectedMainType(foundCat.mainType);

              if (draft.features?.rate_per_unit || draft.features?.price_per_unit || draft.features?.price_per_sqft) {
                setRatePerUnit(String(draft.features.rate_per_unit || draft.features.price_per_unit || draft.features.price_per_sqft));
              }
              if (draft.features?.rate_unit || draft.features?.area_unit) {
                setRateUnit(draft.features.rate_unit || draft.features.area_unit);
              }
              if (draft.features?.pricing_mode) {
                setPricingMode(draft.features.pricing_mode);
              }

              if (draft.features?.media_items?.length) {
                setMediaItems(draft.features.media_items);
              } else if (draft.images?.length) {
                setMediaItems(
                  draft.images.map((url: string, i: number) => ({
                    id: crypto.randomUUID(),
                    url,
                    type: isVideoUrl(url) ? 'video' : 'image',
                    isCover: i === 0,
                    order: i,
                  }))
                );
              }
              if (draft.cover_image_url) {
                setCoverImageUrl(draft.cover_image_url);
              }
            }
            setIsRestoring(false);
          })
          .catch((err) => {
            console.error('Failed to restore draft', err);
            setIsRestoring(false);
          });
      });
    } else {
      setIsRestoring(false);
    }
  }, [draftIdParam]);

  // Media helpers
  const reindexMedia = (items: MediaItem[]): MediaItem[] => items.map((m, i) => ({ ...m, order: i }));

  const applyCoverFromUrl = (url: string) => {
    setCoverImageUrl(url);
    setMediaItems((prev) => {
      const existing = prev.find((m) => m.url === url);
      if (existing) {
        return reindexMedia([existing, ...prev.filter((m) => m.id !== existing.id)]).map((m) => ({
          ...m,
          isCover: m.id === existing.id,
        }));
      }
      const newItem: MediaItem = {
        id: crypto.randomUUID(),
        url,
        type: 'image',
        isCover: true,
        order: 0,
      };
      return reindexMedia([newItem, ...prev.map((m) => ({ ...m, isCover: false }))]);
    });
  };

  const handleCoverImageUpload = async (file: File) => {
    if (!ACCEPTED_MEDIA_TYPES.includes(file.type) || file.type.startsWith('video/')) {
      toast.addToast('error', 'Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setCoverImageUploading(true);
    try {
      const compressed = await compressImage(file);
      const { url, path, error } = await uploadFile('property-images', compressed);
      if (error || !url) throw new Error(error || 'Upload failed');
      applyCoverFromUrl(url);
      toast.addToast('success', 'Cover image uploaded!');
    } catch (err: any) {
      toast.addToast('error', err.message || 'Failed to upload cover image');
    } finally {
      setCoverImageUploading(false);
    }
  };

  const handleMediaFiles = async (rawFiles: File[]) => {
    const room = MAX_MEDIA_FILES - mediaItems.length;
    if (room <= 0) {
      toast.addToast('error', `Maximum ${MAX_MEDIA_FILES} media files allowed.`);
      return;
    }

    for (const rawFile of rawFiles.slice(0, room)) {
      if (!ACCEPTED_MEDIA_TYPES.includes(rawFile.type)) {
        toast.addToast('error', `${rawFile.name}: Unsupported file type.`);
        continue;
      }
      const isVideo = rawFile.type.startsWith('video/');
      if (isVideo && rawFile.size > MAX_VIDEO_FILE_SIZE) {
        toast.addToast('error', `${rawFile.name}: Video exceeds 20MB limit.`);
        continue;
      }
      const file = isVideo ? rawFile : await compressImage(rawFile);
      if (!isVideo && file.size > MAX_IMAGE_FILE_SIZE) {
        toast.addToast('error', `${rawFile.name}: Image exceeds 5MB limit.`);
        continue;
      }

      const bucket: StorageBucket = isVideo ? 'property-videos' : 'property-images';
      const tempId = crypto.randomUUID();
      const localUrl = URL.createObjectURL(file);

      setMediaItems((prev) =>
        reindexMedia([
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

      const { url, path, error } = await uploadFile(bucket, file);
      if (error || !url) {
        toast.addToast('error', `${file.name}: ${error || 'Upload failed'}`);
        setMediaItems((prev) => reindexMedia(prev.filter((m) => m.id !== tempId)));
        continue;
      }

      setMediaItems((prev) => {
        const finalizing = prev.find((m) => m.id === tempId);
        if (finalizing?.isCover && !isVideo && url) setCoverImageUrl(url);
        return reindexMedia(prev.map((m) => (m.id === tempId ? { ...m, url, path, bucket, uploading: false } : m)));
      });
    }
  };

  const addMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    if (!isValidMediaUrl(url)) {
      setMediaUrlError('Enter a valid media URL (jpg, png, webp, mp4)');
      return;
    }
    if (mediaItems.some((m) => m.url === url)) {
      setMediaUrlError('This media is already added');
      return;
    }
    if (mediaItems.length >= MAX_MEDIA_FILES) {
      setMediaUrlError(`Maximum ${MAX_MEDIA_FILES} files allowed`);
      return;
    }
    setMediaUrlError(null);
    const becomesCover = mediaItems.length === 0;
    if (becomesCover) setCoverImageUrl(url);
    setMediaItems((prev) =>
      reindexMedia([
        ...prev,
        { id: crypto.randomUUID(), url, type: isVideoUrl(url) ? 'video' : 'image', isCover: becomesCover, order: 0 },
      ])
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

  const removeMedia = async (item: MediaItem) => {
    if (item.bucket && item.path) {
      deleteFile(item.bucket, item.path).catch(() => {});
    }
    setMediaItems((prev) => {
      const next = reindexMedia(prev.filter((m) => m.id !== item.id));
      if (item.isCover) {
        if (next.length > 0) {
          next[0] = { ...next[0], isCover: true };
          setCoverImageUrl(next[0].url);
        } else {
          setCoverImageUrl(null);
        }
      }
      return next;
    });
  };

  const reorderMedia = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setMediaItems((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return reindexMedia(arr);
    });
  };

  // Location handler
  const handlePlaceSelected = (place: SelectedPlace) => {
    setValue('address', place.address, { shouldValidate: true, shouldDirty: true });
    if (place.city) setValue('city_name', place.city, { shouldValidate: true, shouldDirty: true });
    if (place.locality) setValue('locality_name', place.locality, { shouldValidate: true, shouldDirty: true });
    if (place.state) setValue('state_name', place.state, { shouldDirty: true });
    if (place.country) setValue('country', place.country, { shouldDirty: true });
    if (place.postalCode) setValue('pincode', place.postalCode, { shouldDirty: true });
    setValue('latitude', String(place.latitude), { shouldDirty: true });
    setValue('longitude', String(place.longitude), { shouldDirty: true });
    setValue('place_id', place.placeId, { shouldDirty: true });
  };

  // Validation Engine
  const focusInvalidField = (fieldId: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    });
  };

  const fail = (field: string | null, message: string): false => {
    setFieldError(field);
    toast.addToast('error', message);
    if (field) focusInvalidField(`wizard-field-${field}`);
    return false;
  };

  const isBlank = (v: string | null | undefined) => !v || !v.trim();

  const validateCurrentStep = (stepIdx: number): boolean => {
    const vals = getValues();
    setFieldError(null);

    // STEP 1 — PROPERTY BASICS
    if (stepIdx === 0) {
      if (!vals.purpose) return fail(null, 'Please select a listing purpose.');
      if (!vals.category) return fail(null, 'Please select a property category.');
      if (isBlank(vals.title)) return fail('title', 'Please enter a property title.');
      if (isBlank(vals.city_name)) return fail('city_name', 'City is required. Search via location search or enter city.');
      if (isBlank(vals.locality_name)) return fail('locality_name', 'Locality is required.');
      if (isBlank(vals.address)) return fail('address', 'Full address is required.');
      return true;
    }

    // STEP 2 — DETAILS & MEDIA
    if (stepIdx === 1) {
      const isSale = vals.purpose === 'Sale';
      const priceStr = isSale ? vals.price : vals.rent_amount;
      const priceError = validatePropertyPrice(priceStr);
      if (priceError) {
        return fail(isSale ? 'price' : 'rent_amount', priceError);
      }

      // Category-specific area validation
      const cat = selectedCategoryDef;
      if (cat.showCarpetArea && isBlank(vals.carpet_area) && isBlank(vals.built_up_area) && isBlank(vals.plot_area)) {
        return fail('carpet_area', `Please enter the ${cat.primaryAreaLabel || 'Carpet Area'} for this property.`);
      }
      if (cat.showPlotArea && isBlank(vals.plot_area)) {
        return fail('plot_area', `Please enter the ${cat.primaryAreaLabel || 'Plot / Land Area'}.`);
      }

      // Check media items
      const readyImages = mediaItems.filter((m) => !m.uploading && m.type === 'image');
      if (readyImages.length === 0 && !coverImageUrl) {
        return fail('media-dropzone', 'Please upload at least 1 property photo before continuing.');
      }

      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep(activeStep)) return;
    if (activeStep < 2) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Build DB Payload
  const buildPayload = () => {
    const vals = getValues();
    const isSale = vals.purpose === 'Sale';
    const dbPurpose = isSale ? 'Sale' : 'Rent';

    let dbFurnishing = null;
    if (furnishing === 'Fully Furnished') dbFurnishing = 'Fully Furnished';
    else if (furnishing === 'Semi-Furnished') dbFurnishing = 'Semi-Furnished';
    else if (furnishing === 'Unfurnished') dbFurnishing = 'Unfurnished';

    let ageInt: number | null = null;
    if (vals.age_of_property === '0-1 Years' || vals.age_of_property === '1') ageInt = 1;
    else if (vals.age_of_property === '1-5 Years' || vals.age_of_property === '5') ageInt = 5;
    else if (vals.age_of_property === '5-10 Years' || vals.age_of_property === '10') ageInt = 10;
    else if (vals.age_of_property === '10+ Years') ageInt = 15;

    const autoTitle =
      vals.title?.trim() ||
      `${vals.purpose} ${vals.category || 'Property'} in ${vals.locality_name || ''} ${vals.city_name || ''}`.trim();
    const autoAddress =
      vals.address?.trim() || [vals.locality_name, vals.city_name].filter(Boolean).join(', ') || 'Prime Location';

    const cleanImages = [...mediaItems]
      .filter((m) => m.type === 'image' && !m.uploading)
      .sort((a, b) => (a.isCover === b.isCover ? a.order - b.order : a.isCover ? -1 : 1))
      .map((m) => m.url);

    return {
      owner_id: user?.id,
      status: 'draft' as const,
      is_draft: true,
      current_step: activeStep,
      completed_steps: [0, 1, 2].slice(0, activeStep),
      completion_percentage: Math.round(((activeStep + 1) / 3) * 100),
      draft_data: vals,
      purpose: dbPurpose,
      title: autoTitle,
      description: vals.description || null,
      address: autoAddress,
      place_id: vals.place_id || null,
      latitude: vals.latitude ? parseFloat(vals.latitude) : null,
      longitude: vals.longitude ? parseFloat(vals.longitude) : null,
      state: vals.state_name || null,
      country: vals.country || 'India',
      pincode: vals.pincode || null,
      price: vals.price ? parseFloat(vals.price) : 0,
      rent_amount: vals.rent_amount ? parseFloat(vals.rent_amount) : null,
      security_deposit: vals.security_deposit ? parseFloat(vals.security_deposit) : null,
      bedrooms: selectedCategoryDef.showBhk ? bedrooms : 0,
      bathrooms: selectedCategoryDef.showBathrooms ? bathrooms : 0,
      balconies: selectedCategoryDef.showBalconies ? balconies : 0,
      furnishing: dbFurnishing,
      floor_number: vals.floor_number ? parseInt(vals.floor_number, 10) : null,
      total_floors: vals.total_floors ? parseInt(vals.total_floors, 10) : null,
      built_up_area: vals.built_up_area ? parseFloat(vals.built_up_area) : null,
      carpet_area: vals.carpet_area ? parseFloat(vals.carpet_area) : null,
      plot_area: vals.plot_area ? parseFloat(vals.plot_area) : null,
      parking: (parseInt(vals.parking_indoor || '0', 10) + parseInt(vals.parking_outdoor || '0', 10)) || 0,
      amenities: selectedAmenities,
      images: cleanImages,
      cover_image_url: coverImageUrl || cleanImages[0] || null,
      media_urls: vals.media_urls || null,
      ownership_type: vals.ownership_type || 'Freehold',
      age_of_property: ageInt,
      facing: vals.facing || null,
      nearby_places: vals.nearby_places || null,
      features: {
        original_purpose: vals.purpose,
        category: vals.category,
        category_slug: vals.category_slug || selectedCategoryDef.slug,
        property_type: selectedMainType,
        property_sub_type: vals.property_sub_type || vals.category,
        price_per_sqft: rateSqFt || null,
        price_per_sqyd: rateSqYd || null,
        rate_per_unit: numRate || null,
        rate_unit: rateUnit,
        pricing_mode: pricingMode,
        calculated_total_price: calculatedTotalPrice || null,
        city_name: vals.city_name,
        locality_name: vals.locality_name,
        maintenance: vals.maintenance ? parseFloat(vals.maintenance) : null,
        negotiable,
        rera_number: vals.rera_number,
        property_tax_id: vals.property_tax_id,
        ownership_role: vals.ownership_role || 'Owner',
        super_area: vals.super_area ? parseFloat(vals.super_area) : null,
        balcony_size: vals.balcony_size,
        bedroom_size: vals.bedroom_size,
        parking_indoor: vals.parking_indoor ? parseInt(vals.parking_indoor, 10) : 0,
        parking_outdoor: vals.parking_outdoor ? parseInt(vals.parking_outdoor, 10) : 0,
        plot_unit: vals.plot_unit,
        length_ft: vals.length_ft,
        width_ft: vals.width_ft,
        road_width: vals.road_width,
        corner_plot: vals.corner_plot,
        approval_authority: vals.approval_authority,
        boundary_wall: vals.boundary_wall,
        soil_type: vals.soil_type,
        water_source: vals.water_source,
        electricity_supply: vals.electricity_supply,
        road_access: vals.road_access,
        cultivation_type: vals.cultivation_type,
        cabins: vals.cabins,
        workstations: vals.workstations,
        conference_rooms: vals.conference_rooms,
        washrooms_count: vals.washrooms_count,
        building_grade: vals.building_grade,
        power_backup_kva: vals.power_backup_kva,
        frontage_ft: vals.frontage_ft,
        road_facing: vals.road_facing,
        commercial_zone: vals.commercial_zone,
        ceiling_height_ft: vals.ceiling_height_ft,
        loading_docks: vals.loading_docks,
        truck_access: vals.truck_access,
        storage_type: vals.storage_type,
        fire_noc: vals.fire_noc,
        total_rooms: vals.total_rooms,
        total_beds: vals.total_beds,
        available_beds: vals.available_beds,
        occupancy_types: vals.occupancy_types,
        gender_preference: vals.gender_preference,
        food_availability: vals.food_availability,
        ac_type: vals.ac_type,
        gate_closing_time: vals.gate_closing_time,
        total_units: vals.total_units,
        total_towers: vals.total_towers,
        project_configurations: vals.project_configurations,
        launch_date: vals.launch_date,
        possession_year: vals.possession_year,
        custom_attributes: vals.custom_attributes || {},
        source_urls: vals.source_urls ? vals.source_urls.split(',').map((s) => s.trim()).filter(Boolean) : [],
        media_items: mediaItems
          .filter((m) => !m.uploading)
          .map(({ id, url, type, isCover, order, bucket, path }) => ({ id, url, type, isCover, order, bucket, path })),
      },
    };
  };

  const handleSaveDraft = async (isAutoSave = false) => {
    if (isSubmittedRef.current) return;
    const vals = getValues();

    // For auto-save, require at least meaningful user content before creating a new DB record
    const hasMeaningfulContent = Boolean(
      (vals.title && vals.title.trim().length > 3) ||
      (vals.address && vals.address.trim().length > 3) ||
      (vals.locality_name && vals.locality_name.trim().length > 2) ||
      (vals.price && Number(vals.price) > 0) ||
      (vals.rent_amount && Number(vals.rent_amount) > 0)
    );

    if (isAutoSave && !draftId && !hasMeaningfulContent) {
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      localStorage.setItem(`realtynow_draft_${user?.id || 'guest'}`, JSON.stringify(payload));

      const { savePropertyDraft } = await import('../../lib/properties');
      const data = await savePropertyDraft(draftId, payload, submissionId);
      const activeId = draftId || data?.id || null;
      if (!draftId && data?.id) {
        setDraftId(data.id);
        window.history.replaceState({}, '', `?draft_id=${data.id}`);
      }

      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });
      if (!isAutoSave) {
        toast.addToast('success', 'Draft saved! You can resume this listing anytime.');
        setSavedDraftInfo({
          id: activeId || 'DRAFT',
          title: vals.title || 'Untitled Listing',
        });
        setShowDraftSavedModal(true);
      }
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      if (!isAutoSave) {
        toast.addToast('error', `Failed to save draft: ${err?.message || 'Please try again'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Autosave debouncer
  useEffect(() => {
    if (isRestoring || isSubmittedRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (!isSubmittedRef.current) {
        handleSaveDraft(true);
      }
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    JSON.stringify(watch()),
    activeStep,
    bedrooms,
    bathrooms,
    balconies,
    furnishing,
    selectedAmenities,
    mediaItems,
    negotiable,
  ]);

  // Submit Final Listing (Only executed upon explicit user confirmation)
  const onSubmit = async () => {
    if (!validateCurrentStep(activeStep)) return;

    isSubmittedRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    setSaving(true);
    try {
      if (user?.id) {
        await ensureUserProfile(user.id);
      }
      const payload = {
        ...buildPayload(),
        status: 'submitted' as const,
        approval_status: 'Pending' as const,
        is_draft: false,
        is_live: false,
      };

      let finalId = draftId;

      if (draftId) {
        const { error } = await supabase.from('properties').update(payload).eq('id', draftId);
        if (error) throw error;
        triggerAiVerification(draftId);
        triggerPropertySeoGeneration(draftId);
      } else {
        const { data: inserted, error } = await supabase.from('properties').insert(payload).select('id').single();
        if (error) throw error;
        finalId = inserted?.id || null;
        if (inserted?.id) {
          triggerAiVerification(inserted.id);
          triggerPropertySeoGeneration(inserted.id);
        }
      }

      try {
        localStorage.removeItem(`realtynow_draft_${user?.id || 'guest'}`);
      } catch {
        /* Ignore storage cleanup errors */
      }

      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      queryClient.invalidateQueries({ queryKey: ['agent-properties'] });

      setSubmittedPropertyId(finalId || 'RN-2026-SUBMITTED');
      setShowSuccessModal(true);
    } catch (err: any) {
      isSubmittedRef.current = false;
      toast.addToast('error', err?.message || 'Submission failed. Please check required fields.');
    } finally {
      setSaving(false);
    }
  };

  const formData = watch();
  const progressPercentage = Math.round(((activeStep + 1) / 3) * 100);

  if (!quotaChecked) {
    return (
      <DashboardLayout sections={wizardSections} title="List Property">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!listPropertyLoading && !listPropertyActive) {
    return <ServiceUnavailable serviceName="List Property Service" />;
  }

  if (quotaExceeded && !draftIdParam) {
    return (
      <DashboardLayout sections={wizardSections} title="List Property">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-lg mx-auto p-6 bg-white rounded-3xl border border-navy-100 shadow-sm">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <Shield className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-2">
            {quotaInfo?.isFree ? 'Free Listing Limit Reached' : 'Property Listing Limit Reached'}
          </h2>
          <p className="text-navy-600 mb-6 text-sm">
            {quotaInfo?.isFree
              ? `You have reached the free limit of ${quotaInfo.limit || FREE_PLAN_LIMIT} active listings. Upgrade your subscription plan to list more properties with premium visibility.`
              : `You have reached your ${quotaInfo?.planName || ''} limit of ${quotaInfo?.limit || 5} listings (${quotaInfo?.used || 0} active). Upgrade your plan to expand your listing quota.`}
          </p>
          <Button onClick={() => navigate('/portal/subscription')} variant="primary">
            View Subscription Plans
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const content = (
    <div className="relative z-10 mx-auto max-w-5xl space-y-6 pb-20 mt-2">
      {/* ─── SUCCESS MODAL ─── */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-navy-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full text-center shadow-2xl border border-navy-100 relative overflow-hidden"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-5 shadow-inner">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Submission Successful
              </span>
              <h2 className="text-2xl font-display font-bold text-navy-900 mt-3 mb-2">
                Property Submitted for Review!
              </h2>
              <p className="text-xs text-navy-500 mb-5 leading-relaxed">
                Your listing has been sent to the admin team for quality verification. Once approved, it will go live on RealtyNow.
              </p>

              <div className="bg-navy-50 rounded-2xl p-4 mb-4 border border-navy-100 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Property Reference ID:</span>
                  <span className="font-bold text-navy-900 font-mono">
                    RN-{new Date().getFullYear()}-{submittedPropertyId?.slice(0, 6).toUpperCase() || 'NEW'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Approval Status:</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Pending Quality Review
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/70 rounded-2xl p-3.5 mb-6 text-left">
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong className="font-semibold">Where will it show up?</strong> Your listing is saved in{' '}
                  <span className="font-bold">My Properties → Pending</span>. As soon as our admin team verifies the property details, it will instantly go live across the public search and portal.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate(profile?.role === 'agent' ? '/agent/my-properties?tab=pending' : '/portal/my-properties?tab=pending');
                  }}
                >
                  View in My Properties
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = profile?.role === 'agent' ? '/agent/list-property' : '/portal/list-property';
                  }}
                >
                  List Another
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DRAFT SAVED MODAL ─── */}
      <AnimatePresence>
        {showDraftSavedModal && (
          <div className="fixed inset-0 bg-navy-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full text-center shadow-2xl border border-navy-100 relative overflow-hidden"
            >
              <div className="h-20 w-20 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-5 shadow-inner">
                <Save className="h-10 w-10" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Saved as Draft
              </span>
              <h2 className="text-2xl font-display font-bold text-navy-900 mt-3 mb-2">
                Draft Saved Successfully!
              </h2>
              <p className="text-xs text-navy-500 mb-5 leading-relaxed">
                Your listing is safely saved as a draft. It has <strong>not</strong> been submitted to the admin team and is not public.
              </p>

              <div className="bg-navy-50 rounded-2xl p-4 mb-4 border border-navy-100 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Draft Reference:</span>
                  <span className="font-bold text-navy-900 font-mono">
                    RN-{new Date().getFullYear()}-{(savedDraftInfo?.id || draftId)?.slice(0, 6).toUpperCase() || 'DRAFT'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Status:</span>
                  <span className="font-bold text-blue-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Draft (Private)
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 mb-6 text-left">
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  <strong className="font-semibold">What's next?</strong> You can find this draft in{' '}
                  <span className="font-bold text-navy-900">My Properties → Drafts</span>. You can continue editing or explicitly submit it for admin approval whenever you are ready.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  onClick={() => {
                    setShowDraftSavedModal(false);
                    navigate(profile?.role === 'agent' ? '/agent/properties?tab=draft' : '/portal/my-properties?tab=draft');
                  }}
                >
                  View in My Properties
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white"
                  onClick={() => {
                    setShowDraftSavedModal(false);
                    setShowConfirmSubmitModal(true);
                  }}
                >
                  Submit for Review Now
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CONFIRM EXPLICIT SUBMIT MODAL ─── */}
      <AnimatePresence>
        {showConfirmSubmitModal && (
          <div className="fixed inset-0 bg-navy-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full text-center shadow-2xl border border-navy-100 relative overflow-hidden"
            >
              <div className="h-20 w-20 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-5 shadow-inner">
                <Shield className="h-10 w-10 text-amber-600" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                Explicit Submission Confirmation
              </span>
              <h2 className="text-2xl font-display font-bold text-navy-900 mt-3 mb-2">
                Submit Property for Approval?
              </h2>
              <p className="text-xs text-navy-500 mb-5 leading-relaxed">
                You are about to send this property listing to our admin verification team. Once approved, it will be published live on RealtyNow.
              </p>

              <div className="bg-navy-50 rounded-2xl p-4 mb-5 border border-navy-100 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Title:</span>
                  <span className="font-bold text-navy-900 truncate max-w-[200px]">
                    {watch('title') || 'Untitled Property'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Location:</span>
                  <span className="font-bold text-navy-900 truncate max-w-[200px]">
                    {[watch('locality_name'), watch('city_name')].filter(Boolean).join(', ') || 'Hyderabad'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Price:</span>
                  <span className="font-bold text-red-600">
                    {watch('purpose') === 'Rent'
                      ? `₹ ${Number(watch('rent_amount') || 0).toLocaleString('en-IN')}/mo`
                      : formatPrice(Number(watch('price') || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-navy-400 font-medium">Photos:</span>
                  <span className="font-bold text-navy-900">{mediaItems.filter(m => !m.uploading).length} photos attached</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl font-bold"
                  disabled={saving}
                  onClick={() => setShowConfirmSubmitModal(false)}
                >
                  Cancel / Keep Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white"
                  disabled={saving}
                  onClick={async () => {
                    setShowConfirmSubmitModal(false);
                    await onSubmit();
                  }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Confirm & Submit
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TOP 3-STEP PROGRESS STEPPER ─── */}
      <div className="bg-white/95 backdrop-blur-2xl p-5 md:p-6 rounded-[28px] border border-navy-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white font-display font-bold text-lg flex items-center justify-center shadow-md shadow-red-500/20">
              {activeStep + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  Step {activeStep + 1} of 3
                </span>
                <span className="text-xs text-navy-400 font-medium">Universal 3-Step Flow</span>
              </div>
              <h2 className="text-xl font-display font-bold text-navy-900 leading-tight">
                {UNIVERSAL_STEPS[activeStep].label}
              </h2>
            </div>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-navy-50 rounded-2xl border border-navy-100/80">
            {UNIVERSAL_STEPS.map((s, idx) => {
              const isCurrent = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if (idx < activeStep || validateCurrentStep(activeStep)) {
                      setActiveStep(idx);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                    isCurrent
                      ? 'bg-white text-red-600 shadow-sm'
                      : isPast
                        ? 'text-emerald-700 hover:text-emerald-800'
                        : 'text-navy-400 hover:text-navy-600'
                  )}
                >
                  <span
                    className={cn(
                      'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold',
                      isCurrent
                        ? 'bg-red-600 text-white'
                        : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-navy-200 text-navy-600'
                    )}
                  >
                    {isPast ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-navy-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-emerald-500"
            initial={{ width: '33%' }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ─── MAIN FORM CONTAINER ─── */}
      <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] border border-navy-100 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
        <FormProvider {...methods}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
          >
            <div className="p-6 md:p-10 min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="max-w-4xl mx-auto space-y-8"
                >
                  {/* ========================================================================= */}
                  {/* ────────────────── STEP 1: PROPERTY BASICS ────────────────────────────── */}
                  {/* ========================================================================= */}
                  {activeStep === 0 && (
                    <div className="space-y-8">
                      {/* 1. Purpose Selector */}
                      <div>
                        <SectionTitle
                          title="1. Listing Purpose"
                          sub="Choose whether you want to sell, rent, or lease this property."
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                          {PURPOSE_OPTIONS.map((option) => {
                            const isSelected = watch('purpose') === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setValue('purpose', option.id as any, { shouldDirty: true })}
                                className={cn(
                                  'flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all text-center group cursor-pointer',
                                  isSelected
                                    ? 'border-red-500 bg-red-50/50 shadow-sm ring-2 ring-red-500/20'
                                    : 'border-navy-100 bg-white hover:border-red-200 hover:bg-navy-50/40'
                                )}
                              >
                                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                  {option.icon.endsWith('.png') ? (
                                    <img src={option.icon} alt={option.label} className="h-7 w-7 object-contain inline" />
                                  ) : (
                                    option.icon
                                  )}
                                </span>
                                <span className={cn('text-xs font-bold', isSelected ? 'text-red-600' : 'text-navy-800')}>
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Property Type Tabs */}
                      <div>
                        <SectionTitle
                          title="2. Property Type & Category"
                          sub="Select your property type and specific category."
                        />
                        <div className="flex items-center gap-2 p-1.5 bg-navy-50 rounded-2xl border border-navy-100 max-w-lg mt-3">
                          {(['Residential', 'Commercial', 'Plot', 'Project'] as MainPropertyType[]).map((type) => {
                            const isSelected = selectedMainType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSelectMainType(type)}
                                className={cn(
                                  'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center',
                                  isSelected
                                    ? 'bg-navy-900 text-white shadow-sm'
                                    : 'text-navy-600 hover:text-navy-900 hover:bg-navy-100/50'
                                )}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>

                        {/* Category Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                          {getCategoriesByMainType(selectedMainType).map((cat) => {
                            const isSelected = selectedCategoryDef.id === cat.id;
                            const IconComponent = cat.icon;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleSelectCategory(cat)}
                                className={cn(
                                  'flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all text-left group cursor-pointer relative',
                                  isSelected
                                    ? 'border-red-500 bg-red-50/40 shadow-sm ring-2 ring-red-500/10'
                                    : 'border-navy-100 bg-white hover:border-red-200 hover:bg-navy-50/30'
                                )}
                              >
                                <div
                                  className={cn(
                                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                                    isSelected
                                      ? 'bg-red-600 text-white'
                                      : 'bg-navy-50 text-navy-700 group-hover:bg-red-50 group-hover:text-red-600'
                                  )}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className={cn('text-xs font-bold truncate', isSelected ? 'text-red-600' : 'text-navy-900')}>
                                    {cat.name}
                                  </h4>
                                  <p className="text-[10px] text-navy-400 line-clamp-1 mt-0.5">{cat.description}</p>
                                </div>
                                {isSelected && (
                                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Title & Basic Info */}
                      <div className="p-5 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-4">
                        <div>
                          <FieldLabel>Property Title *</FieldLabel>
                          <InputField
                            {...register('title')}
                            id="wizard-field-title"
                            placeholder={`e.g. ${selectedCategoryDef.defaultTitleTemplate
                              .replace('{bhk}', '3')
                              .replace('{locality}', 'Banjara Hills')
                              .replace('{city}', 'Hyderabad')
                              .replace('{plot_area}', '200')
                              .replace('{carpet_area}', '1500')}`}
                            className={fieldError === 'title' ? 'border-red-500 ring-2 ring-red-200' : ''}
                          />
                          <p className="text-[11px] text-navy-400 mt-1">
                            A clear, descriptive title helps your property stand out in search results.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel>Your Role</FieldLabel>
                            <SelectField {...register('ownership_role')}>
                              <option value="Owner">Owner (Individual / Family)</option>
                              <option value="Agent">Real Estate Agent / Broker</option>
                              <option value="Builder">Builder / Developer</option>
                              <option value="Power of Attorney">Power of Attorney Holder</option>
                            </SelectField>
                          </div>
                          <div>
                            <FieldLabel>Ownership Type</FieldLabel>
                            <SelectField {...register('ownership_type')}>
                              <option value="Freehold">Freehold</option>
                              <option value="Leasehold">Leasehold</option>
                              <option value="Co-operative Society">Co-operative Society</option>
                              <option value="Power of Attorney">Power of Attorney</option>
                            </SelectField>
                          </div>
                        </div>
                      </div>

                      {/* 4. Location Search & Details */}
                      <div className="space-y-4">
                        <SectionTitle
                          title="3. Location & Address"
                          sub="Pinpoint your property location on Google Maps for maximum buyer reach."
                        />
                        <LocationAutocomplete
                          onSelect={handlePlaceSelected}
                          initialAddress={watch('address')}
                          initialLat={watch('latitude') ? parseFloat(watch('latitude') as string) : undefined}
                          initialLng={watch('longitude') ? parseFloat(watch('longitude') as string) : undefined}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel>City *</FieldLabel>
                            <InputField
                              {...register('city_name')}
                              id="wizard-field-city_name"
                              placeholder="e.g. Hyderabad"
                              className={fieldError === 'city_name' ? 'border-red-500 ring-2 ring-red-200' : ''}
                            />
                          </div>
                          <div>
                            <FieldLabel>Locality / Area *</FieldLabel>
                            <InputField
                              {...register('locality_name')}
                              id="wizard-field-locality_name"
                              placeholder="e.g. Gachibowli / Madhapur"
                              className={fieldError === 'locality_name' ? 'border-red-500 ring-2 ring-red-200' : ''}
                            />
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Full Address / Landmark *</FieldLabel>
                          <TextAreaField
                            {...register('address')}
                            id="wizard-field-address"
                            placeholder="Door / Flat No., Tower Name, Street, Landmark..."
                            rows={2}
                            className={fieldError === 'address' ? 'border-red-500 ring-2 ring-red-200' : ''}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <FieldLabel>State</FieldLabel>
                            <InputField {...register('state_name')} placeholder="e.g. Telangana" />
                          </div>
                          <div>
                            <FieldLabel>Postal Code</FieldLabel>
                            <InputField {...register('pincode')} placeholder="e.g. 500032" />
                          </div>
                          <div>
                            <FieldLabel>Latitude</FieldLabel>
                            <InputField {...register('latitude')} readOnly className="bg-navy-50/70 text-navy-400 text-xs" />
                          </div>
                          <div>
                            <FieldLabel>Longitude</FieldLabel>
                            <InputField {...register('longitude')} readOnly className="bg-navy-50/70 text-navy-400 text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* ────────────────── STEP 2: DETAILS & MEDIA ────────────────────────────── */}
                  {/* ========================================================================= */}
                  {activeStep === 1 && (
                    <div className="space-y-8">
                      {/* SECTION 1: Pricing */}
                      <div className="p-6 rounded-[24px] bg-gradient-to-br from-red-50/40 via-white to-rose-50/30 border border-red-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <SectionTitle
                            title="1. Pricing & Commercials"
                            sub={watch('purpose') === 'Sale' ? 'Set the asking price for sale' : 'Set monthly rent & deposit details'}
                          />
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                            {watch('purpose')}
                          </span>
                        </div>

                        {/* ─── AREA-BASED PRICING CALCULATOR (Commercial, Plot, & Multi-Category) ─── */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-red-200/90 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-100/70 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                                <Calculator className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                                  Area-Based Price Calculator
                                </h4>
                                <p className="text-[11px] text-navy-500">
                                  Set price per Sq.Ft or Sq.Yd to calculate the final asking price automatically.
                                </p>
                              </div>
                            </div>

                            {/* Unit Selector Pills */}
                            <div className="inline-flex items-center bg-navy-50 p-1 rounded-xl border border-navy-150 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('Sq.Ft')}
                                className={cn(
                                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                  rateUnit === 'Sq.Ft'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-navy-600 hover:text-navy-900'
                                )}
                              >
                                ₹ / Sq.Ft
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnitToggle('Sq.Yd')}
                                className={cn(
                                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                                  rateUnit === 'Sq.Yd'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-navy-600 hover:text-navy-900'
                                )}
                              >
                                ₹ / Sq.Yd
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Rate Input */}
                            <div>
                              <FieldLabel>
                                Price Rate (₹ per {rateUnit}) *
                              </FieldLabel>
                              <div className="relative flex items-center bg-white border border-navy-150 rounded-xl overflow-hidden shadow-xs focus-within:border-red-400 transition-all">
                                <span className="pl-4 pr-2 text-sm font-bold text-navy-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={ratePerUnit}
                                  onChange={(e) => handleRateChange(e.target.value)}
                                  placeholder={rateUnit === 'Sq.Ft' ? 'e.g. 6500' : 'e.g. 58500'}
                                  className="flex-1 bg-transparent px-2 py-2.5 text-sm font-bold text-navy-900 focus:outline-none placeholder:text-navy-300"
                                />
                                <span className="pr-3 text-xs font-bold text-navy-500 bg-navy-50/80 py-1.5 px-2.5 rounded-lg mr-1.5 border border-navy-100">
                                  / {rateUnit}
                                </span>
                              </div>
                              {numRate > 0 && (
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-500 mt-1.5">
                                  <span>⇄</span>
                                  <span>
                                    Equivalent: <strong className="text-navy-800">₹{rateUnit === 'Sq.Ft' ? (numRate * 9).toLocaleString('en-IN') : Math.round(numRate / 9).toLocaleString('en-IN')}</strong> / {rateUnit === 'Sq.Ft' ? 'Sq.Yd' : 'Sq.Ft'}
                                  </span>
                                  <span className="text-[10px] text-navy-400">(1 Sq.Yd = 9 Sq.Ft)</span>
                                </div>
                              )}
                            </div>

                            {/* Property Area Input */}
                            <div>
                              <FieldLabel>
                                {isPlot ? 'Plot / Land Area' : 'Carpet Area'} ({rateUnit}) *
                              </FieldLabel>
                              <div className="relative flex items-center bg-white border border-navy-150 rounded-xl overflow-hidden shadow-xs focus-within:border-red-400 transition-all">
                                <input
                                  type="number"
                                  min="0"
                                  value={isPlot ? (watch('plot_area') || '') : (watch('carpet_area') || '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (isPlot) {
                                      setValue('plot_area', val, { shouldDirty: true });
                                    } else {
                                      setValue('carpet_area', val, { shouldDirty: true });
                                    }
                                  }}
                                  placeholder={rateUnit === 'Sq.Ft' ? 'e.g. 1450' : 'e.g. 160'}
                                  className="flex-1 bg-transparent px-3 py-2.5 text-sm font-bold text-navy-900 focus:outline-none placeholder:text-navy-300"
                                />
                                <span className="pr-3 text-xs font-bold text-navy-500 bg-navy-50/80 py-1.5 px-2.5 rounded-lg mr-1.5 border border-navy-100">
                                  {rateUnit}
                                </span>
                              </div>
                              {effectiveAreaSqFt > 0 && (
                                <p className="text-[11px] font-semibold text-navy-500 mt-1.5">
                                  Area: <strong className="text-navy-800">{effectiveAreaSqFt.toLocaleString('en-IN')} Sq.Ft</strong> ({effectiveAreaSqYd.toFixed(1)} Sq.Yd)
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Live Computed Breakdown Banner */}
                          {effectiveAreaSqFt > 0 && numRate > 0 && (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-50/90 via-rose-50/70 to-amber-50/50 border border-red-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full inline-block">
                                  ✨ Auto-Calculated Final Price
                                </span>
                                <div className="text-xs text-navy-700 font-medium pt-1">
                                  {effectiveAreaSqFt.toLocaleString('en-IN')} Sq.Ft ({effectiveAreaSqYd.toFixed(1)} Sq.Yd) × ₹{rateUnit === 'Sq.Ft' ? numRate.toLocaleString('en-IN') : Math.round(numRate / 9).toLocaleString('en-IN')} / Sq.Ft
                                </div>
                              </div>
                              <div className="text-left sm:text-right">
                                <div className="text-lg font-black text-red-700 font-display">
                                  ₹ {calculatedTotalPrice.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[11px] font-bold text-navy-600">
                                  {formatPrice(calculatedTotalPrice)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {watch('purpose') === 'Sale' ? (
                            <div>
                              <FieldLabel>Asking Price (₹) *</FieldLabel>
                              <div
                                className={cn(
                                  'relative flex items-center bg-white border rounded-xl overflow-hidden shadow-sm focus-within:border-red-400 transition-all',
                                  fieldError === 'price' ? 'border-red-500 ring-2 ring-red-200' : 'border-navy-150'
                                )}
                              >
                                <span className="pl-4 pr-2 text-sm font-bold text-navy-400">₹</span>
                                <input
                                  {...register('price')}
                                  id="wizard-field-price"
                                  type="number"
                                  onChange={handleManualPriceChange}
                                  placeholder="e.g. 12500000"
                                  className="flex-1 bg-transparent px-2 py-3 text-base font-bold text-navy-900 focus:outline-none placeholder:text-navy-300"
                                />
                              </div>
                              {watch('price') && Number(watch('price')) > 0 && (
                                <p className="text-xs font-bold text-red-600 mt-1">
                                  {formatPrice(Number(watch('price')))}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <FieldLabel>Monthly Rent (₹) *</FieldLabel>
                              <div
                                className={cn(
                                  'relative flex items-center bg-white border rounded-xl overflow-hidden shadow-sm focus-within:border-red-400 transition-all',
                                  fieldError === 'rent_amount' ? 'border-red-500 ring-2 ring-red-200' : 'border-navy-150'
                                )}
                              >
                                <span className="pl-4 pr-2 text-sm font-bold text-navy-400">₹</span>
                                <input
                                  {...register('rent_amount')}
                                  id="wizard-field-rent_amount"
                                  type="number"
                                  placeholder="e.g. 35000"
                                  className="flex-1 bg-transparent px-2 py-3 text-base font-bold text-navy-900 focus:outline-none placeholder:text-navy-300"
                                />
                                <span className="pr-3 text-xs font-semibold text-navy-400">/ month</span>
                              </div>
                              {watch('rent_amount') && Number(watch('rent_amount')) > 0 && (
                                <p className="text-xs font-bold text-red-600 mt-1">
                                  ₹ {Number(watch('rent_amount')).toLocaleString('en-IN')} per month
                                </p>
                              )}
                            </div>
                          )}

                          <div>
                            <FieldLabel>Security Deposit (₹)</FieldLabel>
                            <InputField {...register('security_deposit')} type="number" placeholder="e.g. 70000" />
                          </div>

                          <div>
                            <FieldLabel>Maintenance (₹/month)</FieldLabel>
                            <InputField {...register('maintenance')} type="number" placeholder="e.g. 3000" />
                          </div>

                          <div>
                            <FieldLabel>Brokerage Policy</FieldLabel>
                            <SelectField {...register('brokerage')}>
                              <option value="No Brokerage">No Brokerage (Direct Listing)</option>
                              <option value="15 Days Rent">15 Days Rent</option>
                              <option value="1 Month Rent">1 Month Rent</option>
                              <option value="1% Commission">1% Commission</option>
                              <option value="Custom Negotiable">Custom / Negotiable</option>
                            </SelectField>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-100">
                          <button
                            type="button"
                            onClick={() => setNegotiable((v) => !v)}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              negotiable ? 'bg-red-600' : 'bg-navy-200'
                            )}
                          >
                            <motion.span
                              animate={{ x: negotiable ? 20 : 2 }}
                              className="inline-block h-4 w-4 bg-white rounded-full shadow-md"
                            />
                          </button>
                          <span className="text-xs font-bold text-navy-800">Price is Negotiable</span>
                        </div>
                      </div>

                      {/* SECTION 2: Dynamic Category Specifications */}
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <SectionTitle
                            title={`2. ${selectedCategoryDef.name} Specifications`}
                            sub="Configure size, areas, layout and specific property attributes."
                          />
                          <span className="text-xs font-semibold text-navy-500 bg-navy-100 px-2.5 py-1 rounded-lg">
                            {selectedCategoryDef.emoji} {selectedCategoryDef.name}
                          </span>
                        </div>

                        {/* Room Counters (Residential) */}
                        {selectedCategoryDef.showBhk && (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Bedrooms', icon: '🛏️', value: bedrooms, set: setBedrooms, min: 1, max: 12 },
                              { label: 'Bathrooms', icon: '🚿', value: bathrooms, set: setBathrooms, min: 1, max: 12 },
                              { label: 'Balconies', icon: '🌿', value: balconies, set: setBalconies, min: 0, max: 10 },
                            ].map((room) => (
                              <div
                                key={room.label}
                                className="bg-navy-50/50 border border-navy-150 rounded-2xl p-3.5 flex flex-col items-center gap-2 text-center"
                              >
                                <span className="text-xl">{room.icon}</span>
                                <span className="text-[10px] font-bold text-navy-500 uppercase tracking-wider">
                                  {room.label}
                                </span>
                                <div className="flex items-center gap-2 bg-white rounded-xl px-1.5 py-1 w-full justify-between border border-navy-100 shadow-sm">
                                  <button
                                    type="button"
                                    onClick={() => room.set((v) => Math.max(room.min, v - 1))}
                                    disabled={room.value <= room.min}
                                    className="h-7 w-7 bg-navy-50 rounded-lg font-bold hover:text-red-600 transition-all flex items-center justify-center text-sm disabled:opacity-30"
                                  >
                                    −
                                  </button>
                                  <span className="font-display font-bold text-sm text-navy-900">{room.value}</span>
                                  <button
                                    type="button"
                                    onClick={() => room.set((v) => Math.min(room.max, v + 1))}
                                    disabled={room.value >= room.max}
                                    className="h-7 w-7 bg-navy-50 rounded-lg font-bold hover:text-red-600 transition-all flex items-center justify-center text-sm disabled:opacity-30"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Area Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {selectedCategoryDef.showCarpetArea && (
                            <div>
                              <FieldLabel>Carpet Area (Sq.Ft) *</FieldLabel>
                              <InputField
                                {...register('carpet_area')}
                                id="wizard-field-carpet_area"
                                type="number"
                                placeholder="e.g. 1450"
                                className={fieldError === 'carpet_area' ? 'border-red-500 ring-2 ring-red-200' : ''}
                              />
                              {numRate > 0 && calculatedTotalPrice > 0 && (
                                <p className="text-[11px] font-bold text-red-600 mt-1">
                                  ✨ Asking Price: {formatPrice(calculatedTotalPrice)} (@ ₹{rateSqFt.toLocaleString('en-IN')}/Sq.Ft)
                                </p>
                              )}
                            </div>
                          )}
                          {selectedCategoryDef.showBuiltUpArea && (
                            <div>
                              <FieldLabel>Built-Up Area (Sq.Ft)</FieldLabel>
                              <InputField {...register('built_up_area')} type="number" placeholder="e.g. 1750" />
                            </div>
                          )}
                          {selectedCategoryDef.showPlotArea && (
                            <div>
                              <FieldLabel>Plot / Land Area *</FieldLabel>
                              <div className="flex gap-2">
                                <InputField
                                  {...register('plot_area')}
                                  id="wizard-field-plot_area"
                                  type="number"
                                  placeholder="e.g. 240"
                                  className={cn('flex-1', fieldError === 'plot_area' ? 'border-red-500 ring-2 ring-red-200' : '')}
                                />
                                <select
                                  {...register('plot_unit')}
                                  className="w-28 bg-navy-50 border border-navy-150 rounded-xl px-2 text-xs font-bold text-navy-800"
                                >
                                  <option value="Sq. Yd">Sq. Yd</option>
                                  <option value="Sq. Ft">Sq. Ft</option>
                                  <option value="Acre">Acre</option>
                                  <option value="Gunta">Gunta</option>
                                </select>
                              </div>
                              {numRate > 0 && calculatedTotalPrice > 0 && (
                                <p className="text-[11px] font-bold text-red-600 mt-1">
                                  ✨ Asking Price: {formatPrice(calculatedTotalPrice)} (@ ₹{rateSqYd.toLocaleString('en-IN')}/Sq.Yd)
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Layout & Specifications (Floors, Facing, Furnishing, Parking) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {selectedCategoryDef.showFloorNumber && (
                            <div>
                              <FieldLabel>Floor Number</FieldLabel>
                              <InputField {...register('floor_number')} type="number" placeholder="e.g. 5" />
                            </div>
                          )}
                          {selectedCategoryDef.showTotalFloors && (
                            <div>
                              <FieldLabel>Total Floors</FieldLabel>
                              <InputField {...register('total_floors')} type="number" placeholder="e.g. 15" />
                            </div>
                          )}
                          {selectedCategoryDef.showFacing && (
                            <div>
                              <FieldLabel>Facing Direction</FieldLabel>
                              <SelectField {...register('facing')}>
                                <option value="">Select Facing</option>
                                {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map(
                                  (f) => (
                                    <option key={f} value={f}>
                                      {f}
                                    </option>
                                  )
                                )}
                              </SelectField>
                            </div>
                          )}
                          {selectedCategoryDef.showAgeOfProperty && (
                            <div>
                              <FieldLabel>Property Age</FieldLabel>
                              <SelectField {...register('age_of_property')}>
                                <option value="">Select Age</option>
                                <option value="0-1 Years">0-1 Years (Brand New)</option>
                                <option value="1-5 Years">1-5 Years</option>
                                <option value="5-10 Years">5-10 Years</option>
                                <option value="10+ Years">10+ Years</option>
                              </SelectField>
                            </div>
                          )}
                        </div>

                        {/* Furnishing Chips */}
                        {selectedCategoryDef.showFurnishing && (
                          <div>
                            <FieldLabel>Furnishing Status</FieldLabel>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                { id: 'Fully Furnished', label: 'Fully Furnished', icon: '🛋️' },
                                { id: 'Semi-Furnished', label: 'Semi-Furnished', icon: '🪑' },
                                { id: 'Unfurnished', label: 'Unfurnished', icon: '🧱' },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => setFurnishing(f.id)}
                                  className={cn(
                                    'py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                                    furnishing === f.id
                                      ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500/10'
                                      : 'border-navy-150 bg-white text-navy-700 hover:border-navy-300'
                                  )}
                                >
                                  <span>{f.icon}</span>
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Category-Specific Custom Dynamic Fields */}
                        {selectedCategoryDef.customFields.length > 0 && (
                          <div className="p-4 rounded-2xl bg-navy-50/40 border border-navy-100 space-y-4">
                            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                              <span>⚙️</span> Specific {selectedCategoryDef.name} Attributes
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {selectedCategoryDef.customFields.map((field) => (
                                <div key={field.id}>
                                  <FieldLabel>{field.label}</FieldLabel>
                                  {field.type === 'select' ? (
                                    <SelectField {...register(field.id as any)}>
                                      <option value="">Select option</option>
                                      {field.options?.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </SelectField>
                                  ) : (
                                    <InputField
                                      {...register(field.id as any)}
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      placeholder={field.placeholder}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SECTION 3: Amenities */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <SectionTitle
                            title="3. Amenities & Features"
                            sub="Select features available with this property to attract verified buyers."
                          />
                          <span className="text-xs font-bold text-navy-500">
                            {selectedAmenities.length} selected
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {AMENITIES_LIST.map((a) => {
                            const isSelected = selectedAmenities.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => toggleAmenity(a.id)}
                                className={cn(
                                  'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer',
                                  isSelected
                                    ? 'border-red-500 bg-red-50/60 text-red-900 font-bold ring-1 ring-red-500/20'
                                    : 'border-navy-100 bg-white text-navy-700 hover:border-navy-200'
                                )}
                              >
                                <span className="text-lg shrink-0">{a.icon}</span>
                                <span className="text-xs truncate">{a.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SECTION 4: Media Upload */}
                      <div className="space-y-4">
                        <SectionTitle
                          title="4. Property Photos & Media"
                          sub="Upload high quality photos (at least 1 photo required). Drag to reorder photos."
                        />

                        {/* Dropzone */}
                        <div
                          id="wizard-field-media-dropzone"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleMediaFiles(Array.from(e.dataTransfer.files));
                          }}
                          className={cn(
                            'border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-navy-50/40 hover:bg-navy-50/70',
                            fieldError === 'media-dropzone' ? 'border-red-500 bg-red-50/30' : 'border-navy-200'
                          )}
                        >
                          <Camera className="h-8 w-8 text-navy-400 mx-auto mb-2" />
                          <p className="text-sm font-bold text-navy-800 mb-1">Drag & drop photos or Choose Files</p>
                          <p className="text-xs text-navy-400 mb-4">
                            Images: Max 5MB each (JPG, PNG, WEBP). Up to {MAX_MEDIA_FILES} files ({mediaItems.length}/{MAX_MEDIA_FILES} added)
                          </p>
                          <label className="cursor-pointer inline-flex items-center gap-2 bg-navy-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-navy-800 transition-all shadow-md">
                            <Camera className="h-4 w-4" /> Browse Photos
                            <input
                              type="file"
                              multiple
                              accept={ACCEPTED_MEDIA_TYPES.join(',')}
                              className="hidden"
                              onChange={(e) => {
                                handleMediaFiles(Array.from(e.target.files || []));
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>

                        {/* Cover Image URL / Direct Upload Box */}
                        <div className="p-4 rounded-2xl bg-navy-50/50 border border-navy-100 flex flex-col sm:flex-row items-center gap-4">
                          <div className="flex-1 w-full space-y-2">
                            <FieldLabel>Or Paste Image URL</FieldLabel>
                            <div className="flex gap-2">
                              <InputField
                                value={mediaUrlInput}
                                onChange={(e) => {
                                  setMediaUrlInput(e.target.value);
                                  if (mediaUrlError) setMediaUrlError(null);
                                }}
                                placeholder="https://..."
                                className="flex-1"
                              />
                              <button
                                type="button"
                                onClick={addMediaUrl}
                                className="px-4 py-2 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail Grid */}
                        {mediaItems.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {mediaItems.map((item, i) => (
                              <div
                                key={item.id}
                                draggable={!item.uploading}
                                onDragStart={() => setDragIndex(i)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (dragIndex !== null) reorderMedia(dragIndex, i);
                                  setDragIndex(null);
                                }}
                                className="group relative aspect-square rounded-2xl overflow-hidden bg-navy-100 shadow-sm border border-navy-200"
                              >
                                <img src={item.url} alt="" className="h-full w-full object-cover" />
                                {item.uploading && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                  </div>
                                )}
                                {item.isCover && (
                                  <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                    <Star className="h-2.5 w-2.5 fill-current" /> Cover
                                  </span>
                                )}
                                {!item.uploading && (
                                  <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {!item.isCover && (
                                      <button
                                        type="button"
                                        onClick={() => setCoverMedia(item.id)}
                                        title="Set as Cover"
                                        className="h-7 w-7 rounded-full bg-white text-navy-800 flex items-center justify-center hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Star className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeMedia(item)}
                                      title="Delete"
                                      className="h-7 w-7 rounded-full bg-white text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECTION 5: Optional Collapsible Advanced Details & Documents */}
                      <div className="border border-navy-100 rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowAdvanced((v) => !v)}
                          className="w-full flex items-center justify-between p-4 bg-navy-50/50 hover:bg-navy-50 transition-colors text-left"
                        >
                          <span className="text-xs font-bold text-navy-800 uppercase tracking-wider flex items-center gap-2">
                            <span>📋</span> Advanced Details, Description & Documents (Optional)
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-navy-500 transition-transform', showAdvanced && 'rotate-180')} />
                        </button>

                        {showAdvanced && (
                          <div className="p-5 space-y-4 border-t border-navy-100 bg-white">
                            <div>
                              <FieldLabel>About Property Description</FieldLabel>
                              <TextAreaField
                                {...register('description')}
                                placeholder="Highlight prime features, connectivity, layout and USP..."
                                rows={3}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <FieldLabel>RERA Registration Number</FieldLabel>
                                <InputField {...register('rera_number')} placeholder="e.g. P51800047XXX" />
                              </div>
                              <div>
                                <FieldLabel>Property Tax ID / Khata No.</FieldLabel>
                                <InputField {...register('property_tax_id')} placeholder="e.g. HYD-2026-TAX-01" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <FieldLabel>Video / Virtual Tour URL</FieldLabel>
                                <InputField {...register('media_urls.virtual_tour')} placeholder="https://youtube.com/..." />
                              </div>
                              <div>
                                <FieldLabel>Floor Plan Link</FieldLabel>
                                <InputField {...register('media_urls.floor_plan')} placeholder="https://..." />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* ────────────────── STEP 3: REVIEW & PUBLISH ───────────────────────────── */}
                  {/* ========================================================================= */}
                  {activeStep === 2 && (
                    <div className="space-y-6">
                      <SectionTitle
                        title="Review Your Listing Summary"
                        sub="Verify all property basics, details, and media before final submission for review."
                      />

                      {/* Summary Card */}
                      <div className="bg-white rounded-[28px] border border-navy-150 shadow-md overflow-hidden">
                        {/* Cover Image & Quick Hero */}
                        <div className="relative h-48 sm:h-64 bg-navy-900 overflow-hidden">
                          {mediaItems.length > 0 ? (
                            <img
                              src={coverImageUrl || mediaItems[0]?.url}
                              alt="Cover"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-navy-400">
                              <Home className="h-12 w-12 mb-2 opacity-40" />
                              <span className="text-xs">No cover image uploaded</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-black/30" />

                          <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase">
                              {formData.purpose || 'Sale'}
                            </span>
                            <span className="bg-white/90 backdrop-blur-md text-navy-900 text-xs font-bold px-3 py-1 rounded-full shadow-md">
                              {formData.category || selectedCategoryDef.name}
                            </span>
                          </div>

                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <h3 className="text-xl md:text-2xl font-display font-bold leading-tight">
                              {formData.title || 'Untitled Property'}
                            </h3>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[formData.locality_name, formData.city_name].filter(Boolean).join(', ') || 'Location Pending'}
                            </p>
                          </div>
                        </div>

                        {/* Specs & Pricing Details */}
                        <div className="p-6 space-y-6">
                          {/* Price Display */}
                          <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
                            <div>
                              <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">
                                {formData.purpose === 'Rent' ? 'Monthly Rent' : 'Asking Price'}
                              </span>
                              <div className="text-2xl font-display font-bold text-red-600">
                                {formData.purpose === 'Rent'
                                  ? `₹ ${Number(formData.rent_amount || 0).toLocaleString('en-IN')} / mo`
                                  : formatPrice(Number(formData.price || 0))}
                              </div>
                            </div>
                            {formData.security_deposit && (
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-navy-500 uppercase tracking-widest">
                                  Deposit
                                </span>
                                <div className="text-sm font-bold text-navy-900">
                                  ₹ {Number(formData.security_deposit).toLocaleString('en-IN')}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Specs Matrix */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {selectedCategoryDef.showBhk && (
                              <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                                <span className="text-navy-400 font-medium block">Configuration</span>
                                <span className="font-bold text-navy-900">{bedrooms} BHK</span>
                              </div>
                            )}
                            {(formData.carpet_area || formData.built_up_area || formData.plot_area) && (
                              <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                                <span className="text-navy-400 font-medium block">Area</span>
                                <span className="font-bold text-navy-900">
                                  {formData.carpet_area
                                    ? `${formData.carpet_area} Sq.Ft`
                                    : formData.plot_area
                                      ? `${formData.plot_area} ${formData.plot_unit || 'Sq.Yd'}`
                                      : `${formData.built_up_area} Sq.Ft`}
                                </span>
                              </div>
                            )}
                            {furnishing && (
                              <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                                <span className="text-navy-400 font-medium block">Furnishing</span>
                                <span className="font-bold text-navy-900">{furnishing}</span>
                              </div>
                            )}
                            {formData.facing && (
                              <div className="p-3 bg-navy-50 rounded-xl border border-navy-100">
                                <span className="text-navy-400 font-medium block">Facing</span>
                                <span className="font-bold text-navy-900">{formData.facing} Facing</span>
                              </div>
                            )}
                          </div>

                          {/* Photo Gallery Preview */}
                          {mediaItems.length > 0 && (
                            <div>
                              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider block mb-2">
                                Uploaded Media ({mediaItems.length} photos)
                              </span>
                              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {mediaItems.map((m) => (
                                  <img
                                    key={m.id}
                                    src={m.url}
                                    alt=""
                                    className="h-16 w-20 rounded-xl object-cover border border-navy-200 shrink-0"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Amenities Tags */}
                          {selectedAmenities.length > 0 && (
                            <div>
                              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider block mb-2">
                                Selected Amenities
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedAmenities.map((a) => {
                                  const found = AMENITIES_LIST.find((x) => x.id === a);
                                  return (
                                    <span
                                      key={a}
                                      className="text-xs bg-navy-50 border border-navy-150 px-2.5 py-1 rounded-lg font-medium text-navy-700"
                                    >
                                      {found?.icon} {found?.label || a}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Quick Edit Shortcuts */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-navy-100">
                            <button
                              type="button"
                              onClick={() => setActiveStep(0)}
                              className="text-xs font-bold text-navy-600 hover:text-red-600 px-3 py-1.5 bg-navy-50 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Basics
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveStep(1)}
                              className="text-xs font-bold text-navy-600 hover:text-red-600 px-3 py-1.5 bg-navy-50 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Details & Media
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Approval Note */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
                        <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900 leading-relaxed">
                          <strong>Admin Approval Workflow:</strong> Submitting will send this property for verification. Once approved by our team, it will be published live with search indexing.
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ─── STICKY BOTTOM BAR ─── */}
            <div className="bg-white/95 backdrop-blur-2xl border-t border-navy-100 px-6 py-4 flex items-center justify-between gap-3 rounded-b-[32px]">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={activeStep === 0}
                className="rounded-xl h-11 px-4 text-xs font-bold"
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveDraft(false)}
                  disabled={saving}
                  className="h-11 px-4 rounded-xl border border-navy-200 bg-white text-navy-700 hover:bg-navy-50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Draft
                </button>

                {activeStep < 2 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="h-11 px-6 rounded-xl text-xs font-bold"
                  >
                    Continue to {UNIVERSAL_STEPS[activeStep + 1].label} <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saving}
                    onClick={() => {
                      if (!validateCurrentStep(activeStep)) return;
                      setShowConfirmSubmitModal(true);
                    }}
                    className="h-11 px-7 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                    Submit Property for Review
                  </Button>
                )}
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );

  if (disableLayout) {
    return content;
  }

  return (
    <DashboardLayout sections={wizardSections} title="List Property">
      {content}
    </DashboardLayout>
  );
}
export default ListPropertyWizard;
