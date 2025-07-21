import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Debug log to confirm the API key is loaded
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);

// Set your SendGrid API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// In-memory user store as fallback
let users: any[] = [];

const saveUsers = () => {
  // In a real app, you'd save to a file or use a different storage mechanism
  // For now, we'll just keep it in memory
  console.log('Users saved to memory:', users.length);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }
        
        try {
          // Try to find user in Neon DB first
          const user = await db.user.findUnique({ where: { email } });
          if (user) {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
              return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
            }
            return NextResponse.json({ 
              success: true, 
              user: { 
                id: user.id,
                email: user.email, 
                name: user.name 
              } 
            });
          }
        } catch (dbError) {
          console.log('Database connection failed, using fallback:', dbError);
          // Fallback to in-memory storage
          const user = users.find(u => u.email === email);
          if (!user || user.password !== password) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
          }
          return NextResponse.json({ 
            success: true, 
            user: { 
              id: user.id,
              email: user.email, 
              name: user.name 
            } 
          });
        }
        
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      case 'signup': {
        if (!email || !password || !name) {
          return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
        }
        
        try {
          // Check if user already exists in Neon DB
          const existingUser = await db.user.findUnique({ where: { email } });
          if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
          }
          
          // Send confirmation email first
          try {
            console.log('About to send confirmation email to', email);
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            const confirmationUrl = `${baseUrl}/api/auth/confirm-email?email=${encodeURIComponent(email)}`;
            await sgMail.send({
              to: email,
              from: 'noreply@trailyo.com',
              subject: 'Confirm your email',
              text: 'Click the link to confirm your email!',
              html: `
                <div style="background:#fff;padding:32px 0;text-align:center;font-family:sans-serif;">
                  <img src="${baseUrl}/Logo%20Black.svg" alt="Trailyo" style="height:48px;margin-bottom:24px;" />
                  <h2 style="color:#111;margin-bottom:16px;font-size:24px;">Confirm your email</h2>
                  <p style="color:#444;margin-bottom:32px;font-size:16px;">
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
            console.log('Email sent successfully to', email);
          } catch (e) {
            console.error('SendGrid error:', e);
            return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
          }
          
          // Hash password and save user to Neon DB
          const hashedPassword = await bcrypt.hash(password, 10);
          await db.user.create({
            data: {
              email,
              name,
              password: hashedPassword,
            }
          });
          return NextResponse.json({ success: true });
          
        } catch (dbError) {
          console.log('Database connection failed, using fallback:', dbError);
          // Fallback to in-memory storage
          const existingUser = users.find(u => u.email === email);
          if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
          }
          
          const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            name,
            password,
            createdAt: new Date().toISOString(),
          };
          
          users.push(newUser);
          saveUsers();
          return NextResponse.json({ success: true });
        }
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