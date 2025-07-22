import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Crown, Check, Zap } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { SubscriptionService } from '../lib/subscription';
import { useAuth } from '../contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  setupIntentId: string;
  onSuccess: () => void | Promise<void>;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<{
  setupIntentId: string;
  clientSecret: string;
  onSuccess: () => void | Promise<void>;
  onError: (error: string) => void;
}> = ({ setupIntentId, clientSecret, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user?.email) {
      console.error('Missing required data:', { stripe: !!stripe, elements: !!elements, email: user?.email });
      return;
    }

    setIsLoading(true);
    console.log('Starting payment setup...');

    try {
      // First, submit the elements to collect payment details
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        console.error('Elements submit error:', submitError);
        onError(submitError.message || 'Payment details invalid');
        return;
      }

      console.log('Elements submitted successfully, confirming setup...');

      // Then confirm the setup intent
      const { error } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}`,
        },
      });

      if (error) {
        console.error('Stripe setup error:', error);
        onError(error.message || 'Payment setup failed');
        return;
      }

      console.log('Payment setup successful, creating subscription...');

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
      console.log('Customer ID retrieved:', customerId);

      // Create the subscription
      await SubscriptionService.confirmSubscription(customerId, user.email, setupIntentId);
      
      console.log('Subscription created successfully');
      await onSuccess();
    } catch (error) {
      console.error('Subscription error:', error);
      onError('Failed to create subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-center text-yellow-600 font-semibold mb-2">
          <Zap className="h-4 w-4 mr-2" />
          14-Day Free Trial
        </div>
        <p className="text-sm text-gray-600 text-center">
          No charge today • Cancel anytime • $29.99/month after trial
        </p>
      </div>

      <div className="space-y-4">
        <div className="min-h-[180px]">
          <PaymentElement />
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold py-3 text-lg rounded-lg"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Setting up subscription...
          </div>
        ) : (
          <>
            <Crown className="h-5 w-5 mr-2" />
            Start Free Trial ($0 Today)
          </>
        )}
      </Button>
    </form>
  );
};

const SubscriptionPaymentModal: React.FC<SubscriptionPaymentModalProps> = ({
  open,
  onOpenChange,
  clientSecret,
  setupIntentId,
  onSuccess,
  onError,
}) => {
  const [stripeOptions, setStripeOptions] = useState<any>(null);

  useEffect(() => {
    if (clientSecret) {
      setStripeOptions({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f59e0b',
          },
        },
      });
    }
  }, [clientSecret]);

  if (!stripeOptions) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-gray-100 shadow-lg animate-fade-in">
        <DialogHeader className="pb-4">
          <div className="flex items-center mb-2">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-2 rounded-full mr-3">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Start Your Free Trial
            </DialogTitle>
          </div>
          <p className="text-gray-600">
            Enter your payment details to start your 14-day free trial
          </p>
        </DialogHeader>

        <div className="py-4">
          <Elements stripe={stripePromise} options={stripeOptions}>
            <PaymentForm 
              setupIntentId={setupIntentId}
              clientSecret={clientSecret}
              onSuccess={onSuccess} 
              onError={onError} 
            />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPaymentModal; 