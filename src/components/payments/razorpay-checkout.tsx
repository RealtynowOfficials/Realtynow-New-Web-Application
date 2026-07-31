import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';
import { useToast } from '../toast';

// Extend Window object for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  packageId: string;
  billingCycle: 'monthly' | 'yearly';
  buttonText?: string;
  className?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: any) => void;
  disabled?: boolean;
}

export function RazorpayCheckout({
  packageId,
  billingCycle,
  buttonText = 'Subscribe Now',
  className = '',
  onSuccess,
  onError,
  disabled = false,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    // Load Razorpay script
    const loadRazorpayScript = () => {
      if (window.Razorpay) {
        setIsScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        addToast('error', 'Payment gateway failed to load.');
      };
      document.body.appendChild(script);
    };

    loadRazorpayScript();
  }, [addToast]);

  const handlePayment = async () => {
    if (!isScriptLoaded) {
      addToast('info', 'Payment gateway is still loading...');
      return;
    }

    setLoading(true);

    try {
      // 1. Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('You must be logged in to make a payment.');
      }

      // 2. Call Edge Function to create order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('payment-gateway', {
        headers: {
          'x-action': 'create-order',
        },
        body: {
          package_id: packageId,
          billing_cycle: billingCycle,
          payment_type: 'upfront',
          discount_pct: 0
        },
      });

      if (orderError) throw orderError;
      if (!orderData || !orderData.success) {
        throw new Error(orderData?.error || 'Failed to initialize payment.');
      }

      const { razorpay_order_id, razorpay_key_id, amount, currency, payment_id } = orderData;

      // 3. Initialize Razorpay Checkout
      const options = {
        key: razorpay_key_id,
        amount: amount * 100, // amount in smallest currency unit (paise)
        currency: currency,
        name: 'RealtyNow Enterprise',
        description: `Subscription Payment`,
        image: '/logo.png', // Fallback to your site's logo
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment with Edge Function
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-gateway', {
              headers: {
                'x-action': 'verify-payment',
              },
              body: {
                payment_id: payment_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              },
            });

            if (verifyError) throw verifyError;
            if (!verifyData || !verifyData.success) {
              throw new Error(verifyData?.error || 'Payment verification failed.');
            }

            addToast('success', 'Payment successful!');
            if (onSuccess) onSuccess(payment_id);
          } catch (err: any) {
            console.error('Verification error:', err);
            addToast('error', err.message || 'Payment verification failed.');
            if (onError) onError(err);
          }
        },
        prefill: {
          name: session.user.user_metadata?.first_name || '',
          email: session.user.email,
        },
        theme: {
          color: '#1a365d', // primary-900 (navy)
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        addToast('error', response.error.description);
        if (onError) onError(response.error);
      });

      razorpay.open();

    } catch (error: any) {
      console.error('Checkout error:', error);
      addToast('error', error.message || 'Something went wrong.');
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || loading || !isScriptLoaded}
      className={className}
    >
      {loading ? 'Processing...' : buttonText}
    </Button>
  );
}
