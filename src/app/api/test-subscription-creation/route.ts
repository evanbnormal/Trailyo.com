import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email || !userId) {
      return NextResponse.json({
        error: 'Email and userId required',
        example: '/api/test-subscription-creation?email=test@example.com&userId=123'
      });
    }

    console.log('🧪 Testing subscription creation for:', { email, userId });

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-30.basil',
    });

    const results: any = {
      timestamp: new Date().toISOString(),
      email,
      userId,
      steps: {}
    };

    // Step 1: Check if customer exists
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      results.steps.customerCheck = {
        success: true,
        found: customers.data.length > 0,
        customerId: customers.data[0]?.id || null
      };
    } catch (error) {
      results.steps.customerCheck = {
        success: false,
        error: error.message
      };
    }

    // Step 2: Check if subscription exists in database
    try {
      const subscription = await db.subscription.findUnique({
        where: { userId }
      });
      results.steps.databaseCheck = {
        success: true,
        found: !!subscription,
        status: subscription?.status || 'none',
        stripeCustomerId: subscription?.stripeCustomerId || 'none',
        stripeSubscriptionId: subscription?.stripeSubscriptionId || 'none'
      };
    } catch (error) {
      results.steps.databaseCheck = {
        success: false,
        error: error.message
      };
    }

    // Step 3: Check if Stripe subscription exists
    if (results.steps.customerCheck.success && results.steps.customerCheck.customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: results.steps.customerCheck.customerId,
          limit: 1
        });
        results.steps.stripeSubscriptionCheck = {
          success: true,
          found: subscriptions.data.length > 0,
          subscriptionId: subscriptions.data[0]?.id || null,
          status: subscriptions.data[0]?.status || null
        };
      } catch (error) {
        results.steps.stripeSubscriptionCheck = {
          success: false,
          error: error.message
        };
      }
    }

    // Step 4: Check setup intents
    if (results.steps.customerCheck.success && results.steps.customerCheck.customerId) {
      try {
        const setupIntents = await stripe.setupIntents.list({
          customer: results.steps.customerCheck.customerId,
          limit: 5
        });
        results.steps.setupIntentsCheck = {
          success: true,
          count: setupIntents.data.length,
          intents: setupIntents.data.map(si => ({
            id: si.id,
            status: si.status,
            created: si.created,
            metadata: si.metadata
          }))
        };
      } catch (error) {
        results.steps.setupIntentsCheck = {
          success: false,
          error: error.message
        };
      }
    }

    console.log('🧪 Test results:', JSON.stringify(results, null, 2));

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Test subscription creation error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
