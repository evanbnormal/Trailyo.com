import { NextRequest, NextResponse } from 'next/server';
import { trailService } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get specific trail
      const trail = await trailService.getTrailById(trailId);

      if (!trail) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      return NextResponse.json(trail);
    }

    // Return all published trails
    const trails = await trailService.getPublishedTrails();
    return NextResponse.json(trails || []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trail, type } = body;

    if (!trail || !trail.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create trail
    const newTrail = await trailService.createTrail({
      title: trail.title,
      description: trail.description || '',
      creator_id: trail.creator_id || 'anonymous',
      is_published: type === 'published',
      price: trail.price || null,
      steps: trail.steps || []
    });

    return NextResponse.json({ success: true, trail: newTrail });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { trailId, updates } = body;

    if (!trailId) {
      return NextResponse.json({ error: 'Missing trail ID' }, { status: 400 });
    }

    const updatedTrail = await trailService.updateTrail(trailId, updates);

    if (!updatedTrail) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trail: updatedTrail });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (!trailId) {
      return NextResponse.json({ error: 'Missing trail ID' }, { status: 400 });
    }

    const success = await trailService.deleteTrail(trailId);

    if (!success) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 