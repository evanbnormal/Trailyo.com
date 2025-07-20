import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialing: boolean;
  trialEnd?: number;
  currentPeriodEnd?: number;
  status: string;
}

export class SubscriptionService {
  static async createSubscription(email: string): Promise<{ clientSecret: string; subscriptionId: string }> {
    try {
      // First, create or get customer
      const customerResponse = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create customer');
      }

      const { customerId } = await customerResponse.json();

      // Create subscription
      const subscriptionResponse = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, email }),
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to create subscription');
      }

      const { clientSecret, subscriptionId } = await subscriptionResponse.json();
      return { clientSecret, subscriptionId };
    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const response = await fetch(`/api/subscriptions/status?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get subscription status');
      }

      return await response.json();
    } catch (error) {
      console.error('Get subscription status error:', error);
      // Default to free tier for new users
      return {
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      };
    }
  }

  static async redirectToCheckout(clientSecret: string): Promise<void> {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { error } = await stripe.confirmCardPayment(clientSecret);
    if (error) {
      throw new Error(error.message);
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }
} 