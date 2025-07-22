import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import sgMail from '@sendgrid/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { customerId, email, setupIntentId, userId } = await request.json();

    console.log('Confirming subscription for customerId:', customerId, 'email:', email, 'userId:', userId);

    if (!customerId || !email || !setupIntentId || !userId) {
      return NextResponse.json(
        { error: 'Customer ID, email, setup intent ID, and user ID are required' },
        { status: 400 }
      );
    }

    // Check if price ID is configured
    const priceId = process.env.STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID;
    if (!priceId || priceId === 'price_placeholder') {
      console.error('STRIPE_CREATOR_SUBSCRIPTION_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Subscription price not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (!setupIntent.payment_method) {
      console.error('Payment method not found in setup intent:', setupIntentId);
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 400 }
      );
    }

    console.log('Creating subscription with:', {
      customerId,
      priceId,
      paymentMethod: setupIntent.payment_method,
      trialDays: 14
    });

    // Create the subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: priceId,
        },
      ],
      trial_period_days: 14, // 14-day free trial
      default_payment_method: setupIntent.payment_method as string,
      metadata: {
        email: email,
        subscription_type: 'creator',
        userId: userId,
      },
    });

    console.log('Subscription created successfully:', subscription.id);

    // Save subscription to database (temporarily disabled due to Prisma client issue)
    console.log('Subscription created in Stripe:', subscription.id);
    console.log('TODO: Save subscription to database when Prisma client is fixed');

    // Send welcome email
    try {
      const msg = {
        to: email,
        from: 'noreply@trailyo.com',
        subject: 'Welcome to Creator Tier! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Creator Tier!</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">You're now a subscribed creator on Trailyo</p>
            </div>
            
            <div style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #333; margin-bottom: 20px;">🎉 Your 14-Day Free Trial Has Started!</h2>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Congratulations! You've successfully subscribed to Trailyo's Creator tier. 
                Your 14-day free trial is now active, and you have access to all creator features.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
                <ul style="color: #666; line-height: 1.6;">
                  <li>✅ Create unlimited learning trails</li>
                  <li>✅ Publish and share with the world</li>
                  <li>✅ Access advanced analytics and insights</li>
                  <li>✅ Get priority support</li>
                  <li>✅ Early access to new features</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/creator" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Start Creating Your First Trail
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                <strong>Important:</strong> Your trial will automatically convert to a $29.99/month subscription after 14 days. 
                You can cancel anytime before the trial ends to avoid charges.
              </p>
              
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                If you have any questions or need help getting started, feel free to reach out to our support team.
              </p>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                <p style="color: #999; font-size: 14px; margin: 0;">
                  Best regards,<br>
                  The Trailyo Team
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log('Welcome email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the subscription creation if email fails
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No such price')) {
        return NextResponse.json(
          { error: 'Subscription price not found. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('No such customer')) {
        return NextResponse.json(
          { error: 'Customer not found. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create subscription. Please try again.' },
      { status: 500 }
    );
  }
} 