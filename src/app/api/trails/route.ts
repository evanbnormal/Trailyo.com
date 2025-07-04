import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trails, trailSteps } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get specific trail with steps
      const trailResults = await db.select().from(trails).where(eq(trails.id, trailId));
      const trail = trailResults[0];

      if (!trail) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      // Get steps for this trail
      const steps = await db.select().from(trailSteps).where(eq(trailSteps.trailId, trailId)).orderBy(trailSteps.stepIndex);

      return NextResponse.json({
        ...trail,
        steps
      });
    }

    // Return all published trails
    const publishedTrails = await db.select().from(trails).where(eq(trails.isPublished, true)).orderBy(desc(trails.createdAt));

    // Get steps for all trails
    const allTrailsWithSteps = await Promise.all(
      publishedTrails.map(async (trail) => {
        const steps = await db.select().from(trailSteps).where(eq(trailSteps.trailId, trail.id)).orderBy(trailSteps.stepIndex);
        return {
          ...trail,
          steps
        };
      })
    );

    return NextResponse.json(allTrailsWithSteps);
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
    const newTrail = await db.insert(trails).values({
      title: trail.title,
      description: trail.description || '',
      creatorId: trail.creator_id || 'anonymous',
      isPublished: type === 'published',
      price: trail.price || null,
    }).returning();

    const createdTrail = newTrail[0];

    // Create steps if provided
    if (trail.steps && trail.steps.length > 0) {
      const stepsToInsert = trail.steps.map((step: any, index: number) => ({
        trailId: createdTrail.id,
        title: step.title,
        content: step.content,
        stepIndex: index,
        videoUrl: step.video_url || null,
        skipCost: step.skip_cost || null
      }));

      await db.insert(trailSteps).values(stepsToInsert);
    }

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

    const updatedTrail = await db.update(trails).set(updates).where(eq(trails.id, trailId)).returning();

    if (!updatedTrail.length) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trail: updatedTrail[0] });
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
    const deletedTrail = await db.delete(trails).where(eq(trails.id, trailId)).returning();

    if (!deletedTrail.length) {
      return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 