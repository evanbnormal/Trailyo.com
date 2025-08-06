import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      // Subscription Lifecycle Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      // Trial Events
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      // Payment Events
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Setup Intent Events (for initial payment method setup)
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      // Customer Events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      // Payment Method Events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      // Payment Intent Events (for trail payments)
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Subscription Created - Initial setup
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`✅ Subscription created: ${subscription.id}`);
  
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error('❌ No userId in customer metadata for subscription:', subscription.id);
    return;
  }

  try {
    await db.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planType: subscription.metadata?.subscription_type || 'creator',
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planType: subscription.metadata?.subscription_type || 'creator',
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
      },
    });

    console.log(`💾 Subscription saved to database for user: ${userId}`);
  } catch (error) {
    console.error('❌ Failed to save subscription to database:', error);
    throw error;
  }
}

// Subscription Updated - Status changes, trial end, etc.
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`🔄 Subscription updated: ${subscription.id} -> ${subscription.status}`);
  
  try {
    // Find subscription by stripeSubscriptionId first
    const existingSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!existingSubscription) {
      console.error('❌ Subscription not found in database:', subscription.id);
      return;
    }

    await db.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: subscription.status,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
        canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
        updatedAt: new Date(),
      },
    });

    console.log(`💾 Subscription status updated in database: ${subscription.status}`);
  } catch (error) {
    console.error('❌ Failed to update subscription in database:', error);
    throw error;
  }
}

// Subscription Deleted - Cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`🗑️ Subscription deleted: ${subscription.id}`);
  
  try {
    // Find subscription by stripeSubscriptionId first
    const existingSubscription = await db.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!existingSubscription) {
      console.error('❌ Subscription not found in database:', subscription.id);
      return;
    }

    await db.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`💾 Subscription marked as canceled in database`);
  } catch (error) {
    console.error('❌ Failed to update canceled subscription in database:', error);
    throw error;
  }
}

// Trial Will End - Send warning notifications
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log(`⚠️ Trial will end soon for subscription: ${subscription.id}`);
  
  // TODO: Send email notification to user about trial ending
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  
  console.log(`📧 TODO: Send trial ending email to: ${customer.email}`);
}

// Payment Succeeded - Subscription renewal
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null;
  
  if (subscriptionId) {
    console.log(`💰 Payment succeeded for subscription: ${subscriptionId}`);
    
    try {
      // Find subscription by stripeSubscriptionId first
      const existingSubscription = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      });

      if (!existingSubscription) {
        console.error('❌ Subscription not found in database:', subscriptionId);
        return;
      }

      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'active',
          currentPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          updatedAt: new Date(),
        },
      });

      console.log(`💾 Subscription renewed in database`);
    } catch (error) {
      console.error('❌ Failed to update subscription after payment:', error);
    }
  }
}

// Payment Failed - Handle dunning
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null;
  
  if (subscriptionId) {
    console.log(`❌ Payment failed for subscription: ${subscriptionId}`);
    
    try {
      // Find subscription by stripeSubscriptionId first
      const existingSubscription = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      });

      if (!existingSubscription) {
        console.error('❌ Subscription not found in database:', subscriptionId);
        return;
      }

      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          status: 'past_due',
          updatedAt: new Date(),
        },
      });

      console.log(`💾 Subscription marked as past_due in database`);
      
      // TODO: Send payment failed email to customer
      const customerId = invoice.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      console.log(`📧 TODO: Send payment failed email to: ${customer.email}`);
    } catch (error) {
      console.error('❌ Failed to update subscription after payment failure:', error);
    }
  }
}

// Setup Intent Succeeded - Payment method added
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  console.log(`✅ Setup intent succeeded: ${setupIntent.id}`);
  console.log(`🔍 Setup intent metadata:`, setupIntent.metadata);
  
  // If this setup intent has subscription metadata, create the subscription
  if (setupIntent.metadata?.subscription_type === 'creator') {
    console.log(`🎯 Creating subscription for setup intent: ${setupIntent.id}`);
    
    const customerId = setupIntent.customer as string;
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const userId = customer.metadata.userId;

    console.log(`👤 Customer ID: ${customerId}, User ID: ${userId}`);

    if (!userId) {
      console.error('❌ No userId in customer metadata for setup intent:', setupIntent.id);
      console.error('❌ Customer metadata:', customer.metadata);
      return;
    }

    try {
      // Create subscription now that payment method is attached
      const subscription = await createSubscriptionFromSetupIntent(setupIntent, customerId, userId);
      console.log(`🎉 Successfully created subscription: ${subscription.id}`);
    } catch (error) {
      console.error('❌ Failed to create subscription from setup intent:', error);
      console.error('❌ Setup intent ID:', setupIntent.id);
      console.error('❌ Customer ID:', customerId);
      console.error('❌ User ID:', userId);
    }
  } else {
    console.log(`ℹ️ Setup intent ${setupIntent.id} does not have subscription_type metadata or is not 'creator'`);
    console.log(`ℹ️ Metadata:`, setupIntent.metadata);
  }
}

// Customer Created - Log for reference
async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log(`👤 Customer created: ${customer.id} (${customer.email})`);
}

// Payment Method Attached - Log for reference
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log(`💳 Payment method attached: ${paymentMethod.id} to customer: ${paymentMethod.customer}`);
}

// Payment Intent Succeeded - Trail payments (skips and tips)
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);
  console.log(`🔍 Payment intent metadata:`, paymentIntent.metadata);
  
  const { trailId, creatorId, type } = paymentIntent.metadata;
  const amount = paymentIntent.amount / 100; // Convert from cents to dollars
  
  if (!trailId) {
    console.error('❌ No trailId in payment intent metadata:', paymentIntent.id);
    return;
  }

  try {
    // Record analytics event based on payment type
    const analyticsService = (await import('@/lib/analytics')).analyticsService;
    
    if (type === 'skip_payment') {
      console.log(`📊 Recording skip payment analytics: $${amount} for trail ${trailId}`);
      await analyticsService.trackStepSkip(trailId, 0, 'Skip Payment', amount);
    } else if (type === 'tip') {
      console.log(`📊 Recording tip payment analytics: $${amount} for trail ${trailId}`);
      await analyticsService.trackTipDonated(trailId, amount);
    } else {
      console.log(`📊 Recording generic payment analytics: $${amount} for trail ${trailId}`);
      await analyticsService.trackTipDonated(trailId, amount);
    }
    
    console.log(`✅ Analytics event recorded for payment intent: ${paymentIntent.id}`);
  } catch (error) {
    console.error('❌ Failed to record analytics for payment intent:', error);
  }
}

// Payment Intent Failed - Log for reference
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
  console.log(`🔍 Payment intent metadata:`, paymentIntent.metadata);
}

// Helper: Create subscription from setup intent
async function createSubscriptionFromSetupIntent(setupIntent: Stripe.SetupIntent, customerId: string, userId: string) {
  const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
  
  if (!priceId || priceId === 'price_placeholder') {
    throw new Error('Subscription price not configured');
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 14,
    default_payment_method: setupIntent.payment_method as string,
    metadata: {
      userId: userId,
      subscription_type: 'creator',
      setup_intent_id: setupIntent.id,
    },
  });

  console.log(`🎉 Subscription created from setup intent: ${subscription.id}`);
  
  // The subscription.created webhook will handle database insertion
  return subscription;
} 