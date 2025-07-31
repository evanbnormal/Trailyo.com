import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialing: boolean;
  trialEnd?: number;
  currentPeriodEnd?: number;
  status: string;
}

export interface StartSubscriptionResponse {
  clientSecret: string;
  status: 'setup_required' | 'processing' | 'error';
  message?: string;
}

export class SubscriptionService {
  /**
   * Start subscription process - Single secure endpoint
   * Handles all server-side logic including customer creation, setup intent, etc.
   */
  static async startSubscription(email: string, userId: string, name?: string): Promise<StartSubscriptionResponse> {
    try {
      const response = await fetch('/api/subscriptions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start subscription');
      }

      const result: StartSubscriptionResponse = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Start subscription error:', error);
      throw error;
    }
  }

  /**
   * Get subscription status from database (single source of truth)
   * No longer polls frequently - webhooks keep database updated
   */
  static async getSubscriptionStatus(userId: string, email?: string): Promise<SubscriptionStatus> {
    try {
      const params = new URLSearchParams({ userId });
      if (email) {
        params.append('email', email);
      }
      
      const url = `/api/subscriptions/status?${params}`;
      console.log(`🌐 Making subscription API call to: ${url}`);
      
      const response = await fetch(url);
      
      console.log(`📡 Subscription API response:`, {
        url,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });
      
      if (!response.ok) {
        console.error(`❌ Subscription API error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to get subscription status: ${response.status} ${response.statusText}`);
      }

      const status = await response.json();
      console.log(`✅ Subscription status received:`, status);
      return status;
    } catch (error) {
      console.error('❌ Get subscription status error:', error);
      console.log('🔄 Returning default free tier status due to error');
      
      // Return default free tier status on error
      return {
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      };
    }
  }

  /**
   * Cancel subscription - Server handles all Stripe operations
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const result = await response.json();
      return { success: true, message: result.message };
    } catch (error) {
      console.error('❌ Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Confirm payment setup completion
   * Called after Stripe Elements confirms the setup intent
   */
  static async confirmPaymentSetup(setupIntentId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Just verify the setup intent was successful
      // The webhook will handle subscription creation automatically
      const response = await fetch('/api/subscriptions/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setupIntentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment setup verification failed');
      }

      const result = await response.json();
      return { success: true, message: result.message };
    } catch (error) {
      console.error('❌ Payment setup confirmation error:', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance for frontend payment handling
   */
  static async getStripe() {
    return await stripePromise;
  }
} 