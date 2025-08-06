import Stripe from 'stripe';

// Initialize Stripe only if API key is available (runtime only)
export const initializeStripe = () => {
  if (process.env.STRIPE_SECRET_KEY) {
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return null;
};

// Get a Stripe instance (for backward compatibility)
export const getStripe = () => {
  return initializeStripe();
};

// Get publishable key for client-side
export const getStripePublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY!;
};

// Create a payment intent for tips
export const createTipPaymentIntent = async (amount: number, trailId: string, creatorId: string) => {
  try {
    const stripe = initializeStripe();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        trailId,
        creatorId,
        type: 'tip',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (payload: string, signature: string) => {
  try {
    const stripe = initializeStripe();
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}; 