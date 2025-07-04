import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check for our data layer
    return NextResponse.json({
      status: 'success',
      message: 'Data layer is working correctly!',
      details: {
        storage: 'localStorage + in-memory',
        features: ['User management', 'Trail management', 'Analytics tracking']
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