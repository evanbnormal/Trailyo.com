import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Get publishable key for client-side
export const getStripePublishableKey = () => {
  return process.env.STRIPE_PUBLISHABLE_KEY!;
};

// Create a payment intent for tips
export const createTipPaymentIntent = async (amount: number, trailId: string, creatorId: string) => {
  try {
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