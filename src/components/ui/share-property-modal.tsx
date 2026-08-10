import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Download, Share2, MapPin, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { logPropertyShare, SharePlatform } from '../../lib/shares';
import { QRShareCard } from './qr-share-card';

// Custom icons for platforms (using simple SVG paths for zero dependencies)
const Icons = {
  WhatsApp: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>,
  Facebook: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>,
  Twitter: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>,
  LinkedIn: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>,
  Email: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
  Instagram: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
  Telegram: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  SMS: () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
};

export interface SharePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    title: string;
    price: number | string;
    location: string;
    purpose: string;
    description?: string;
    imageUrl?: string;
    slug?: string;
  };
}

export function SharePropertyModal({ isOpen, onClose, property }: SharePropertyModalProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Base URL for the property
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://realtynow.in';
  const propertyUrl = `${baseUrl}/property/${property.slug || property.id}`;

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Core Share Actions --- //

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      setCopied(true);
      toast.addToast('success', 'Link copied to clipboard!');
      logPropertyShare(property.id, 'Copy Link');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.addToast('error', 'Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property on RealtyNow: ${property.title}`,
          url: propertyUrl,
        });
        logPropertyShare(property.id, 'Native Share');
        onClose();
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleDownloadCard = async () => {
    if (!qrRef.current || downloading) return;
    try {
      setDownloading(true);
      toast.addToast('info', 'Generating high-quality share card...');
      
      const dataUrl = await toPng(qrRef.current, { 
        quality: 1, 
        pixelRatio: 2, // High resolution
        skipFonts: false
      });
      
      const link = document.createElement('a');
      link.download = `realtynow-${property.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.addToast('success', 'Share card downloaded successfully!');
      logPropertyShare(property.id, 'Share Card');
    } catch (err) {
      console.error(err);
      toast.addToast('error', 'Failed to generate share card.');
    } finally {
      setDownloading(false);
    }
  };

  // --- Social Platform Actions --- //

  const shareText = `🏡 Check out this property on RealtyNow\n\n${property.title}\nPrice: ${typeof property.price === 'number' ? formatPrice(property.price) : property.price}\nLocation: ${property.location}\n\nView Property:\n${propertyUrl}`;

  const handlePlatformShare = (platform: SharePlatform) => {
    let url = '';
    
    switch (platform) {
      case 'WhatsApp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case 'Facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`;
        break;
      case 'X':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this property on RealtyNow!')}&url=${encodeURIComponent(propertyUrl)}`;
        break;
      case 'LinkedIn':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(propertyUrl)}`;
        break;
      case 'Telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(propertyUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'Email':
        url = `mailto:?subject=${encodeURIComponent(`Check out this Property on RealtyNow: ${property.title}`)}&body=${encodeURIComponent(shareText)}`;
        break;
      case 'SMS':
        url = `sms:?&body=${encodeURIComponent(shareText)}`;
        break;
      case 'Instagram':
        toast.addToast('info', 'Instagram does not allow direct URL sharing. The link has been copied for you.');
        handleCopyLink();
        return; // Don't open window
      default:
        return;
    }

    logPropertyShare(property.id, platform);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const platforms: { name: SharePlatform; icon: React.FC; color: string; bg: string }[] = [
    { name: 'WhatsApp', icon: Icons.WhatsApp, color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100' },
    { name: 'Facebook', icon: Icons.Facebook, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
    { name: 'Instagram', icon: Icons.Instagram, color: 'text-pink-600', bg: 'bg-pink-50 hover:bg-pink-100' },
    { name: 'Telegram', icon: Icons.Telegram, color: 'text-sky-500', bg: 'bg-sky-50 hover:bg-sky-100' },
    { name: 'X', icon: Icons.Twitter, color: 'text-neutral-800', bg: 'bg-neutral-100 hover:bg-neutral-200' },
    { name: 'LinkedIn', icon: Icons.LinkedIn, color: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100' },
    { name: 'Email', icon: Icons.Email, color: 'text-red-500', bg: 'bg-red-50 hover:bg-red-100' },
    { name: 'SMS', icon: Icons.SMS, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100' },
  ];

  // Portaled to <body> — this modal is opened from inside the property-detail
  // hero's absolutely-positioned, z-indexed action bar, which establishes its
  // own stacking context. A z-50 inside that context can't out-rank sibling
  // page sections with their own stacking contexts (e.g. the sticky identity
  // bar), which is why the popup could render behind other hero content.
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-navy-900/50 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        {/* Center Modal Wrapper */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="inline-block w-full max-w-xl text-left align-middle transition-all transform bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border border-white/20 ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-navy-50">
            <div>
              <h3 className="text-xl font-bold text-navy-900">Share Property</h3>
              <p className="text-sm text-navy-500 mt-1">Share this property with anyone using your preferred platform.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            
            {/* Property Preview Card */}
            <div className="flex gap-4 p-4 rounded-2xl bg-navy-50/50 border border-navy-100 mb-6">
              {property.imageUrl ? (
                <img src={property.imageUrl} alt={property.title} className="w-24 h-24 object-cover rounded-xl shadow-sm" />
              ) : (
                <div className="w-24 h-24 bg-navy-100 rounded-xl flex items-center justify-center text-navy-400">
                  <MapPin className="w-8 h-8 opacity-50" />
                </div>
              )}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded">
                    {property.purpose}
                  </span>
                  <span className="text-xs text-navy-400 truncate">ID: {property.id.split('-')[0]}</span>
                </div>
                <h4 className="font-bold text-navy-900 truncate">{property.title}</h4>
                <p className="text-sm text-navy-500 truncate mb-1">{property.location}</p>
                <p className="font-bold text-red-600">
                  {typeof property.price === 'number' ? formatPrice(property.price) : property.price}
                </p>
              </div>
            </div>

            {/* Social Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {platforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformShare(platform.name)}
                  className="flex flex-col items-center gap-2 group outline-none"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95 ${platform.bg} ${platform.color}`}>
                    <platform.icon />
                  </div>
                  <span className="text-xs font-medium text-navy-600">{platform.name}</span>
                </button>
              ))}
            </div>

            {/* Quick Actions (Copy & Download) */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  readOnly 
                  value={propertyUrl}
                  className="w-full pl-4 pr-24 py-3 bg-navy-50 border border-navy-100 rounded-xl text-sm text-navy-600 outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="absolute right-1 top-1 bottom-1 px-4 bg-white shadow-sm border border-navy-100 rounded-lg text-sm font-bold text-navy-800 flex items-center gap-2 hover:bg-navy-50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-navy-500" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <button
                onClick={handleDownloadCard}
                disabled={downloading}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm shadow-red-200 transition-colors flex items-center justify-center disabled:opacity-50"
                title="Download QR Share Card"
              >
                <Download className={`w-5 h-5 ${downloading ? 'animate-bounce' : ''}`} />
              </button>
              
              {/* Native Web Share Fallback */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="px-4 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center"
                  title="More options"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>

          </div>
        </motion.div>
      </div>

      {/* Hidden QR Share Card Render Target */}
      <QRShareCard ref={qrRef} property={property} propertyUrl={propertyUrl} />
    </AnimatePresence>,
    document.body,
  );
}
