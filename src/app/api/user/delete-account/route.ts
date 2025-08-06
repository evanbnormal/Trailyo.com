import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

export async function DELETE(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting account for user: ${userId} (${email})`);

    // First, get user's subscription info to cancel Stripe subscription
    const subscription = await db.subscription.findUnique({
      where: { userId }
    });

    if (subscription?.stripeSubscriptionId) {
      try {
        console.log(`🚫 Canceling Stripe subscription: ${subscription.stripeSubscriptionId}`);
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('❌ Failed to cancel Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    if (subscription?.stripeCustomerId) {
      try {
        console.log(`🗑️ Deleting Stripe customer: ${subscription.stripeCustomerId}`);
        await stripe.customers.del(subscription.stripeCustomerId);
      } catch (stripeError) {
        console.error('❌ Failed to delete Stripe customer:', stripeError);
        // Continue with deletion even if Stripe deletion fails
      }
    }

    // Delete user data from database (in correct order due to foreign key constraints)
    console.log('🗑️ Deleting user data from database...');

    // Delete subscription
    if (subscription) {
      await db.subscription.delete({
        where: { userId }
      });
      console.log('✅ Subscription deleted');
    }

    // Delete analytics events
    await db.analyticsEvent.deleteMany({
      where: { userId }
    });
    console.log('✅ Analytics events deleted');

    // Delete trail steps (cascade through trails)
    const userTrails = await db.trail.findMany({
      where: { creatorId: userId }
    });

    for (const trail of userTrails) {
      await db.trailStep.deleteMany({
        where: { trailId: trail.id }
      });
    }
    console.log('✅ Trail steps deleted');

    // Delete trails
    await db.trail.deleteMany({
      where: { creatorId: userId }
    });
    console.log('✅ Trails deleted');

    // Delete reset tokens
    await db.resetToken.deleteMany({
      where: { email }
    });
    console.log('✅ Reset tokens deleted');

    // Finally, delete the user
    await db.user.delete({
      where: { id: userId }
    });
    console.log('✅ User account deleted');

    console.log(`🎉 Account deletion completed for user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 