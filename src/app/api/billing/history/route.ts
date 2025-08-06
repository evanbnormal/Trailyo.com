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

    // Get payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
    });

    // Filter payment intents for this user
    const userPayments = paymentIntents.data.filter((intent: Stripe.PaymentIntent) => {
      const metadata = intent.metadata as Record<string, string>;
      return metadata.userId === userId;
    });

    // Format payment history
    const paymentHistory = userPayments.map((intent: Stripe.PaymentIntent) => {
      const metadata = intent.metadata as Record<string, string>;
      return {
        id: intent.id,
        amount: intent.amount / 100, // Convert from cents
        currency: intent.currency,
        status: intent.status,
        created: new Date(intent.created * 1000).toISOString(),
        type: metadata.type || 'unknown',
        trailId: metadata.trailId || '',
        description: metadata.description || '',
      };
    });

    return NextResponse.json({ payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
} 