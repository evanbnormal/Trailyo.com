import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

interface SecureStartRequest {
  email: string;
  userId: string;
  name?: string;
}

interface SecureStartResponse {
  clientSecret: string;
  status: 'setup_required' | 'processing' | 'error';
  sessionId: string; // Secure session ID for tracking
  message?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SecureStartResponse>> {
  try {
    const { email, userId, name }: SecureStartRequest = await request.json();

    // Validate input
    if (!email || !userId) {
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          sessionId: '',
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
          sessionId: '',
          message: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Generate secure session ID for tracking
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🔐 Starting secure subscription process for user: ${userId} (${email})`);
    console.log(`🎫 Session ID: ${sessionId}`);

    // Check if subscription price is configured
    const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
    if (!priceId || priceId === 'price_placeholder') {
      console.error('❌ STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          sessionId: '',
          message: 'Subscription service temporarily unavailable.' 
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
          sessionId: '',
          message: 'You already have an active subscription' 
        },
        { status: 409 }
      );
    }

    // Step 1: Create or find Stripe customer (server-side only)
    let customer: Stripe.Customer;
    
    try {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        
        // Update customer metadata
        customer = await stripe.customers.update(customer.id, {
          metadata: { 
            userId,
            sessionId,
            source: 'trailyo_secure_subscription',
            updated_at: new Date().toISOString()
          },
          name: name || customer.name || undefined,
        });
        
        console.log(`👤 Updated existing customer: ${customer.id}`);
      } else {
        customer = await stripe.customers.create({
          email: email,
          name: name || undefined,
          metadata: {
            userId,
            sessionId,
            source: 'trailyo_secure_subscription',
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
          sessionId: '',
          message: 'Failed to set up customer account.' 
        },
        { status: 500 }
      );
    }

    // Step 2: Create setup intent with enhanced security metadata
    let setupIntent: Stripe.SetupIntent;
    
    try {
      setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          userId,
          email,
          sessionId,
          subscription_type: 'creator',
          customer_id: customer.id,
          price_id: priceId,
          secure_flow: 'true',
          created_at: new Date().toISOString()
        },
      });
      
      console.log(`💳 Created secure setup intent: ${setupIntent.id}`);
    } catch (error) {
      console.error('❌ Setup intent creation failed:', error);
      return NextResponse.json(
        { 
          clientSecret: '', 
          status: 'error',
          sessionId: '',
          message: 'Failed to initialize payment setup.' 
        },
        { status: 500 }
      );
    }

    // Step 3: Store secure tracking record in database
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
          stripeSubscriptionId: '', // Will be filled by server verification
          status: 'setup_pending',
          planType: 'creator',
        },
      });
      
      console.log(`💾 Secure subscription record created for user: ${userId}`);
    } catch (error) {
      console.error('❌ Database update failed:', error);
      // Continue - we can still process without database initially
    }

    // Return minimal data to client
    return NextResponse.json({
      clientSecret: setupIntent.client_secret!,
      status: 'setup_required',
      sessionId: sessionId, // Client uses this for verification only
      message: 'Payment setup initialized securely'
    });

  } catch (error) {
    console.error('❌ Secure subscription start error:', error);
    return NextResponse.json(
      { 
        clientSecret: '', 
        status: 'error',
        sessionId: '',
        message: 'An unexpected error occurred.' 
      },
      { status: 500 }
    );
  }
} 