import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Find user in database
        const userResults = await db.select().from(users).where(eq(users.email, email));
        const user = userResults[0];

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

      case 'signup': {
        if (!email || !password || !name) {
          return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
        }

        try {
          // Check if user already exists
          const existingUsers = await db.select().from(users).where(eq(users.email, email));
          if (existingUsers.length > 0) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
          }

          // Create new user
          const newUser = await db.insert(users).values({
            email,
            password, // In production, this should be hashed
            name,
          }).returning();

          return NextResponse.json({ 
            success: true, 
            user: { 
              id: newUser[0].id, 
              email: newUser[0].email, 
              name: newUser[0].name 
            } 
          });
        } catch (error) {
          console.error('Error creating user:', error);
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }
      }

      case 'logout': {
        // For our simple implementation, logout is handled client-side
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
    // For now, we'll return null since we don't have session management
    // In a real app, you'd implement proper session management
    return NextResponse.json({ user: null });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
} 