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
        // Add user to in-memory store
        users.push({ email, password, name, confirmed: false });
        // Send confirmation email
        try {
          await sgMail.send({
            to: email,
            from: 'noreply@trailyo.com',
            subject: 'Confirm your email',
            text: 'Click the link to confirm your email!',
            html: '<strong>Click the link to confirm your email!</strong>',
          });
        } catch (e) {
          console.error('SendGrid error:', e);
          return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
        }
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