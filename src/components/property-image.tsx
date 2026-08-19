import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { DEFAULT_PROPERTY_IMAGE, handleImageError } from '../lib/property-images';

interface PropertyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  containerClassName?: string;
}

export function PropertyImage({
  src,
  alt,
  className,
  fallbackSrc = DEFAULT_PROPERTY_IMAGE,
  containerClassName,
  loading = 'lazy',
  ...props
}: PropertyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-slate-100', containerClassName)}>
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}
      <img
        src={src || fallbackSrc}
        alt={alt || 'Property'}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true);
          handleImageError(e, fallbackSrc);
        }}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}
