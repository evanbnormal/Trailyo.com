import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Set your SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('=== SENDGRID TEST ===');
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length);
    console.log('Testing email to:', email);

    const emailData = {
      to: email,
      from: 'noreply@trailyo.com', // This needs to be verified in SendGrid
      subject: 'Test Email from Trailyo',
      text: 'This is a test email to verify SendGrid configuration.',
      html: `
        <div style="background:#fff;padding:32px;text-align:center;font-family:sans-serif;">
          <h2 style="color:#111;margin-bottom:16px;">Test Email</h2>
          <p style="color:#444;">
            This is a test email to verify that SendGrid is working correctly.
          </p>
          <p style="color:#888;margin-top:32px;font-size:12px;">
            If you received this, the email configuration is working!
          </p>
        </div>
      `,
    };

    console.log('Sending test email...');
    const result = await sgMail.send(emailData);
    console.log('SendGrid response:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      details: {
        apiKeyExists: !!process.env.SENDGRID_API_KEY,
        apiKeyLength: process.env.SENDGRID_API_KEY?.length,
        fromEmail: 'noreply@trailyo.com'
      }
    });

  } catch (error) {
    console.error('=== SENDGRID TEST ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Full error object:', error);

    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: {
        apiKeyExists: !!process.env.SENDGRID_API_KEY,
        apiKeyLength: process.env.SENDGRID_API_KEY?.length,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error
      }
    }, { status: 500 });
  }
} 