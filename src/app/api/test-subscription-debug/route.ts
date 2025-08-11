import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    console.log('🔍 DEBUG: Testing subscription lookup for:', { userId, email });

    let user = null;
    let subscription = null;

    // Try to find user by ID first
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId }
      });
      console.log('🔍 User lookup by ID result:', user ? 'Found' : 'Not found');
    }

    // If no user found by ID, try by email
    if (!user && email) {
      user = await db.user.findUnique({
        where: { email }
      });
      console.log('🔍 User lookup by email result:', user ? 'Found' : 'Not found');
    }

    // If we found a user, look for their subscription
    if (user) {
      subscription = await db.subscription.findUnique({
        where: { userId: user.id }
      });
      console.log('🔍 Subscription lookup result:', subscription ? 'Found' : 'Not found');
    }

    // Get all subscriptions for comparison
    const allSubscriptions = await db.subscription.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    const debugData = {
      searchParams: { userId, email },
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      } : null,
      subscription: subscription ? {
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        stripeCustomerId: subscription.stripeCustomerId,
        trialEnd: subscription.trialEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        createdAt: subscription.createdAt
      } : null,
      allSubscriptions: allSubscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        status: sub.status,
        createdAt: sub.createdAt
      })),
      totalSubscriptions: allSubscriptions.length,
      calculatedStatus: subscription ? {
        isSubscribed: ['active', 'trialing'].includes(subscription.status),
        isTrialing: subscription.status === 'trialing',
        status: subscription.status
      } : {
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive'
      }
    };

    console.log('🔍 DEBUG DATA:', JSON.stringify(debugData, null, 2));

    return NextResponse.json(debugData);

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug check failed', details: error.message },
      { status: 500 }
    );
  }
}
