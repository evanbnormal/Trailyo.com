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

interface StartSubscriptionRequest {
  email: string;
  userId: string;
  name?: string;
}

interface StartSubscriptionResponse {
  clientSecret: string;
  status: 'setup_required' | 'processing' | 'error';
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<StartSubscriptionResponse>> {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Stripe not configured' 
        },
        { status: 500 }
      );
    }

    const { email, userId, name }: StartSubscriptionRequest = await request.json();

    // Validate input
    if (!email || !userId) {
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Email and user ID are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Check if subscription price is configured
    const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
    if (!priceId || priceId === 'price_placeholder') {
      console.error('❌ STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Subscription service temporarily unavailable. Please contact support.' 
        },
        { status: 500 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await db.subscription.findUnique({
      where: { userId }
    });

    if (existingSubscription && ['active', 'trialing'].includes(existingSubscription.status)) {
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'You already have an active subscription' 
        },
        { status: 409 }
      );
    }

    console.log(`🚀 Starting subscription process for user: ${userId} (${email})`);

    // Step 1: Find or create Stripe customer
    let customer: Stripe.Customer;
    
    try {
      // First check if customer exists by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        
        // Update customer metadata with current userId
        customer = await stripe.customers.update(customer.id, {
          metadata: { 
            ...customer.metadata,
            userId,
            source: 'trailyo_creator_subscription',
            updated_at: new Date().toISOString()
          },
          name: name || customer.name || undefined,
        });
        
        console.log(`👤 Found existing customer: ${customer.id}`);
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: email,
          name: name || undefined,
          metadata: {
            userId,
            source: 'trailyo_creator_subscription',
            created_at: new Date().toISOString()
          },
        });
        
        console.log(`👤 Created new customer: ${customer.id}`);
      }
    } catch (error) {
      console.error('❌ Customer creation/retrieval failed:', error);
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Failed to set up customer account. Please try again.' 
        },
        { status: 500 }
      );
    }

    // Step 2: Create setup intent for payment method collection
    let setupIntent: Stripe.SetupIntent;
    
    try {
      setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session', // Allow for future payments
        metadata: {
          userId,
          email,
          subscription_type: 'creator',
          customer_id: customer.id,
          created_at: new Date().toISOString()
        },
      });
      
      console.log(`💳 Created setup intent: ${setupIntent.id}`);
    } catch (error) {
      console.error('❌ Setup intent creation failed:', error);
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          message: 'Failed to initialize payment setup. Please try again.' 
        },
        { status: 500 }
      );
    }

    // Step 3: Store setup intent reference in database for tracking
    try {
      await db.subscription.upsert({
        where: { userId },
        update: {
          stripeCustomerId: customer.id,
          status: 'setup_pending',
          updatedAt: new Date(),
        },
        create: {
          userId,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: '', // Will be filled when subscription is created
          status: 'setup_pending',
          planType: 'creator',
        },
      });
      
      console.log(`💾 Subscription setup record created for user: ${userId}`);
    } catch (error) {
      console.error('❌ Database update failed:', error);
      // Continue even if database fails - setup intent is the source of truth
    }

    // Step 4: Return client secret for frontend to complete payment setup
    return NextResponse.json({
      clientSecret: setupIntent.client_secret!,
      status: 'setup_required',
      message: 'Payment setup initialized successfully'
    });

  } catch (error) {
    console.error('❌ Subscription start error:', error);
    return NextResponse.json(
      { 
        clientSecret: '', 
        status: 'error',
        message: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    );
  }
} 