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
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll assume new users don't have subscriptions
    // In a real implementation, you'd store the Stripe customer ID in your user database
    // and look it up by user ID. For now, we'll return free tier for all users.
    
    // TODO: Implement proper customer lookup by user ID
    // This would require storing Stripe customer IDs in your user database
    
    return NextResponse.json({
      isSubscribed: false,
      isTrialing: false,
      status: 'inactive',
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
} 