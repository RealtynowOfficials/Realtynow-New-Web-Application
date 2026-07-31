import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { differenceInDays, format } from 'date-fns';
import { Tag, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export function PackageRenewalWidget() {
  const { user } = useAuth();
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [progress, setProgress] = useState(100);

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['active-user-package', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_packages')
        .select('*, packages(*)')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('expiry_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['user-package-offers', pkg?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('renewal_notifications')
        .select('*')
        .eq('user_package_id', pkg!.id)
        .eq('notification_type', 'discount_offer')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!pkg,
  });

  useEffect(() => {
    if (pkg?.expiry_date) {
      const expiry = new Date(pkg.expiry_date);
      const start = new Date(pkg.start_date);
      const now = new Date();
      
      const totalDays = differenceInDays(expiry, start) || 30;
      let remaining = differenceInDays(expiry, now);
      if (remaining < 0) remaining = 0;
      
      setDaysRemaining(remaining);
      setProgress(Math.max(0, Math.min(100, (remaining / totalDays) * 100)));
    }
  }, [pkg]);

  if (isLoading || !pkg) return null;

  const isUrgent = daysRemaining <= 5;
  const hasOffer = !!notifications?.metadata?.coupon_code;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* Decorative gradient background */}
      <div className={`absolute top-0 left-0 h-1 w-full ${isUrgent ? 'bg-red-500' : hasOffer ? 'bg-amber-400' : 'bg-primary-500'}`} />

      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold text-navy-700 tracking-wide uppercase">
                {pkg.packages.name}
              </span>
              <span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-navy-500'}`}>
                Expires on {format(new Date(pkg.expiry_date), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <h3 className="text-xl font-display font-bold text-navy-900 mb-4">
              Subscription Status
            </h3>

            {/* Progress Bar */}
            <div className="w-full bg-navy-100 rounded-full h-2.5 mb-2 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-2.5 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-primary-500'}`} 
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-navy-500">
              <span>{Math.max(0, 30 - daysRemaining)} days used</span>
              <span className={isUrgent ? 'text-red-600 font-bold' : ''}>{daysRemaining} days left</span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 gap-3">
            {hasOffer ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-amber-700 border border-amber-200 shadow-sm"
              >
                <Tag className="w-5 h-5 fill-amber-500 text-amber-500" />
                <div className="flex flex-col text-right">
                  <span className="text-sm font-bold uppercase tracking-wide">Special Offer Available!</span>
                  <span className="text-xs font-medium">Code: <span className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">{notifications.metadata.coupon_code}</span></span>
                </div>
              </motion.div>
            ) : isUrgent ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-bold">Renew soon to keep priority</span>
              </div>
            ) : null}

            <button className={`group flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-semibold text-white shadow-sm transition-all ${
              hasOffer ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'
            }`}>
              <Zap className="w-4 h-4" />
              Renew Now
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
