import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { X, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  onSuccess: (setupIntentId: string) => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<{
  clientSecret: string;
  onSuccess: (setupIntentId: string) => void;
  onError: (error: string) => void;
}> = ({ clientSecret, onSuccess, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Payment system not ready. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Payment form not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔐 Confirming secure payment setup...');
      
      // Confirm the setup intent with the secure client secret
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        console.error('❌ Payment setup failed:', error);
        onError(error.message || 'Payment setup failed');
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        console.log('✅ Payment setup succeeded');
        onSuccess(setupIntent.id);
      } else {
        console.error('❌ Unexpected setup intent status:', setupIntent?.status);
        onError('Payment setup incomplete');
      }

    } catch (error) {
      console.error('❌ Payment processing error:', error);
      onError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <div className="border rounded-lg p-4 bg-gray-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your payment information is securely processed by Stripe. Start your 14-day free trial now.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Start Free Trial'}
      </Button>
    </form>
  );
};

const SubscriptionPaymentModal: React.FC<SubscriptionPaymentModalProps> = ({
  open,
  onOpenChange,
  clientSecret,
  onSuccess,
  onError
}) => {
  if (!clientSecret) {
    return null;
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#f59e0b',
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Secure Payment Setup
          </DialogTitle>
        </DialogHeader>

        <Elements stripe={stripePromise} options={stripeOptions}>
          <PaymentForm 
            clientSecret={clientSecret}
            onSuccess={onSuccess} 
            onError={onError} 
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPaymentModal; 