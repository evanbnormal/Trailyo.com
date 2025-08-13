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

export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const email = searchParams.get('email');

    console.log('Testing subscriptions for:', { customerId, email });

    let results: any = {};

    if (customerId) {
      // Check subscriptions for specific customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
      });
      
      results.customerSubscriptions = subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        trial_end: sub.trial_end,
        created: sub.created
      }));
    }

    if (email) {
      // Check customers with this email
      const customers = await stripe.customers.list({
        email: email,
      });
      
      results.customers = customers.data.map(c => ({
        id: c.id,
        email: c.email,
        metadata: c.metadata
      }));

      // Check subscriptions for each customer
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
        });
        
        if (subscriptions.data.length > 0) {
          results[`subscriptions_${customer.id}`] = subscriptions.data.map(sub => ({
            id: sub.id,
            status: sub.status,
            trial_end: sub.trial_end,
            created: sub.created
          }));
        }
      }
    }

    // Check all recent subscriptions
    const allSubscriptions = await stripe.subscriptions.list({
      limit: 10,
    });
    
    results.recentSubscriptions = allSubscriptions.data.map(sub => ({
      id: sub.id,
      customer: sub.customer,
      status: sub.status,
      trial_end: sub.trial_end,
      created: sub.created
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Test subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to test subscriptions' },
      { status: 500 }
    );
  }
} 

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, status } = body;

    if (action === 'update_status' && userId && status) {
      const { db } = await import('@/lib/db');
      
      await db.subscription.update({
        where: { userId },
        data: { 
          status,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Updated subscription status to ${status} for user ${userId}` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Test subscriptions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
} 