import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

// Initialize Stripe only if API key is available (runtime only)
const getStripe = () => {
  if (process.env.STRIPE_SECRET_KEY) {
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return null;
};

interface SecureVerifyRequest {
  sessionId: string;
  userId: string;
}

interface SecureVerifyResponse {
  status: 'success' | 'processing' | 'failed' | 'error';
  subscriptionStatus?: 'active' | 'trialing' | 'setup_pending' | 'failed';
  message: string;
  retryAfter?: number; // Seconds to wait before retrying
}

export async function POST(request: NextRequest): Promise<NextResponse<SecureVerifyResponse>> {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Stripe not configured' 
        },
        { status: 500 }
      );
    }

    const { sessionId, userId }: SecureVerifyRequest = await request.json();

    // Validate input
    if (!sessionId || !userId) {
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Session ID and user ID are required' 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Verifying secure subscription for session: ${sessionId}, user: ${userId}`);

    // Get subscription record from database
    const subscription = await db.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return NextResponse.json({
        status: 'error',
        message: 'Subscription record not found'
      }, { status: 404 });
    }

    // If already active/trialing, return success
    if (['active', 'trialing'].includes(subscription.status)) {
      console.log(`✅ Subscription already active: ${subscription.status}`);
      return NextResponse.json({
        status: 'success',
        subscriptionStatus: subscription.status as any,
        message: 'Subscription is active'
      });
    }

    if (!subscription.stripeCustomerId) {
      return NextResponse.json({
        status: 'error',
        message: 'Customer ID not found'
      }, { status: 400 });
    }

    try {
      // Step 1: Find the setup intent with our session ID
      console.log(`🔍 Looking for setup intents for customer: ${subscription.stripeCustomerId}`);
      
      const setupIntents = await stripe.setupIntents.list({
        customer: subscription.stripeCustomerId,
        limit: 10,
      });

      const matchingSetupIntent = setupIntents.data.find(si => 
        si.metadata?.sessionId === sessionId && 
        si.metadata?.userId === userId &&
        si.metadata?.secure_flow === 'true'
      );

      if (!matchingSetupIntent) {
        console.log(`❓ No matching setup intent found for session: ${sessionId}`);
        return NextResponse.json({
          status: 'processing',
          message: 'Payment setup not yet complete',
          retryAfter: 3
        });
      }

      console.log(`🎯 Found setup intent: ${matchingSetupIntent.id}, status: ${matchingSetupIntent.status}`);

      // Step 2: Check setup intent status
      if (matchingSetupIntent.status === 'processing') {
        return NextResponse.json({
          status: 'processing',
          message: 'Payment is being processed',
          retryAfter: 2
        });
      }

      if (matchingSetupIntent.status === 'requires_payment_method') {
        return NextResponse.json({
          status: 'failed',
          message: 'Payment setup incomplete'
        });
      }

      if (matchingSetupIntent.status !== 'succeeded') {
        console.log(`❌ Setup intent failed with status: ${matchingSetupIntent.status}`);
        return NextResponse.json({
          status: 'failed',
          message: 'Payment setup failed'
        });
      }

      // Step 3: Setup intent succeeded - create subscription server-side
      console.log(`✅ Setup intent succeeded, creating subscription...`);

      const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
      if (!priceId || priceId === 'price_placeholder') {
        throw new Error('Subscription price not configured');
      }

      // Check if subscription already exists in Stripe
      const existingStripeSubscriptions = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
        price: priceId,
        limit: 1,
      });

      let stripeSubscription: Stripe.Subscription;

      if (existingStripeSubscriptions.data.length > 0) {
        stripeSubscription = existingStripeSubscriptions.data[0];
        console.log(`📋 Found existing Stripe subscription: ${stripeSubscription.id}`);
      } else {
        // Create new subscription
        stripeSubscription = await stripe.subscriptions.create({
          customer: subscription.stripeCustomerId,
          items: [{ price: priceId }],
          trial_period_days: 14,
          default_payment_method: matchingSetupIntent.payment_method as string,
          metadata: {
            userId: userId,
            sessionId: sessionId,
            subscription_type: 'creator',
            setup_intent_id: matchingSetupIntent.id,
            secure_flow: 'true',
          },
        });

        console.log(`🎉 Created new Stripe subscription: ${stripeSubscription.id}`);
      }

      // Step 4: Update database with complete subscription info
      const updatedSubscription = await db.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: stripeSubscription.id,
          status: stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          currentPeriodEnd: (stripeSubscription as any).current_period_end ? new Date((stripeSubscription as any).current_period_end * 1000) : null,
          updatedAt: new Date(),
        },
      });

      console.log(`💾 Updated subscription in database: ${updatedSubscription.status}`);

      return NextResponse.json({
        status: 'success',
        subscriptionStatus: updatedSubscription.status as any,
        message: 'Subscription activated successfully'
      });

    } catch (stripeError: any) {
      console.error('❌ Stripe operation failed:', stripeError);
      
      // Update subscription status to failed
      await db.subscription.update({
        where: { userId },
        data: {
          status: 'failed',
          updatedAt: new Date(),
        },
      }).catch(() => {}); // Don't throw if database update fails

      return NextResponse.json({
        status: 'failed',
        message: 'Subscription creation failed'
      });
    }

  } catch (error) {
    console.error('❌ Secure verification error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Verification failed' 
      },
      { status: 500 }
    );
  }
} 