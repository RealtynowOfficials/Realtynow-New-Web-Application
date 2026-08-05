import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export interface QRShareCardProps {
  propertyUrl: string;
  property: {
    title: string;
    price: number | string;
    location: string;
    imageUrl?: string;
  };
}

/**
 * A visually appealing card designed specifically for exporting to PNG via html-to-image.
 * We render this off-screen with fixed dimensions to guarantee a high-quality export.
 */
export const QRShareCard = forwardRef<HTMLDivElement, QRShareCardProps>(({ propertyUrl, property }, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-[-9999px] left-[-9999px] flex flex-col bg-white overflow-hidden shadow-2xl"
      style={{
        width: '600px',
        height: '800px',
        borderRadius: '32px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Top Image Section (60% height) */}
      <div className="relative w-full h-[60%] bg-navy-50 overflow-hidden">
        {property.imageUrl ? (
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover"
            crossOrigin="anonymous" // Important for html-to-image CORS
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-navy-100 text-navy-400">
            No Image Available
          </div>
        )}
        
        {/* RealtyNow Branding Badge */}
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-navy-900 tracking-tight text-lg">RealtyNow</span>
        </div>
      </div>

      {/* Bottom Content Section (40% height) */}
      <div className="flex-1 p-8 flex items-center justify-between gap-6 bg-white">
        
        {/* Property Details */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-navy-900 leading-tight line-clamp-2 mb-4">
            {property.title}
          </h2>
          
          <div className="flex items-center gap-2 text-navy-600 text-lg mb-4">
            <MapPin className="w-6 h-6 text-red-500 flex-shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          <div className="mt-auto">
            <p className="text-sm font-semibold text-navy-500 uppercase tracking-wider mb-1">Asking Price</p>
            <p className="text-4xl font-black text-red-600">
              {typeof property.price === 'number' ? formatPrice(property.price) : property.price}
            </p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center bg-navy-50 p-6 rounded-2xl border border-navy-100 shadow-sm">
          <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
            <QRCodeSVG 
              value={propertyUrl} 
              size={120} 
              bgColor="#ffffff" 
              fgColor="#0f172a" 
              level="H"
            />
          </div>
          <p className="text-xs font-bold text-navy-600 uppercase tracking-widest text-center">
            Scan to View
          </p>
        </div>
      </div>
    </div>
  );
});

QRShareCard.displayName = 'QRShareCard';
