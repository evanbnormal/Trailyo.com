import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { customerId, email, setupIntentId } = await request.json();

    if (!customerId || !email || !setupIntentId) {
      return NextResponse.json(
        { error: 'Customer ID, email, and setup intent ID are required' },
        { status: 400 }
      );
    }

    // Check if price ID is configured
    const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
    if (!priceId || priceId === 'price_placeholder') {
      console.error('STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Subscription price not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (!setupIntent.payment_method) {
      console.error('Payment method not found in setup intent:', setupIntentId);
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 400 }
      );
    }

    console.log('Creating subscription with:', {
      customerId,
      priceId,
      paymentMethod: setupIntent.payment_method,
      trialDays: 14
    });

    // Create the subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      trial_period_days: 14, // 14-day free trial
      default_payment_method: setupIntent.payment_method as string,
      metadata: {
        email: email,
        subscription_type: 'creator',
      },
    });

    console.log('Subscription created successfully:', subscription.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No such price')) {
        return NextResponse.json(
          { error: 'Subscription price not found. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('No such customer')) {
        return NextResponse.json(
          { error: 'Customer not found. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create subscription. Please try again.' },
      { status: 500 }
    );
  }
} 