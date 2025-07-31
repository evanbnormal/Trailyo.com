import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking subscription status for user: ${userId}`);

    // Check database first - this is our source of truth (kept fresh by webhooks)
    try {
      const dbSubscription = await db.subscription.findUnique({
        where: { userId },
      });

      if (dbSubscription) {
        console.log(`✅ Found subscription in database: ${dbSubscription.status}`);
        
        const isTrialing = dbSubscription.status === 'trialing';
        const isSubscribed = ['active', 'trialing'].includes(dbSubscription.status);
        
        return NextResponse.json({
          isSubscribed,
          isTrialing,
          trialEnd: dbSubscription.trialEnd ? Math.floor(dbSubscription.trialEnd.getTime() / 1000) : null,
          currentPeriodEnd: dbSubscription.currentPeriodEnd ? Math.floor(dbSubscription.currentPeriodEnd.getTime() / 1000) : null,
          status: dbSubscription.status,
        });
      }
      
      console.log(`ℹ️ No subscription found in database for user: ${userId}`);
      
      // No subscription found in database - return free tier
      // Webhooks ensure database is always up-to-date, so if it's not there, user is on free tier
      return NextResponse.json({
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      });
      
    } catch (dbError) {
      console.error('❌ Database lookup error:', dbError);
      
      // If database fails, return free tier as safe default
      return NextResponse.json({
        isSubscribed: false,
        isTrialing: false,
        status: 'inactive',
      });
    }

  } catch (error) {
    console.error('❌ Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
} 