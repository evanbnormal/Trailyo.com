import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 DEBUG: Checking subscription status for user:', userId);

    // Get user details
    const user = userId ? await db.user.findUnique({
      where: { id: userId }
    }) : null;

    // Get all subscriptions (for debugging)
    const allSubscriptions = await db.subscription.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    // Get specific user subscription
    const userSubscription = userId ? await db.subscription.findUnique({
      where: { userId }
    }) : null;

    const debugData = {
      requestedUserId: userId,
      userExists: !!user,
      userDetails: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      } : null,
      userSubscription: userSubscription ? {
        id: userSubscription.id,
        userId: userSubscription.userId,
        status: userSubscription.status,
        stripeSubscriptionId: userSubscription.stripeSubscriptionId,
        stripeCustomerId: userSubscription.stripeCustomerId,
        createdAt: userSubscription.createdAt,
        trialEnd: userSubscription.trialEnd,
        currentPeriodEnd: userSubscription.currentPeriodEnd
      } : null,
      allSubscriptions: allSubscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        status: sub.status,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt
      })),
      totalSubscriptions: allSubscriptions.length
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