import React from 'react';
import { getPropertyPricingDisplay } from '../../lib/plot-pricing';
import { formatPrice, getPropertyPrice } from '../../lib/utils';
import { isPropertyPublishable } from '../../lib/price-validation';

interface PropertyPriceCellProps {
  property: any;
  showInvalidWarning?: boolean;
  className?: string;
  showLandTotal?: boolean; // Default false as per product specification
}

export function PropertyPriceCell({
  property,
  showInvalidWarning = true,
  className = '',
  showLandTotal = false,
}: PropertyPriceCellProps) {
  if (!property) return <span className="text-slate-400 text-xs">—</span>;

  const pricing = getPropertyPricingDisplay(property);
  const isPublishable = isPropertyPublishable(property);

  // 1. Land / Plot Pricing (Show Rate / Unit cleanly, e.g. ₹16,000 / Sq. Yd)
  if (pricing.isLand && pricing.primaryPriceNumeric) {
    const formattedRate = `₹${new Intl.NumberFormat('en-IN').format(pricing.primaryPriceNumeric)}`;
    const rawUnit = pricing.unitLabel || 'Sq. Yd';
    const unitText = rawUnit.startsWith('/') ? rawUnit : `/ ${rawUnit}`;

    return (
      <div className={`min-w-[140px] whitespace-nowrap space-y-0.5 ${className}`}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
            {formattedRate}
          </span>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {unitText}
          </span>
        </div>
        {/* Only show total if explicitly requested for specific admin analytics */}
        {showLandTotal && pricing.totalEstimatedPrice && (
          <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Total: <span className="font-bold text-slate-800">{pricing.totalEstimatedPrice}</span>
          </div>
        )}
        {showInvalidWarning && property.status !== 'draft' && !isPublishable && (
          <span className="block text-[11px] font-bold text-red-600">⚠ Invalid Price</span>
        )}
      </div>
    );
  }

  // 2. Standard Constructed / Commercial / Rental Property Pricing
  const numericPrice = getPropertyPrice(property);
  const formattedFullPrice =
    numericPrice != null
      ? formatPrice(numericPrice, property.purpose)
      : pricing.primaryPrice;

  let mainPrice = formattedFullPrice;
  let unitSuffix = '';

  if (formattedFullPrice && formattedFullPrice.includes('/')) {
    const parts = formattedFullPrice.split('/');
    mainPrice = parts[0].trim();
    unitSuffix = '/' + parts.slice(1).join('/');
  }

  // Calculate rate per sqft & sqyd for commercial/residential listings
  const areaSqFt = Number(property.carpet_area || property.built_up_area || property.super_area || property.plot_area || 0);
  const ratePerSqFt = property.price_per_sqft || property.features?.price_per_sqft || (numericPrice && areaSqFt > 0 ? Math.round(numericPrice / areaSqFt) : null);
  const ratePerSqYd = property.features?.price_per_sqyd || (ratePerSqFt ? Math.round(ratePerSqFt * 9) : null);

  return (
    <div className={`min-w-[140px] whitespace-nowrap space-y-0.5 ${className}`}>
      <div className="flex items-baseline gap-1">
        <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
          {mainPrice}
        </span>
        {unitSuffix && (
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
            {unitSuffix}
          </span>
        )}
      </div>
      {areaSqFt > 0 && ratePerSqFt && (
        <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
          <span>{areaSqFt.toLocaleString('en-IN')} Sq.Ft</span>
          <span>•</span>
          <span className="text-slate-700 font-bold">₹{ratePerSqFt.toLocaleString('en-IN')}/Sq.Ft</span>
          {ratePerSqYd && (
            <span className="text-slate-400 hidden xl:inline">
              (₹{ratePerSqYd.toLocaleString('en-IN')}/Sq.Yd)
            </span>
          )}
        </div>
      )}
      {showInvalidWarning && property.status !== 'draft' && !isPublishable && (
        <span className="block text-[11px] font-bold text-red-600">⚠ Invalid Price</span>
      )}
    </div>
  );
}
