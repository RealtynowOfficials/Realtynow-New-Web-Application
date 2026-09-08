import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bed, Bath, Car, Maximize2, MapPin, Heart, Star, GitCompare, Share2, ShieldCheck, Sparkles, ArrowRight, Eye, Waves, Dumbbell, Trees, Camera, Flame, Wifi, Layers, Building2, Droplets, CheckCircle2 } from 'lucide-react';
import type { Property } from '../lib/types';
import { formatNumber, cn, generatePropertyUrl, buildWhatsAppUrl } from '../lib/utils';
import { Badge } from './ui';
import { isCompared, toggleCompareProperty } from '../lib/compare';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import { useLanguageContext } from '../lib/i18n/language-context';
import { SharePropertyModal } from './share-property-modal';
import { supabase } from '../lib/supabase';

import { useQueryClient } from '@tanstack/react-query';
import { useFavorites, toggleFavoriteProperty, getLocalFavoriteIds } from '../lib/favorites';
import { getPropertyCoverImage } from '../lib/property-images';
import { PropertyImage } from './property-image';
import { getPropertyPricingDisplay } from '../lib/plot-pricing';
import { formatPropertyLocation } from '../lib/location-formatter';
import { getAmenityDisplayItem } from '../lib/amenities';

function getAmenityLucideIcon(token: string) {
  const l = (token || '').toLowerCase();
  if (l.includes('pool') || l.includes('swim')) return <Waves className="h-3 w-3 text-cyan-600 shrink-0" />;
  if (l.includes('gym') || l.includes('fitness')) return <Dumbbell className="h-3 w-3 text-amber-600 shrink-0" />;
  if (l.includes('security') || l.includes('guard')) return <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />;
  if (l.includes('parking') || l.includes('car')) return <Car className="h-3 w-3 text-blue-600 shrink-0" />;
  if (l.includes('garden') || l.includes('park') || l.includes('tree') || l.includes('plantation')) return <Trees className="h-3 w-3 text-emerald-600 shrink-0" />;
  if (l.includes('power') || l.includes('backup') || l.includes('generator') || l.includes('electricity') || l.includes('solar')) return <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />;
  if (l.includes('lift') || l.includes('elevator')) return <Layers className="h-3 w-3 text-indigo-600 shrink-0" />;
  if (l.includes('club')) return <Building2 className="h-3 w-3 text-purple-600 shrink-0" />;
  if (l.includes('camera') || l.includes('cctv')) return <Camera className="h-3 w-3 text-slate-600 shrink-0" />;
  if (l.includes('play') || l.includes('kid') || l.includes('child')) return <Sparkles className="h-3 w-3 text-rose-500 shrink-0" />;
  if (l.includes('water') || l.includes('drainage') || l.includes('borewell') || l.includes('rain')) return <Droplets className="h-3 w-3 text-sky-600 shrink-0" />;
  if (l.includes('wifi') || l.includes('internet')) return <Wifi className="h-3 w-3 text-teal-600 shrink-0" />;
  if (l.includes('gas')) return <Flame className="h-3 w-3 text-orange-500 shrink-0" />;
  return <CheckCircle2 className="h-3 w-3 text-slate-500 shrink-0" />;
}

export function PropertyCard({ property, compact, isAiRecommended = false }: { property: Property; compact?: boolean, isAiRecommended?: boolean }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguageContext();
  const [compared, setCompared] = useState(() => isCompared(property.id));
  const queryClient = useQueryClient();
  const { data: favoriteIds } = useFavorites(user?.id);
  const favorited = favoriteIds ? favoriteIds.includes(property.id) : false;
  
  // Sync logic for unauthenticated users since the hook relies on events
  const [localFavorited, setLocalFavorited] = useState(() => getLocalFavoriteIds().includes(property.id));

  const [showShareModal, setShowShareModal] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
      const handleSyncFavorites = () => setLocalFavorited(getLocalFavoriteIds().includes(property.id));
      window.addEventListener('realtynow-favorites-updated', handleSyncFavorites);
      return () => window.removeEventListener('realtynow-favorites-updated', handleSyncFavorites);
    }
  }, [property.id, user]);
  
  const isCurrentlyFavorited = user ? favorited : localFavorited;
  const img = getPropertyCoverImage(property);
  const reraNumber = (property as { rera_number?: string | null }).rera_number ?? null;

  useEffect(() => {
    const handleSync = () => setCompared(isCompared(property.id));
    window.addEventListener('realtynow-compare-updated', handleSync);
    return () => window.removeEventListener('realtynow-compare-updated', handleSync);
  }, [property.id]);

  const handleCompareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const isNowCompared = await toggleCompareProperty(property.id, user?.id);
      setCompared(isNowCompared);
      addToast(
        'success',
        isNowCompared
          ? t('notifications.addedToCompare', 'Added to compare list')
          : t('notifications.removedFromCompare', 'Removed from compare list'),
      );
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : t('notifications.errorCompare', 'Could not update compare list'),
      );
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    await toggleFavoriteProperty(property.id, user?.id, isCurrentlyFavorited);
    
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const agentId = property.assigned_agent_id || (property as any).owner_id;
    if (!agentId) {
      addToast('error', 'WhatsApp is currently unavailable for this property');
      return;
    }

    try {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('phone, phone_number, whatsapp_number')
        .eq('id', agentId)
        .maybeSingle();

      const targetPhone = agentProfile?.whatsapp_number || agentProfile?.phone_number || agentProfile?.phone;
      if (!targetPhone) {
        addToast('error', 'WhatsApp is currently unavailable for this agent.');
        return;
      }

      const waUrl = buildWhatsAppUrl(targetPhone, property.title);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch {
      addToast('error', 'WhatsApp is currently unavailable for this agent.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-cardHover"
    >
      <div className="flex h-full flex-col">
        <Link to={generatePropertyUrl(property)} className="block">
          <div className="relative aspect-video overflow-hidden bg-navy-100">
            <PropertyImage
              src={img}
              alt={property.title}
              className="transition-transform duration-500 ease-out group-hover:scale-110"
            />
            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              {reraNumber && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-navy-700 shadow-sm backdrop-blur">
                  <ShieldCheck className="h-3 w-3 text-success-600" /> RERA
                </span>
              )}
              {property.verification_status === 'AI Verified' && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm"
                  title={t('common:aiVerifiedTitle', 'Verified by RealtyNow AI')}
                >
                  <ShieldCheck className="h-3 w-3" /> {t('common.aiVerified', 'AI Verified')}
                </span>
              )}
            </div>
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCompareClick}
                title={
                  compared
                    ? t('common.removeFromCompare', 'Remove from compare')
                    : t('common.addToCompare', 'Add to compare')
                }
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full backdrop-blur shadow-sm transition hover:scale-110 cursor-pointer',
                  compared ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white/90 text-navy-600 hover:bg-white',
                )}
              >
                <GitCompare className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFavoriteClick}
                title={
                  isCurrentlyFavorited
                    ? t('common.removeFromFavorites', 'Remove from favorites')
                    : t('common.addToFavorites', 'Add to favorites')
                }
                className={cn('grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110', isCurrentlyFavorited ? 'text-error-500' : 'text-navy-600 hover:text-navy-900')}
              >
                <Heart className={cn('h-3.5 w-3.5', isCurrentlyFavorited && 'fill-error-500')} />
              </button>
              <button
                type="button"
                onClick={handleShareClick}
                title={t('common.share', 'Share')}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-navy-600 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {property.possession_status && (
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-navy-950/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {property.possession_status}
              </span>
            )}
          </div>
          <div className={cn('flex flex-1 flex-col', compact ? 'p-3' : 'p-3.5')}>
            {isAiRecommended && (
              <div className="mb-2 flex items-center gap-1.5 w-fit rounded-full bg-gradient-to-r from-purple-50 to-fuchsia-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 border border-purple-100 shadow-sm" title={t('property.aiRecommendedTooltip', 'Recommended by our AI based on your search patterns and property quality')}>
                <Sparkles className="h-3 w-3 text-purple-500" /> {t('common.aiRecommended', 'AI Recommended')}
              </div>
            )}
            {(() => {
              const pricing = getPropertyPricingDisplay(property, { compactConstructed: true });
              const locationText = formatPropertyLocation(property);
              return (
                <>
                  <p className="font-display text-base font-extrabold text-navy-900 flex items-baseline gap-1.5 flex-wrap">
                    {pricing.primaryPrice}
                  </p>
                  <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-navy-800 group-hover:text-navy-900">
                    {property.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-navy-400" />
                    <span className="line-clamp-1" title={locationText}>
                      {locationText}
                    </span>
                  </p>
                  {/* Specs & View Count Row */}
                  <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {property.bedrooms != null && property.bedrooms > 0 ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-600">
                          <Bed className="h-3 w-3 text-navy-400" /> {property.bedrooms} {t('common.bhk', 'BHK')}
                        </span>
                      ) : pricing.areaDisplay ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold">
                          {pricing.areaDisplay}
                        </span>
                      ) : null}

                      {property.bathrooms != null && property.bathrooms > 0 && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <Bath className="h-3 w-3 text-slate-400" /> {property.bathrooms} Bath
                        </span>
                      )}

                      {property.built_up_area && property.bedrooms != null ? (
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <Maximize2 className="h-3 w-3 text-slate-400" /> {formatNumber(property.built_up_area)} sq.ft
                        </span>
                      ) : null}
                    </div>

                    {property.view_count != null && property.view_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 text-slate-700 px-2 py-0.5 text-[10px] font-bold tracking-tight" title={`${property.view_count} views received`}>
                        <Eye className="h-3 w-3 text-slate-500" /> {property.view_count} {t('property.views', 'views')}
                      </span>
                    )}
                  </div>

                  {/* Top Amenities Chips */}
                  {(() => {
                    const rawAmenities: string[] = (property.amenities || []).filter(Boolean);
                    const seen = new Set<string>();
                    const amenitiesList: { id: string; label: string; icon: string }[] = [];

                    for (const item of rawAmenities) {
                      const meta = getAmenityDisplayItem(item);
                      const labelStr = typeof meta?.label === 'string' ? meta.label : String(meta?.label || '');
                      if (labelStr.trim()) {
                        const key = labelStr.toLowerCase();
                        if (!seen.has(key)) {
                          seen.add(key);
                          amenitiesList.push({ ...meta, label: labelStr });
                        }
                      }
                    }

                    if (amenitiesList.length === 0) {
                      const isPlot = !!property.plot_area && !property.built_up_area;
                      const defaults = isPlot
                        ? ['Gated Layout', 'Clear Title', 'Water Connection']
                        : ['24/7 Security', 'Power Backup', 'Water Supply'];
                      defaults.forEach((d) => amenitiesList.push(getAmenityDisplayItem(d)));
                    }

                    const visibleAmenities = amenitiesList.slice(0, 3);
                    const remainingCount = Math.max(0, amenitiesList.length - 3);

                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {visibleAmenities.map((amenity, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                              title={amenity.label}
                            >
                              {getAmenityLucideIcon(amenity.id || amenity.label)}
                              <span className="truncate max-w-[85px]">{amenity.label}</span>
                            </span>
                          ))}
                        </div>
                        {remainingCount > 0 && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.2 shrink-0">
                            +{remainingCount}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </Link>

        {/* Floating Smooth Slide-Up View Details Button on Hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent rounded-b-2xl transform translate-y-5 opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 ease-out z-20">
          <Link
            to={generatePropertyUrl(property)}
            onClick={(e) => e.stopPropagation()}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 hover:shadow-lg hover:shadow-red-600/35 transition-all text-center flex items-center justify-center gap-1.5 group/btn active:scale-98"
          >
            <span>{t('common.viewDetails', 'View Details')}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/90 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <SharePropertyModal property={property} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </motion.div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
      <div className="skeleton aspect-video w-full" />
      <div className="p-3.5 space-y-2.5">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold'> = {
  draft: 'default',
  submitted: 'info',
  pending_verification: 'warning',
  approved: 'gold',
  published: 'success',
  rejected: 'error',
  archived: 'default',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguageContext();
  const statusLabel: Record<string, string> = {
    draft: t('dashboard.statusDraft', 'Draft'),
    submitted: t('dashboard.statusSubmitted', 'Submitted'),
    pending_verification: t('dashboard.statusPending', 'Pending Verification'),
    approved: t('dashboard.statusApproved', 'Approved'),
    published: t('dashboard.statusPublished', 'Published'),
    rejected: t('dashboard.statusRejected', 'Rejected'),
    archived: t('dashboard.statusArchived', 'Archived'),
  };

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#7e1113] text-white shadow-sm tracking-wide">
        {t('dashboard.statusRejected', 'Rejected')}
      </span>
    );
  }
  return <Badge variant={statusVariant[status] ?? 'default'}>{statusLabel[status] ?? status}</Badge>;
}

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(i <= Math.round(rating) ? 'fill-gold-400 text-gold-400' : 'text-navy-200')}
        />
      ))}
    </div>
  );
}

export function FavoriteToggle({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  const { t } = useLanguageContext();
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur shadow-sm transition hover:scale-110',
        active ? 'text-error-500' : 'text-navy-400',
        className,
      )}
      aria-label={
        active
          ? t('common.removeFromFavorites', 'Remove from favorites')
          : t('common.addToFavorites', 'Add to favorites')
      }
    >
      <Heart className={cn('h-4 w-4', active && 'fill-error-500')} />
    </button>
  );
}
