import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

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

    // Check database first for subscription status
    try {
      const dbSubscription = await db.subscription.findUnique({
        where: { userId },
        include: { user: true }
      });

      if (dbSubscription) {
        const isTrialing = dbSubscription.status === 'trialing';
        const isSubscribed = ['active', 'trialing'].includes(dbSubscription.status);
        
        return NextResponse.json({
          isSubscribed,
          isTrialing,
          trialEnd: dbSubscription.trialEnd ? Math.floor(dbSubscription.trialEnd.getTime() / 1000) : null,
          status: dbSubscription.status,
        });
      }
    } catch (dbError) {
      console.error('Database lookup error:', dbError);
      // Continue to Stripe lookup if database fails
    }
    
    try {
      // First, try to find customers by user ID in metadata
      const customers = await stripe.customers.list({
        limit: 100,
      });

      // console.log('Checking subscription status for userId:', userId);
      // console.log('User email from request:', userEmail);
      // console.log('Total customers found:', customers.data.length);

      // Log all customers for debugging (commented out to reduce spam)
      // customers.data.forEach(c => {
      //   console.log('All customer:', { 
      //     id: c.id, 
      //     email: c.email, 
      //     metadata: c.metadata,
      //     userId: c.metadata?.userId 
      //   });
      // });

      // Find all customers that match this user ID or email
      const matchingCustomers = customers.data.filter(c => 
        c.metadata?.userId === userId || 
        c.email === userEmail ||
        c.email?.includes(userId) ||
        c.id === userId
      );

      // console.log('Matching customers found:', matchingCustomers.length);
      // matchingCustomers.forEach(c => {
      //   console.log('Matching customer:', { id: c.id, email: c.email, metadata: c.metadata });
      // });

      // Check each matching customer for subscriptions
      for (const customer of matchingCustomers) {
        // console.log('Checking subscriptions for customer:', customer.id);
        
        // Check all subscriptions for this customer
        const allSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
        });
        
        // console.log('Total subscriptions for customer:', allSubscriptions.data.length);
        // allSubscriptions.data.forEach(sub => {
        //   console.log('Subscription:', { 
        //     id: sub.id, 
        //     status: sub.status, 
        //     trial_end: sub.trial_end
        //   });
        // });

        // Return true if we have any valid subscriptions
        if (allSubscriptions.data.length > 0) {
          const subscription = allSubscriptions.data[0];
          const isTrialing = subscription.status === 'trialing';
          const trialEnd = subscription.trial_end;
          
          // Consider any subscription as "subscribed" except canceled or incomplete
          const isSubscribed = !['canceled', 'incomplete', 'incomplete_expired'].includes(subscription.status);

          // console.log('Returning subscription status:', {
          //   isSubscribed,
          //   isTrialing,
          //   trialEnd,
          //   status: subscription.status,
          // });

          return NextResponse.json({
            isSubscribed,
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