import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log('Testing email sending to:', email);
    console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
    console.log('BASE_URL:', process.env.BASE_URL);

    // Initialize SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      console.log('No SendGrid API key found');
      return NextResponse.json({ 
        error: 'SendGrid API key not configured',
        hasApiKey: false
      }, { status: 500 });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const baseUrl = process.env.BASE_URL || 'https://trailyo-com.vercel.app';
    
    // Send a test email
    const msg = {
      to: email,
      from: 'noreply@trailyo.com',
      subject: 'Test Email from Trailyo',
      text: 'This is a test email to verify SendGrid is working.',
      html: `
        <div style="background:#111;padding:32px;text-align:center;font-family:sans-serif;">
          <h2 style="color:#fff;margin-bottom:16px;">Test Email</h2>
          <p style="color:#ccc;margin-bottom:16px;">
            This is a test email to verify SendGrid configuration is working properly.
          </p>
          <p style="color:#888;font-size:12px;">
            Sent from: ${baseUrl}<br>
            Time: ${new Date().toISOString()}
          </p>
        </div>
      `,
    };

    console.log('Attempting to send email with details:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject,
      baseUrl
    });

    await sgMail.send(msg);
    
    console.log('Test email sent successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      hasApiKey: true,
      baseUrl
    });

  } catch (error) {
    console.error('Test email error:', error);
    
    // Check if it's a SendGrid authentication error
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('403')) {
        return NextResponse.json({ 
          error: 'SendGrid API key is invalid or unauthorized',
          details: error.message,
          hasApiKey: true,
          isAuthError: true
        }, { status: 500 });
      }
      
      if (error.message.includes('from')) {
        return NextResponse.json({ 
          error: 'Sender email address not verified in SendGrid',
          details: error.message,
          hasApiKey: true,
          isSenderError: true
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error',
      hasApiKey: !!process.env.SENDGRID_API_KEY
    }, { status: 500 });
  }
} 