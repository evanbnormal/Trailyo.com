import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Debug log to confirm the API key is loaded
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);

// Set your SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// In-memory user store
let users: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }
        const user = users.find(u => u.email === email);
        if (!user || user.password !== password) {
          return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }
        return NextResponse.json({ 
          success: true, 
          user: { 
            email: user.email, 
            name: user.name 
          } 
        });
      }
      case 'signup': {
        if (!email || !password || !name) {
          return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
        }
        // Check if user already exists
        if (users.find(u => u.email === email)) {
          return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }
        // Send confirmation email first
        try {
          console.log('About to send confirmation email to', email);
          // Use BASE_URL from env, fallback to localhost for dev
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const confirmationUrl = `${baseUrl}/`;
          await sgMail.send({
            to: email,
            from: 'noreply@trailyo.com',
            subject: 'Confirm your email',
            text: 'Click the link to confirm your email!',
            html: `
              <div style="background:#fff;padding:32px 0;text-align:center;font-family:sans-serif;">
                <img src="${baseUrl}/Logo%20White.svg" alt="Trailyo" style="height:48px;margin-bottom:24px;" />
                <h2 style="color:#111;margin-bottom:16px;">Confirm your email</h2>
                <p style="color:#444;margin-bottom:32px;">
                  Click the button below to verify your email and activate your account.
                </p>
                <a href="${confirmationUrl}" style="display:inline-block;padding:12px 32px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
                  Confirm Email
                </a>
                <p style="color:#888;margin-top:32px;font-size:12px;">
                  If you did not sign up for Trailyo, you can ignore this email.
                </p>
              </div>
            `,
          });
          console.log('Email sent successfully to', email);
        } catch (e) {
          console.error('SendGrid error:', e);
          return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
        }
        // Only add user to in-memory store after email is sent successfully
        users.push({ email, password, name, confirmed: false });
        return NextResponse.json({ success: true });
      }
      case 'logout': {
        return NextResponse.json({ success: true });
      }
      default: {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ user: null });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
} 