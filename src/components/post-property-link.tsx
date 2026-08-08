import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { checkListingLimit, type ListingUsage } from '../lib/listing-limits';
import { ListingLimitModal } from './listing-limit-modal';
import { Loader2 } from 'lucide-react';

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  className?: string;
  children: React.ReactNode;
}

export function PostPropertyLink({ to, className, children, ...props }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<ListingUsage | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (loading) return;
    
    // If not logged in, just navigate. The portal itself handles auth redirect.
    if (!user) {
      navigate(to);
      return;
    }

    // Bypass check if we are navigating to an edit route (draft_id or edit)
    if (to.includes('draft_id=') || to.includes('edit=')) {
      navigate(to);
      return;
    }

    setLoading(true);
    try {
      const usageStatus = await checkListingLimit(user.id);
      if (!usageStatus.canList) {
        setUsage(usageStatus);
        setShowModal(true);
      } else {
        navigate(to);
      }
    } catch (err) {
      console.error('Failed to check listing limits:', err);
      // Fallback: let them through, backend will enforce
      navigate(to);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <a
        href={to}
        onClick={handleClick}
        className={`${className || ''} ${loading ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`}
        {...props}
      >
        {children}
      </a>
      <ListingLimitModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        usage={usage}
      />
    </>
  );
}
