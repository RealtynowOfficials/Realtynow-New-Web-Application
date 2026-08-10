import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ListingUsage } from '../lib/listing-limits';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usage: ListingUsage | null;
}

export function ListingLimitModal({ isOpen, onClose, usage }: Props) {
  const navigate = useNavigate();

  if (!usage) return null;

  // Portaled straight to <body> — dashboard pages wrap their content in a
  // motion.div (DashboardLayout) that keeps a non-"none" transform applied at
  // rest, which per the CSS spec makes it the containing block for any
  // position:fixed descendant. Without the portal this modal centers inside
  // that (sidebar-offset) content box instead of the real viewport, making it
  // look shifted toward the right edge of the page instead of truly centered.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
            className="fixed left-1/2 top-1/2 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Listing Limit Reached
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600">
                  You've used your {usage.limit} free property listings for this month.
                </p>
                <p className="text-gray-600 mt-2">
                  Upgrade your plan to list more properties and unlock additional listing benefits.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-500 font-medium">Current Plan</span>
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{usage.planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Monthly Listings</span>
                  <span className="text-sm font-semibold text-red-600">
                    {usage.used} / {usage.limit} Used
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/portal/subscription');
                  }}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  Upgrade Now
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/portal/my-properties');
                  }}
                  className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors"
                >
                  Manage Properties
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
