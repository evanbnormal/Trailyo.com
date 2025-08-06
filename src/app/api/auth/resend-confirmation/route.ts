import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid only if API key is available (runtime only)
const initializeSendGrid = () => {
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    return true;
  }
  return false;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;
    console.log('Resend confirmation request:', { email, name });
    
    if (!email || !name) {
      console.log('Missing email or name:', { email, name });
      return NextResponse.json({ error: 'Email and name required' }, { status: 400 });
    }
    // Send confirmation email
    try {
      const sendGridInitialized = initializeSendGrid();
      if (!sendGridInitialized) {
        console.log('SendGrid not initialized - skipping email');
        return NextResponse.json({ success: true });
      }
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const confirmationUrl = `${baseUrl}/api/auth/confirm-email?email=${encodeURIComponent(email)}`;
      console.log('Sending confirmation email to:', email);
      console.log('Confirmation URL:', confirmationUrl);
      
      await sgMail.send({
        to: email,
        from: 'noreply@trailyo.com',
        subject: 'Confirm your email',
        text: 'Click the link to confirm your email!',
        html: `
          <div style="background:#111;padding:32px 0;text-align:center;font-family:sans-serif;">
            <img src="${baseUrl}/Asset%2010newest.png" alt="Trailyo" style="height:48px;margin-bottom:24px;" />
            <h2 style="color:#fff;margin-bottom:16px;font-size:24px;">Confirm your email</h2>
            <p style="color:#ccc;margin-bottom:32px;font-size:16px;">
              Click the button below to verify your email and activate your account.
            </p>
            <a href="${confirmationUrl}" style="display:inline-block;padding:12px 32px;background:#fbbf24;color:#111;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              Confirm Email
            </a>
            <p style="color:#888;margin-top:32px;font-size:12px;">
              If you did not sign up for Trailyo, you can ignore this email.
            </p>
          </div>
        `,
      });
      console.log('Confirmation email sent successfully to:', email);
      console.log('Email details - To:', email, 'From: noreply@trailyo.com', 'Subject: Confirm your email');
      return NextResponse.json({ success: true });
    } catch (e) {
      console.error('SendGrid error:', e);
      return NextResponse.json({ 
        error: 'Failed to send confirmation email', 
        details: e instanceof Error ? e.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 