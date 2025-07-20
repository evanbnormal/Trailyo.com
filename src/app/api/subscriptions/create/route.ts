import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { customerId, email } = await request.json();

    if (!customerId || !email) {
      return NextResponse.json(
        { error: 'Customer ID and email are required' },
        { status: 400 }
      );
    }

    // Create or retrieve the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID, // We'll set this up
        },
      ],
      trial_period_days: 14, // 14-day free trial
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        email: email,
        subscription_type: 'creator',
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 