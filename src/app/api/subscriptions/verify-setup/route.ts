import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

interface VerifySetupRequest {
  setupIntentId: string;
}

interface VerifySetupResponse {
  success: boolean;
  message: string;
  status?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifySetupResponse>> {
  try {
    const { setupIntentId }: VerifySetupRequest = await request.json();

    if (!setupIntentId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Setup intent ID is required' 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Verifying setup intent: ${setupIntentId}`);

    // Retrieve the setup intent from Stripe
    let setupIntent: Stripe.SetupIntent;
    
    try {
      setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    } catch (error) {
      console.error('❌ Failed to retrieve setup intent:', error);
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid setup intent ID' 
        },
        { status: 404 }
      );
    }

    // Check setup intent status
    if (setupIntent.status === 'succeeded') {
      console.log(`✅ Setup intent verified successfully: ${setupIntentId}`);
      
      // The webhook will handle subscription creation automatically
      // This endpoint just confirms that payment setup was successful
      return NextResponse.json({
        success: true,
        message: 'Payment method setup completed successfully. Your subscription will be activated shortly.',
        status: setupIntent.status
      });
    } else if (setupIntent.status === 'processing') {
      return NextResponse.json({
        success: false,
        message: 'Payment setup is still processing. Please wait a moment and try again.',
        status: setupIntent.status
      });
    } else if (setupIntent.status === 'requires_payment_method') {
      return NextResponse.json({
        success: false,
        message: 'Payment method setup incomplete. Please complete the payment form.',
        status: setupIntent.status
      });
    } else if (setupIntent.status === 'requires_confirmation') {
      return NextResponse.json({
        success: false,
        message: 'Payment setup requires additional confirmation. Please complete the payment process.',
        status: setupIntent.status
      });
    } else if (setupIntent.status === 'canceled') {
      return NextResponse.json({
        success: false,
        message: 'Payment setup was canceled. Please try again.',
        status: setupIntent.status
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Payment setup failed with status: ${setupIntent.status}`,
        status: setupIntent.status
      });
    }

  } catch (error) {
    console.error('❌ Setup verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'An error occurred while verifying payment setup. Please try again.' 
      },
      { status: 500 }
    );
  }
} 