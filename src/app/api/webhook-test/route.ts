import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook test endpoint hit!');
  
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('📥 Webhook test body length:', body.length);
    console.log('📋 Webhook test headers:', {
      'stripe-signature': headers['stripe-signature'],
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent']
    });
    
    return NextResponse.json({ received: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook test endpoint is active',
    timestamp: new Date().toISOString()
  });
} 