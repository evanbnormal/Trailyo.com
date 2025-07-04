import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    switch (action) {
      case 'login':
        if (!email || !password) {
          return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          return NextResponse.json({ error: signInError.message }, { status: 401 });
        }

        return NextResponse.json({ 
          success: true, 
          user: { 
            id: user?.id, 
            email: user?.email, 
            name: user?.user_metadata?.full_name 
          } 
        });

      case 'signup':
        if (!email || !password || !name) {
          return NextResponse.json({ error: 'Email, password, and name required' }, { status: 400 });
        }

        const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

        if (signUpError) {
          return NextResponse.json({ error: signUpError.message }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          user: { 
            id: newUser?.id, 
            email: newUser?.email, 
            name: newUser?.user_metadata?.full_name 
          } 
        });

      case 'logout':
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
          return NextResponse.json({ error: signOutError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.user_metadata?.full_name 
      } 
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
} 