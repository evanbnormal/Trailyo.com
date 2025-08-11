import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Test webhook received:', {
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    });
    
    return NextResponse.json({
      status: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      receivedData: body
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({
      error: 'Test webhook failed',
      details: error.message
    }, { status: 500 });
  }
}
