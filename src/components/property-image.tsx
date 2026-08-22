import { cn } from '../lib/utils';
import { DEFAULT_PROPERTY_IMAGE, handleImageError } from '../lib/property-images';

/**
 * Drop-in <img> replacement for property card/carousel thumbnails.
 * Always fills its parent container and crops via object-cover, so any
 * uploaded image (portrait, landscape, ultra-wide, etc.) is centered and
 * cropped to fit rather than distorting or changing the card's height.
 * The parent element must supply its own fixed size (aspect-ratio, h-full,
 * or a fixed height) plus `overflow-hidden` — this component only owns the
 * fill/crop/fallback behavior, not layout.
 */
export function PropertyImage({
  src,
  alt,
  className,
  onError,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string | null; alt: string }) {
  return (
    <img
      {...rest}
      src={src || DEFAULT_PROPERTY_IMAGE}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      onError={(e) => {
        onError?.(e);
        handleImageError(e, DEFAULT_PROPERTY_IMAGE);
      }}
      className={cn('h-full w-full object-cover object-center', className)}
    />
  );
}
