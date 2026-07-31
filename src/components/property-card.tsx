import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bed, Bath, Maximize, MapPin, Heart, Star, Eye, GitCompare } from 'lucide-react';
import type { Property } from '../lib/types';
import { formatCompactPrice, cn } from '../lib/utils';
import { Badge } from './ui';
import { isCompared, toggleCompareProperty } from '../lib/compare';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import { useLanguageContext } from '../lib/i18n/language-context';

export function PropertyCard({ property, compact }: { property: Property; compact?: boolean }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguageContext();
  const [compared, setCompared] = useState(() => isCompared(property.id));
  const img = property.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group card overflow-hidden hover:shadow-cardHover transition-shadow"
    >
      <Link to={`/property/${property.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-navy-100">
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex gap-1.5">
            {property.purpose === 'Rent' ? (
              <Badge variant="info">{t('common:forRent', 'For Rent')}</Badge>
            ) : (
              <Badge variant="gold">{t('common:forSale', 'For Sale')}</Badge>
            )}
            {property.is_featured && <Badge variant="success">{t('common:featured', 'Featured')}</Badge>}
            {property.is_luxury && <Badge variant="error">{t('common:luxury', 'Luxury')}</Badge>}
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <button
              onClick={handleCompareClick}
              title={
                compared
                  ? t('common:removeFromCompare', 'Remove from compare')
                  : t('common:addToCompare', 'Add to compare')
              }
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full backdrop-blur shadow-sm transition hover:scale-110',
                compared ? 'bg-navy-700 text-white' : 'bg-white/90 text-navy-600 hover:bg-white',
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1 rounded-full bg-navy-950/55 px-2 py-1 text-xs text-white backdrop-blur">
              <Eye className="h-3 w-3" /> {property.view_count}
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-lg font-bold text-navy-900">
              {formatCompactPrice(property.price)}
              {property.purpose === 'Rent' && (
                <span className="text-xs font-medium text-navy-500">/{t('property.monthShort', 'mo')}</span>
              )}
            </p>
            <span className="text-xs text-navy-400">{property.property_type_name}</span>
          </div>
          <h3 className="mt-1 line-clamp-1 font-semibold text-navy-800 group-hover:text-navy-900">{property.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
            <MapPin className="h-3.5 w-3.5" />
            {property.locality_name ? `${property.locality_name}, ` : ''}
            {property.city_name ?? 'India'}
          </p>
          {!compact && (
            <div className="mt-3 flex items-center gap-4 border-t border-navy-100 pt-3 text-sm text-navy-600">
              {property.bedrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bed className="h-4 w-4 text-navy-400" /> {property.bedrooms} {t('common:bhk', 'BHK')}
                </span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4 text-navy-400" /> {property.bathrooms}
                </span>
              )}
              {property.built_up_area != null && (
                <span className="flex items-center gap-1.5">
                  <Maximize className="h-4 w-4 text-navy-400" /> {property.built_up_area} {t('common:sqft', 'sqft')}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-10 w-full" />
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
