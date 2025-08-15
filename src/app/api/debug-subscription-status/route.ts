import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    console.log('🔍 DEBUG: Checking subscription status for user:', userId, email);

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

    // Check if there are any subscriptions with this email
    const emailSubscriptions = email ? await db.subscription.findMany({
      where: {
        user: {
          email: email
        }
      }
    }) : [];

    const debugData = {
      requestedUserId: userId,
      requestedEmail: email,
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
        planType: userSubscription.planType,
        stripeSubscriptionId: userSubscription.stripeSubscriptionId,
        stripeCustomerId: userSubscription.stripeCustomerId,
        createdAt: userSubscription.createdAt,
        updatedAt: userSubscription.updatedAt,
        trialEnd: userSubscription.trialEnd,
        currentPeriodEnd: userSubscription.currentPeriodEnd
      } : null,
      emailSubscriptions: emailSubscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        status: sub.status,
        planType: sub.planType,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      })),
      allSubscriptions: allSubscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        status: sub.status,
        planType: sub.planType,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      })),
      totalSubscriptions: allSubscriptions.length,
      calculatedStatus: userSubscription ? {
        isSubscribed: ['active', 'trialing'].includes(userSubscription.status),
        isTrialing: userSubscription.status === 'trialing',
        status: userSubscription.status,
        planType: userSubscription.planType
      } : {
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
        planType: null
      },
      timestamp: new Date().toISOString()
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