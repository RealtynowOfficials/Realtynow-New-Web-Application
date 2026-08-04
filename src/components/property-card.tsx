import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bed, MapPin, Heart, Star, GitCompare, Share2, ShieldCheck } from 'lucide-react';
import type { Property } from '../lib/types';
import { formatCompactPrice, cn , generatePropertyUrl} from '../lib/utils';
import { Badge } from './ui';
import { isCompared, toggleCompareProperty } from '../lib/compare';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import { useLanguageContext } from '../lib/i18n/language-context';

// Lightweight, localStorage-backed favorites — mirrors the pattern used by
// lib/compare.ts but kept local to this component (no new data-layer files).
const FAVORITES_KEY = 'realtynow_favorite_ids';
function readFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeFavoriteIds(ids: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function PropertyCard({ property, compact }: { property: Property; compact?: boolean }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguageContext();
  const [compared, setCompared] = useState(() => isCompared(property.id));
  const [favorited, setFavorited] = useState(() => readFavoriteIds().includes(property.id));
  const img = property.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg';
  // RERA data isn't present on the Property model / v_properties_search view — badge stays hidden until it is.
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

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = readFavoriteIds();
    const isNowFavorited = !ids.includes(property.id);
    const updated = isNowFavorited ? [...ids, property.id] : ids.filter((id) => id !== property.id);
    writeFavoriteIds(updated);
    setFavorited(isNowFavorited);
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${generatePropertyUrl(property)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      addToast('success', t('notifications.linkCopied', 'Link copied to clipboard'));
    } catch {
      /* user cancelled share sheet — no-op */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card transition-shadow duration-300 hover:shadow-cardHover"
    >
      <Link to={generatePropertyUrl(property)} className="flex h-full flex-col">
        <div className="relative aspect-video overflow-hidden bg-navy-100">
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
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
                <ShieldCheck className="h-3 w-3" /> {t('common:aiVerified', 'AI Verified')}
              </span>
            )}
          </div>
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
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
            <button
              onClick={handleFavoriteClick}
              title={
                favorited
                  ? t('common.removeFromFavorites', 'Remove from favorites')
                  : t('common.addToFavorites', 'Add to favorites')
              }
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full backdrop-blur shadow-sm transition hover:scale-110',
                favorited ? 'bg-white text-error-500' : 'bg-white/90 text-navy-600 hover:bg-white',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', favorited && 'fill-error-500')} />
            </button>
            <button
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
          <p className="font-display text-base font-extrabold text-navy-900">
            {formatCompactPrice(property.price)}
            {property.purpose === 'Rent' && (
              <span className="text-xs font-medium text-navy-500">/{t('property.monthShort', 'mo')}</span>
            )}
          </p>
          <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-navy-800 group-hover:text-navy-900">
            {property.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-navy-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-navy-400" />
            <span className="line-clamp-1">
              {property.locality_name ? `${property.locality_name}, ` : ''}
              {property.city_name ?? 'India'}
            </span>
          </p>
          {property.bedrooms != null && (
            <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-600">
              <Bed className="h-3 w-3 text-navy-400" /> {property.bedrooms} {t('common:bhk', 'BHK')}
            </span>
          )}
        </div>
      </Link>
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
