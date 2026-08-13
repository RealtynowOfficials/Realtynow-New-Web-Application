import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Mail,
  Send,
  MessageSquare,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Modal, Button } from './ui';
import { useToast } from './toast';
import { generatePropertyUrl } from '../lib/utils';
import type { Property } from '../lib/types';

interface SharePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Partial<Property> & { title: string; id?: string };
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const propertyPath = generatePropertyUrl(property);
  const fullUrl = `${window.location.origin}${propertyPath}`;
  const shareText = `Check out this property on RealtyNow: ${property.title}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      addToast('success', 'Property link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast('error', 'Failed to copy link');
    }
  };

  const sharePlatforms = [
    {
      name: 'WhatsApp',
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      icon: Send,
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`,
    },
    {
      name: 'LinkedIn',
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: Globe,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: 'Facebook',
      color: 'bg-blue-800 hover:bg-blue-900 text-white',
      icon: Globe,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'X (Twitter)',
      color: 'bg-slate-900 hover:bg-slate-950 text-white',
      icon: MessageSquare,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Gmail / Email',
      color: 'bg-red-600 hover:bg-red-700 text-white',
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent(`Property on RealtyNow: ${property.title}`)}&body=${encodeURIComponent(`${shareText}\n\nView details: ${fullUrl}`)}`,
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: fullUrl,
        });
        onClose();
      } catch {
        // User cancelled native share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Share Property" size="md">
      <div className="space-y-6 p-1">
        {/* Property Preview Header */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 truncate">{property.title}</h4>
            <p className="text-xs text-slate-500 truncate mt-0.5">{fullUrl}</p>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Media Action Buttons */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Share via Social Media</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sharePlatforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                className={`flex items-center justify-between p-3 rounded-2xl font-semibold text-xs transition-all shadow-xs ${platform.color}`}
              >
                <div className="flex items-center gap-2.5">
                  <platform.icon className="w-4 h-4 shrink-0" />
                  <span>Share on {platform.name}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ))}
          </div>
        </div>

        {/* Native Mobile Share Sheet Button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <div className="border-t border-slate-100 pt-4">
            <Button
              variant="secondary"
              className="w-full justify-center text-xs font-bold py-2.5 rounded-2xl"
              icon={<Share2 className="w-4 h-4" />}
              onClick={handleNativeShare}
            >
              Open Device Share Menu
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
