import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { getStripe } from '../../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get subscription from database
    const dbSubscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!dbSubscription) {
      return NextResponse.json(
        { error: 'No subscription found for this user' },
        { status: 404 }
      );
    }

    // Cancel subscription in Stripe
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }
    
    const canceledSubscription = await stripe.subscriptions.update(
      dbSubscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update subscription in database
    await db.subscription.update({
      where: { userId },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('Subscription canceled successfully:', {
      userId,
      stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
      status: canceledSubscription.status,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled successfully',
      subscription: {
        id: dbSubscription.id,
        status: 'canceled',
        canceledAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
} 