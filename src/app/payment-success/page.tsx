'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const paymentIntent = searchParams.get('payment_intent');
  const setupIntent = searchParams.get('setup_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const handleSubscriptionSuccess = async (setupIntentId: string) => {
    try {
      // Get user data from localStorage or context
      const userData = localStorage.getItem('userData');
      if (!userData) {
        throw new Error('User data not found');
      }
      
      const user = JSON.parse(userData);
      
      // Get customer ID
      const customerResponse = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to get customer ID');
      }

      const { customerId } = await customerResponse.json();
      
      // Create the subscription
      const result = await fetch('/api/subscriptions/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          email: user.email,
          setupIntentId,
          userId: user.id,
        }),
      });

      if (!result.ok) {
        throw new Error('Failed to create subscription');
      }

      const subscriptionData = await result.json();
      
      // Store subscription success
      localStorage.setItem('lastSubscriptionSuccess', JSON.stringify({
        setupIntentId,
        subscriptionId: subscriptionData.subscriptionId,
        timestamp: Date.now(),
        status: 'succeeded'
      }));

      // Store the subscription status for persistence
      const subscriptionStatus = {
        isSubscribed: true,
        isTrialing: true,
        trialEnd: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60), // 14 days from now
        status: 'trialing'
      };
      localStorage.setItem(`subscription_${user.id}`, JSON.stringify(subscriptionStatus));

      toast({
        title: "Subscription Created!",
        description: "Your Creator subscription has been activated successfully.",
      });

      setIsProcessing(false);
      
      // Redirect to home after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Subscription creation error:', error);
      toast({
        title: "Subscription Error",
        description: "Failed to create subscription. Please contact support.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  useEffect(() => {
    if (setupIntent && redirectStatus === 'succeeded') {
      // Setup intent was successful - create subscription
      handleSubscriptionSuccess(setupIntent);
    } else if (paymentIntent && redirectStatus === 'succeeded') {
      // Payment was successful
      setIsProcessing(false);
      
      // Store payment success in localStorage
      const paymentData = {
        paymentIntent,
        timestamp: Date.now(),
        status: 'succeeded'
      };
      localStorage.setItem('lastPaymentSuccess', JSON.stringify(paymentData));
      
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
      });
      
      // Redirect back to the trail after a short delay
      setTimeout(() => {
        // Try to get the trail ID from localStorage or redirect to home
        const currentTrail = localStorage.getItem('currentTrailId');
        if (currentTrail) {
          router.push(`/trail/${currentTrail}`);
        } else {
          router.push('/');
        }
      }, 2000);
    } else if ((paymentIntent || setupIntent) && redirectStatus === 'failed') {
      // Payment failed
      setIsProcessing(false);
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } else {
      // No payment intent found
      setIsProcessing(false);
      router.push('/');
    }
  }, [paymentIntent, redirectStatus, router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your payment has been processed and your account has been updated.</p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/')} 
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
} 