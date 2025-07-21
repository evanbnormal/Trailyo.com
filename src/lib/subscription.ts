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
  static async createSubscription(email: string, userId?: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    try {
      // First, create or get customer
      const customerResponse = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId }),
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create customer');
      }

      const { customerId } = await customerResponse.json();

      // Create setup intent
      const setupIntentResponse = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, email }),
      });

      if (!setupIntentResponse.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret, setupIntentId } = await setupIntentResponse.json();
      return { clientSecret, setupIntentId };
    } catch (error) {
      console.error('Setup intent creation error:', error);
      throw error;
    }
  }

  static async confirmSubscription(customerId: string, email: string, setupIntentId: string): Promise<{ subscriptionId: string; status: string }> {
    try {
      const response = await fetch('/api/subscriptions/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, email, setupIntentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Subscription confirmation error:', error);
      throw error;
    }
  }

  static async getSubscriptionStatus(userId: string, email?: string): Promise<SubscriptionStatus> {
    try {
      const params = new URLSearchParams({ userId });
      if (email) {
        params.append('email', email);
      }
      
      const response = await fetch(`/api/subscriptions/status?${params}`);
      
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

  static async setupSubscriptionPayment(clientSecret: string): Promise<void> {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    // For subscriptions with trial, we need to confirm the setup intent
    const { error } = await stripe.confirmSetup({
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/subscription-success`,
      },
    });

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