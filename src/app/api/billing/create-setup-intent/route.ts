import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe only if API key is available (runtime only)
const getStripe = () => {
  if (process.env.STRIPE_SECRET_KEY) {
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // First, find or create the customer
    let customer;
    const customers = await stripe.customers.list({
      limit: 100,
    });

    customer = customers.data.find(c => 
      c.metadata.userId === userId || 
      c.email === email
    );

    if (!customer) {
      // Create new customer
      customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
    }

    // Create a SetupIntent for adding payment methods
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow the payment method to be used for future payments
      metadata: {
        userId,
      },
    });

    return NextResponse.json({ 
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customer: {
        id: customer.id,
        email: customer.email,
      }
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
} 