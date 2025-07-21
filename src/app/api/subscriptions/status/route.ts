import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('email');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll check if there are any active subscriptions for this user
    // In a real implementation, you'd store the Stripe customer ID in your user database
    // and look it up by user ID. For now, we'll search by email or user ID.
    
    try {
      // First, try to find customers by user ID in metadata
      const customers = await stripe.customers.list({
        limit: 100,
      });

      console.log('Checking subscription status for userId:', userId);
      console.log('User email from request:', userEmail);
      console.log('Total customers found:', customers.data.length);

      // Log all customers for debugging
      customers.data.forEach(c => {
        console.log('All customer:', { 
          id: c.id, 
          email: c.email, 
          metadata: c.metadata,
          userId: c.metadata?.userId 
        });
      });

      // Find all customers that match this user ID or email
      const matchingCustomers = customers.data.filter(c => 
        c.metadata?.userId === userId || 
        c.email === userEmail ||
        c.email?.includes(userId) ||
        c.id === userId
      );

      console.log('Matching customers found:', matchingCustomers.length);
      matchingCustomers.forEach(c => {
        console.log('Matching customer:', { id: c.id, email: c.email, metadata: c.metadata });
      });

      // Check each matching customer for active subscriptions
      for (const customer of matchingCustomers) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const isTrialing = subscription.status === 'trialing';
          const trialEnd = subscription.trial_end;

          return NextResponse.json({
            isSubscribed: true,
            isTrialing,
            trialEnd,
            status: subscription.status,
          });
        }
      }

      // If no customer found, let's check all subscriptions to see if any exist
      const allSubscriptions = await stripe.subscriptions.list({
        limit: 10,
        status: 'active',
      });

    } catch (stripeError) {
      console.error('Stripe lookup error:', stripeError);
      // Continue to return free tier if Stripe lookup fails
    }
    
    // Return free tier if no subscription found
    return NextResponse.json({
      isSubscribed: false,
      isTrialing: false,
      status: 'inactive',
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
} 