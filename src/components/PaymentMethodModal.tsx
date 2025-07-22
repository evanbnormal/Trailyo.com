import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { CreditCard, Check, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuth } from '../contexts/AuthContext';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  onError: (error: string) => void;
  editingPaymentMethod?: PaymentMethod | null;
}

const PaymentMethodForm: React.FC<{
  clientSecret: string;
  onSuccess: () => void | Promise<void>;
  onError: (error: string) => void;
  editingPaymentMethod?: PaymentMethod | null;
}> = ({ clientSecret, onSuccess, onError, editingPaymentMethod }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user?.email) {
      console.error('Missing required data:', { stripe: !!stripe, elements: !!elements, email: user?.email });
      return;
    }

    setIsLoading(true);
    console.log('Starting payment method setup...');

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
        redirect: 'if_required',
      });

      if (error) {
        console.error('Stripe setup error:', error);
        onError(error.message || 'Payment method setup failed');
        return;
      }

      console.log('Payment method setup successful');
      
      // If we're editing, delete the old payment method
      if (editingPaymentMethod) {
        try {
          const deleteResponse = await fetch('/api/billing/delete-payment-method', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user.id,
              paymentMethodId: editingPaymentMethod.id 
            }),
          });
          
          if (!deleteResponse.ok) {
            console.warn('Failed to delete old payment method, but new one was added successfully');
          }
        } catch (deleteError) {
          console.warn('Failed to delete old payment method:', deleteError);
        }
      }
      
      // Show success state
      setIsSuccess(true);
      
      // Call success callback after a short delay
      setTimeout(async () => {
        await onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error('Payment method setup error:', error);
      onError('Failed to add payment method. Please try again.');
    } finally {
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {editingPaymentMethod ? 'Payment Method Updated!' : 'Payment Method Added!'}
        </h3>
        <p className="text-gray-600 mb-4">
          {editingPaymentMethod 
            ? 'Your payment method has been updated successfully.'
            : 'Your payment method has been saved successfully.'
          }
        </p>
        <div className="animate-pulse">
          <p className="text-sm text-gray-500">Closing modal...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-center text-gray-900 font-semibold mb-2">
          <CreditCard className="h-4 w-4 mr-2" />
          {editingPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
        </div>
        <p className="text-sm text-gray-600 text-center">
          {editingPaymentMethod 
            ? 'Your new payment method will replace the existing one'
            : 'Your payment method will be securely saved for future use'
          }
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
        className="w-full bg-black hover:bg-black/90 text-white font-semibold py-3 text-lg rounded-lg"
      >
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            Adding payment method...
          </div>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            {editingPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
          </>
        )}
      </Button>
    </form>
  );
};

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onError,
  editingPaymentMethod,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (open && user?.id) {
      createSetupIntent();
    }
  }, [open, user?.id]);

  const createSetupIntent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user?.id,
          email: user?.email 
        }),
      });

      const data = await response.json();

      if (data.error) {
        onError(data.error);
      } else {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      onError('Failed to initialize payment method setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#000000',
      },
    },
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-gray-100 shadow-lg animate-fade-in">
        <DialogHeader className="pb-4">
                  <div className="flex items-center mb-2">
          <div className="bg-black p-2 rounded-full mr-3">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
                      <DialogTitle className="text-2xl font-bold text-gray-900">
              {editingPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
            </DialogTitle>
          </div>
          <p className="text-gray-600">
            {editingPaymentMethod 
              ? `Replace your ${editingPaymentMethod.brand} •••• ${editingPaymentMethod.last4} with a new payment method`
              : 'Enter your payment details to save a payment method for future use'
            }
          </p>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Setting up payment method...</span>
            </div>
          ) : stripeOptions ? (
            <Elements stripe={stripePromise} options={stripeOptions}>
              <PaymentMethodForm 
                clientSecret={clientSecret!}
                onSuccess={onSuccess} 
                onError={onError}
                editingPaymentMethod={editingPaymentMethod}
              />
            </Elements>
          ) : (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">Failed to initialize payment method setup</p>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodModal; 