import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, isSubscribed, isTrialing, trialEnd } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create a subscription status object
    const subscriptionStatus = {
      isSubscribed: isSubscribed || false,
      isTrialing: isTrialing || false,
      trialEnd: trialEnd || null,
      status: isTrialing ? 'trialing' : (isSubscribed ? 'active' : 'inactive'),
    };

    // Store in localStorage (this will be done on the client side)
    console.log('Setting subscription status for user:', userId, subscriptionStatus);

    return NextResponse.json({
      success: true,
      message: 'Subscription status set successfully',
      subscriptionStatus
    });
  } catch (error) {
    console.error('Set subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to set subscription status' },
      { status: 500 }
    );
  }
} 