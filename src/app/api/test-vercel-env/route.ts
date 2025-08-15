import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    console.log('🔍 Vercel Environment Test for user:', userId, email);

    // Test environment variables
    const envCheck = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripePublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSubscriptionPriceId: !!process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      hasBaseUrl: !!process.env.BASE_URL,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
    };

    // Test database connection
    let dbTest = { success: false, error: null };
    try {
      if (process.env.DATABASE_URL) {
        // Simple database test
        const userCount = await db.user.count();
        dbTest = { success: true, userCount };
      } else {
        dbTest = { success: false, error: 'No DATABASE_URL' };
      }
    } catch (error) {
      dbTest = { success: false, error: error.message };
    }

    // Test subscription lookup if userId provided
    let subscriptionTest = null;
    if (userId) {
      try {
        const subscription = await db.subscription.findUnique({
          where: { userId }
        });
        
        subscriptionTest = {
          found: !!subscription,
          status: subscription?.status || 'none',
          planType: subscription?.planType || 'none',
          stripeSubscriptionId: subscription?.stripeSubscriptionId || 'none',
          createdAt: subscription?.createdAt?.toISOString() || 'none',
          updatedAt: subscription?.updatedAt?.toISOString() || 'none'
        };
      } catch (error) {
        subscriptionTest = { error: error.message };
      }
    }

    // Test Stripe connection
    let stripeTest = { success: false, error: null };
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-06-30.basil',
        });
        
        // Test Stripe connection by getting account info
        const account = await stripe.accounts.retrieve();
        stripeTest = { 
          success: true, 
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled
        };
      } else {
        stripeTest = { success: false, error: 'No STRIPE_SECRET_KEY' };
      }
    } catch (error) {
      stripeTest = { success: false, error: error.message };
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbTest,
      stripe: stripeTest,
      subscription: subscriptionTest,
      requestedUserId: userId,
      requestedEmail: email
    };

    console.log('🔍 Vercel Environment Test Results:', JSON.stringify(testResults, null, 2));

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('❌ Vercel environment test error:', error);
    return NextResponse.json(
      { 
        error: 'Environment test failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
