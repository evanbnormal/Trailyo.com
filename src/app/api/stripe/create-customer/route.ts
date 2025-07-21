import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      
      // Always update customer metadata with current userId
      if (userId) {
        await stripe.customers.update(customer.id, {
          metadata: { 
            ...customer.metadata,
            userId,
            source: 'trailyo_creator_subscription'
          },
        });
      }
      
      return NextResponse.json({
        customerId: customer.id,
      });
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: userId ? { userId } : {},
    });

    return NextResponse.json({
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
} 