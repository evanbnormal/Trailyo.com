import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Secure subscription endpoints are active',
    endpoints: {
      start: '/api/subscriptions/secure-start',
      verify: '/api/subscriptions/secure-verify',
    },
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'test-start') {
      return NextResponse.json({
        message: 'Secure start endpoint test',
        requirements: ['email', 'userId', 'name (optional)'],
        returns: ['clientSecret', 'sessionId'],
        status: 'available',
      });
    }

    if (action === 'test-verify') {
      return NextResponse.json({
        message: 'Secure verify endpoint test',
        requirements: ['sessionId', 'userId'],
        returns: ['status', 'subscriptionStatus', 'message', 'retryAfter'],
        status: 'available',
      });
    }

    return NextResponse.json({
      message: 'Unknown test action',
      availableActions: ['test-start', 'test-verify'],
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Test request failed' },
      { status: 400 }
    );
  }
} 