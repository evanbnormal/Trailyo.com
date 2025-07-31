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

    console.log('📝 Trail API POST called:', {
      trailId: trail?.id,
      title: trail?.title,
      status: trail?.status,
      type: type
    });

    console.log('📝 Full trail data received:', JSON.stringify(trail, null, 2));

    if (!trail || !trail.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if trail already exists (for updates)
    const existingTrail = await db.trail.findUnique({
      where: { id: trail.id },
      include: { steps: true }
    });

    let savedTrail;
    
    try {
      if (existingTrail) {
        // Update existing trail
        console.log(`Updating existing trail: ${trail.id}`);
        
        // Delete existing steps first
        if (existingTrail.steps.length > 0) {
          await db.trailStep.deleteMany({
            where: { trailId: trail.id }
          });
        }
        
        // Update trail with new data
        savedTrail = await db.trail.update({
        where: { id: trail.id },
        data: {
          title: trail.title,
          description: trail.description || '',
          thumbnailUrl: trail.thumbnailUrl || null,
          trailValue: trail.trailValue || null,
          suggestedInvestment: trail.suggestedInvestment || null,
          trailCurrency: trail.trailCurrency || 'USD',
          steps: trail.steps && trail.steps.length > 0 ? {
            create: trail.steps.map((step: any, index: number) => ({
              title: step.title,
              content: step.content,
              order: index,
              type: step.type || 'article',
              source: step.source || null,
            }))
          } : undefined,
        },
        include: { steps: true },
      });
    } else {
      // Create new trail
      console.log(`Creating new trail: ${trail.id}`);
      savedTrail = await db.trail.create({
        data: {
          id: trail.id, // Use the provided ID
          title: trail.title,
          description: trail.description || '',
          creatorId: trail.creator_id || trail.creatorId || 'anonymous',
          thumbnailUrl: trail.thumbnailUrl || null,
          trailValue: trail.trailValue || null,
          suggestedInvestment: trail.suggestedInvestment || null,
          trailCurrency: trail.trailCurrency || 'USD',
          steps: trail.steps && trail.steps.length > 0 ? {
            create: trail.steps.map((step: any, index: number) => ({
              title: step.title,
              content: step.content,
              order: index,
              type: step.type || 'article',
              source: step.source || null,
            }))
          } : undefined,
        },
        include: { steps: true },
      });
    }
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      console.error('❌ Trail data that failed:', JSON.stringify(trail, null, 2));
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✅ Trail saved successfully:', {
      id: savedTrail.id,
      title: savedTrail.title,
      status: savedTrail.status,
      creatorId: savedTrail.creatorId
    });

    return NextResponse.json({ success: true, trail: savedTrail });
  } catch (error) {
    console.error('Error creating trail:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
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