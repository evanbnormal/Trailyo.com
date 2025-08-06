import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Set your SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Database will be used for reset tokens

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists in database
    let userExists = false;
    try {
      const user = await db.user.findUnique({ where: { email } });
      userExists = !!user;
      console.log('Database check for email:', email, 'User exists:', userExists);
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed. Please try again later.',
        code: 'DB_CONNECTION_ERROR'
      }, { status: 500 });
    }

    if (!userExists) {
      return NextResponse.json({ 
        error: 'No account found with this email address',
        code: 'EMAIL_NOT_FOUND'
      }, { status: 404 });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    try {
      // Delete any existing tokens for this email
      await db.resetToken.deleteMany({ where: { email } });
      
      // Create new token
      await db.resetToken.create({
        data: {
          email,
          token,
          expires
        }
      });
    } catch (dbError) {
      console.error('Failed to store reset token:', dbError);
      return NextResponse.json({ 
        error: 'Failed to create reset token. Please try again.',
        code: 'TOKEN_STORAGE_ERROR'
      }, { status: 500 });
    }

    // Send reset email
    try {
      // Use port 3001 since that's where your app is running
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      
      console.log('=== SENDGRID DEBUG ===');
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY?.length);
      console.log('Attempting to send email to:', email);
      console.log('Reset URL:', resetUrl);
      console.log('From email: noreply@trailyo.com');
      
      const emailData = {
        to: email,
        from: 'noreply@trailyo.com', // Use verified sender
        subject: 'Reset your password',
        text: `Click this link to reset your password: ${resetUrl}`,
        html: `
          <div style="background:#111;padding:32px 0;text-align:center;font-family:sans-serif;">
            <img src="${baseUrl}/Asset%2010newest.png" alt="Trailyo" style="height:48px;margin-bottom:24px;" />
            <h2 style="color:#fff;margin-bottom:16px;font-size:24px;">Reset your password</h2>
            <p style="color:#ccc;margin-bottom:32px;font-size:16px;">
              Click the button below to reset your password. This link will expire in 1 hour.
            </p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#fbbf24;color:#111;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              Reset Password
            </a>
            <p style="color:#888;margin-top:32px;font-size:12px;">
              If you did not request a password reset, you can ignore this email.
            </p>
          </div>
        `,
      };
      
      console.log('Email data prepared, sending...');
      const result = await sgMail.send(emailData);
      console.log('SendGrid response:', result);
      console.log('Password reset email sent successfully to:', email);
      return NextResponse.json({ success: true });
      
    } catch (emailError) {
      console.error('=== SENDGRID ERROR ===');
      console.error('Error type:', typeof emailError);
      console.error('Error message:', emailError instanceof Error ? emailError.message : emailError);
      console.error('Full error object:', emailError);
      
      // Check if it's a SendGrid authentication issue
      if (emailError instanceof Error && emailError.message.includes('401')) {
        return NextResponse.json({ 
          error: 'Email service not configured. Please contact support.',
          code: 'SENDGRID_AUTH_ERROR'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to send reset email. Please try again later.',
        code: 'EMAIL_SEND_FAILED',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Request password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to validate reset token (export for use in other endpoints)
async function validateResetToken(token: string): Promise<{ email: string } | null> {
  try {
    const tokenData = await db.resetToken.findUnique({ where: { token } });
    if (!tokenData) return null;
    
    if (new Date() > tokenData.expires) {
      // Token expired, delete it
      await db.resetToken.delete({ where: { token } });
      return null;
    }
    
    return { email: tokenData.email };
  } catch (error) {
    console.error('Error validating reset token:', error);
    return null;
  }
} 