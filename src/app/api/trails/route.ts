import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get specific trail with steps
      const trail = await db.trail.findUnique({
        where: { id: trailId },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      if (!trail) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }
      return NextResponse.json(trail);
    }

    // Return all published trails with steps
    const publishedTrails = await db.trail.findMany({
      where: { }, // Add isPublished: true if you have that field
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json(publishedTrails);
  } catch (error) {
    console.error('Error fetching trails:', error);
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
    const createdTrail = await db.trail.create({
      data: {
        title: trail.title,
        description: trail.description || '',
        creatorId: trail.creator_id || 'anonymous',
        // isPublished: type === 'published', // Uncomment if you have isPublished
        price: trail.price || null,
        steps: trail.steps && trail.steps.length > 0 ? {
          create: trail.steps.map((step: any, index: number) => ({
            title: step.title,
            content: step.content,
            order: index,
            // videoUrl: step.video_url || null, // Uncomment if you have videoUrl
            // skipCost: step.skip_cost || null // Uncomment if you have skipCost
          }))
        } : undefined,
      },
      include: { steps: true },
    });

    return NextResponse.json({ success: true, trail: createdTrail });
  } catch (error) {
    console.error('Error creating trail:', error);
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

    const updatedTrail = await db.trail.update({
      where: { id: trailId },
      data: updates,
      include: { steps: true },
    });

    return NextResponse.json({ success: true, trail: updatedTrail });
  } catch (error) {
    console.error('Error updating trail:', error);
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

    // Delete trail (steps will be deleted automatically due to CASCADE)
    await db.trail.delete({ where: { id: trailId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 