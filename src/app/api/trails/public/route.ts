import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (!trailId) {
      return NextResponse.json({ error: 'Trail ID is required' }, { status: 400 });
    }

    // Get specific published trail with steps and creator info
    const trail = await db.trail.findUnique({
      where: { 
        id: trailId,
        status: 'published' // Only allow access to published trails
      },
      include: { 
        steps: { orderBy: { order: 'asc' } },
        creator: { select: { id: true, name: true, email: true } }
      },
    });

    if (!trail) {
      return NextResponse.json({ error: 'Trail not found or not published' }, { status: 404 });
    }

    // Return trail data without any authentication requirements
    return NextResponse.json(trail);
  } catch (error) {
    console.error('Error fetching public trail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 