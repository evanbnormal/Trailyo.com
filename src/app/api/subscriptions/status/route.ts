import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get customer by user ID (you might want to store this mapping in your database)
    const customers = await stripe.customers.list({
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      });
    }

    const customer = customers.data[0];

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      });
    }

    const subscription = subscriptions.data[0];

    return NextResponse.json({
      isSubscribed: true,
      isTrialing: subscription.status === 'trialing',
      trialEnd: subscription.trial_end,
      currentPeriodEnd: (subscription as any).current_period_end,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
} 