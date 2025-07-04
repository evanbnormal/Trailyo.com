import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    switch (action) {
      case 'login': {
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const user = await userService.authenticateUser(email, password);

        if (!user) {
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
          const newUser = await userService.createUser(email, password, name);

          return NextResponse.json({ 
            success: true, 
            user: { 
              id: newUser.id, 
              email: newUser.email, 
              name: newUser.name 
            } 
          });
        } catch (error) {
          if (error instanceof Error && error.message === 'User already exists') {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
          }
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