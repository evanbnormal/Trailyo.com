import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, X, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface StripePaymentProps {
  amount: number;
  trailId: string;
  creatorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Inner component that uses Stripe hooks
const PaymentForm: React.FC<{
  amount: number;
  trailId: string;
  creatorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ amount, trailId, creatorId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setIsLoading(false);
      return;
    }

    // Create payment intent
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          trailId,
          creatorId,
        }),
      });

      const { clientSecret, error: intentError } = await response.json();

      if (intentError) {
        setError(intentError);
        setIsLoading(false);
        return;
      }

      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setIsLoading(false);
        return;
      }

      // Payment successful - show success state in modal
      setIsLoading(false);
      setError(null);
      setIsSuccess(true);
      
      // Show success message
      toast({
        title: "Payment Successful!",
        description: `You've paid $${amount} to skip this step.`,
      });
      
      // Call success callback after a short delay to show the success state
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError('Payment failed. Please try again.');
      setIsLoading(false);
    }
  };

  // Show success state
  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>
        <div className="animate-pulse">
          <p className="text-sm text-gray-500">Redirecting to your trail...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <div className="space-y-4 sm:space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Gift className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Skip Payment</p>
              <p className="text-sm text-gray-600">Pay to unlock this step</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-3xl sm:text-2xl font-bold">${amount}</p>
            <p className="text-sm text-gray-500">USD</p>
          </div>
        </div>

        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-gray-700">Payment Details</label>
          <div className="w-full overflow-x-hidden">
            <PaymentElement />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1 bg-black text-white hover:bg-black/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${amount}`
          )}
        </Button>
      </div>
    </form>
  );
};

export const StripePayment: React.FC<StripePaymentProps> = ({
  amount,
  trailId,
  creatorId,
  onSuccess,
  onCancel,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            trailId,
            creatorId,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        setError('Failed to initialize payment. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, trailId, creatorId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Setting up payment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onCancel} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Payment setup failed</p>
        <Button onClick={onCancel} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm
        amount={amount}
        trailId={trailId}
        creatorId={creatorId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}; 