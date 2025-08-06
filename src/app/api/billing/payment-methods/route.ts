import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // First, find the customer by userId
    const customers = await stripe.customers.list({
      limit: 100,
    });

    const customer = customers.data.find(c => 
      c.metadata.userId === userId || 
      c.email === searchParams.get('email')
    );

    if (!customer) {
      return NextResponse.json({ paymentMethods: [] });
    }

    // Get payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    const formattedPaymentMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      last4: pm.card?.last4 || '',
      brand: pm.card?.brand || '',
      expMonth: pm.card?.exp_month || 0,
      expYear: pm.card?.exp_year || 0,
      isDefault: pm.metadata?.isDefault === 'true',
    }));

    return NextResponse.json({ 
      paymentMethods: formattedPaymentMethods,
      customer: {
        id: customer.id,
        email: customer.email,
      }
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
} 