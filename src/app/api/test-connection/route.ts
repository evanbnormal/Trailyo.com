import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Check if we can connect to Supabase
    const { data, error } = await supabase
      .from('trails')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Supabase',
        error: error.message,
        details: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, { status: 500 });
    }

    // Test 2: Check if tables exist by trying to get trail count
    const { count, error: countError } = await supabase
      .from('trails')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({
        status: 'partial',
        message: 'Connected to Supabase but tables may not exist',
        error: countError.message,
        suggestion: 'Run the database migration in Supabase SQL Editor'
      }, { status: 200 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to Supabase!',
      details: {
        projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        trailsCount: count || 0,
        tablesExist: true
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error testing connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 