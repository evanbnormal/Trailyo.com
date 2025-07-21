import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { customerId, email } = await request.json();

    console.log('Creating subscription for customerId:', customerId, 'email:', email);

    if (!customerId || !email) {
      return NextResponse.json(
        { error: 'Customer ID and email are required' },
        { status: 400 }
      );
    }

    // Create a setup intent for the subscription
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        email: email,
        subscription_type: 'creator',
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error('Setup intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
} 