import { X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanDetailsModalProps {
  plan: any | null;
  isOpen: boolean;
  onClose: () => void;
  billingCycle: 'monthly' | 'yearly';
}

export function PlanDetailsModal({ plan, isOpen, onClose, billingCycle }: PlanDetailsModalProps) {
  if (!plan) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-navy-100"
          >
            <div className="relative p-6 sm:p-8 bg-gradient-to-b from-navy-50/50 to-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-navy-400 hover:text-navy-900 bg-white hover:bg-navy-50 rounded-full transition-colors shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-navy-900 mb-2">{plan.name}</h2>
                <div className="flex items-baseline justify-center text-navy-900">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {plan.price_monthly === 0 ? 'Free' : `₹${billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly}`}
                  </span>
                  <span className="ml-1 text-lg font-medium text-navy-500">
                    /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-navy-900">Plan includes:</h4>
                <ul className="space-y-3">
                  {(plan.features_json as string[] | null)?.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success-500" />
                      <span className="text-sm text-navy-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-navy-50 text-center text-sm text-navy-500">
                Cancel or switch plans anytime. Prices are subject to applicable taxes.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
