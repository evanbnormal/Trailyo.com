import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('🔔 Webhook test endpoint reached!');
    console.log('📥 Headers:', {
      'stripe-signature': headers['stripe-signature'] ? 'present' : 'missing',
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent']
    });
    console.log('📦 Body length:', body.length);
    console.log('📦 Body preview:', body.substring(0, 200) + '...');
    
    // Store the webhook data for debugging
    const webhookData = {
      timestamp: new Date().toISOString(),
      headers: {
        'stripe-signature': headers['stripe-signature'] ? 'present' : 'missing',
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent']
      },
      bodyLength: body.length,
      bodyPreview: body.substring(0, 200)
    };
    
    // In a real implementation, you'd verify the signature and process the webhook
    // For testing, we just log it
    
    return NextResponse.json({ 
      received: true, 
      timestamp: new Date().toISOString(),
      message: 'Webhook test endpoint is working!'
    });
    
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ 
      error: 'Webhook test failed', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Webhook test endpoint is accessible',
    timestamp: new Date().toISOString(),
    message: 'This endpoint can receive POST requests from Stripe webhooks',
    instructions: [
      '1. Go to your Stripe Dashboard > Webhooks',
      '2. Add this endpoint URL: https://your-app.vercel.app/api/test-webhook-reach',
      '3. Send a test webhook to verify it reaches your Vercel deployment',
      '4. Check the Vercel logs to see if the webhook was received'
    ]
  });
}
