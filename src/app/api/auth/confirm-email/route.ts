import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// In-memory store for confirmation tokens (in production, use database)
const confirmationTokens = new Map<string, { email: string; expires: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token && !email) {
      return NextResponse.json({ error: 'Missing confirmation token or email' }, { status: 400 });
    }

    // For now, we'll use email-based confirmation since we don't have tokens yet
    if (email) {
      try {
        // Find user and mark as confirmed
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update user to mark as confirmed
        const updatedUser = await db.user.update({
          where: { email },
          data: { confirmedAt: new Date() }
        });

        console.log('Email confirmed for:', email);
        
        // Create a session for the user (similar to login)
        // We'll store the user data in a way that the frontend can access
        const userData = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          confirmedAt: updatedUser.confirmedAt
        };
        
        console.log('User data after confirmation:', userData);
        
        // Store user data in localStorage for auto-login
        const userDataForStorage = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar: undefined,
          createdAt: new Date().toISOString(),
          confirmedAt: userData.confirmedAt
        };
        
        // Redirect to simple confirmation page with user data
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const redirectUrl = new URL('/email-confirmed', baseUrl);
        redirectUrl.searchParams.set('userData', JSON.stringify(userDataForStorage));
        return NextResponse.redirect(redirectUrl);
        
      } catch (dbError) {
        console.error('Database error during confirmation:', dbError);
        return NextResponse.json({ error: 'Database error during confirmation' }, { status: 500 });
      }
    }

    // Token-based confirmation (for future use)
    if (token) {
      const tokenData = confirmationTokens.get(token);
      if (!tokenData) {
        return NextResponse.json({ error: 'Invalid or expired confirmation token' }, { status: 400 });
      }

      if (Date.now() > tokenData.expires) {
        confirmationTokens.delete(token);
        return NextResponse.json({ error: 'Confirmation token has expired' }, { status: 400 });
      }

      try {
        // Mark user as confirmed
        await db.user.update({
          where: { email: tokenData.email },
          data: { confirmedAt: new Date() }
        });

        // Clean up token
        confirmationTokens.delete(token);

        console.log('Email confirmed for:', tokenData.email);
        
        // Check if there's a stored trail URL for this user
        // We'll redirect to homepage with trail info, and the frontend will handle the redirect
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL(`/?confirmed=true&email=${encodeURIComponent(tokenData.email)}&fromTrail=true`, baseUrl));
        
      } catch (dbError) {
        console.error('Database error during confirmation:', dbError);
        return NextResponse.json({ error: 'Database error during confirmation' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid confirmation request' }, { status: 400 });

  } catch (error) {
    console.error('Email confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate confirmation token (export for use in other endpoints)
export function generateConfirmationToken(email: string): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  confirmationTokens.set(token, { email, expires });
  return token;
} 