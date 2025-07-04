import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get specific trail with steps
      const { data: trail, error: trailError } = await supabase
        .from('trails')
        .select(`
          *,
          steps:trail_steps(*)
        `)
        .eq('id', trailId)
        .single();

      if (trailError) {
        return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
      }

      return NextResponse.json(trail);
    }

    // Return all published trails
    const { data: trails, error } = await supabase
      .from('trails')
      .select(`
        *,
        steps:trail_steps(*)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch trails' }, { status: 500 });
    }

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

    // Insert trail
    const { data: newTrail, error: trailError } = await supabase
      .from('trails')
      .insert({
        title: trail.title,
        description: trail.description || '',
        creator_id: trail.creator_id || 'anonymous',
        is_published: type === 'published',
        price: trail.price || null
      })
      .select()
      .single();

    if (trailError) {
      return NextResponse.json({ error: 'Failed to create trail' }, { status: 500 });
    }

    // Insert steps if provided
    if (trail.steps && trail.steps.length > 0) {
      const stepsToInsert = trail.steps.map((step: any, index: number) => ({
        trail_id: newTrail.id,
        title: step.title,
        content: step.content,
        step_index: index,
        video_url: step.video_url || null,
        skip_cost: step.skip_cost || null
      }));

      const { error: stepsError } = await supabase
        .from('trail_steps')
        .insert(stepsToInsert);

      if (stepsError) {
        return NextResponse.json({ error: 'Failed to create trail steps' }, { status: 500 });
      }
    }

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

    const { data: updatedTrail, error } = await supabase
      .from('trails')
      .update(updates)
      .eq('id', trailId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update trail' }, { status: 500 });
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

    // Delete trail steps first (due to foreign key constraint)
    const { error: stepsError } = await supabase
      .from('trail_steps')
      .delete()
      .eq('trail_id', trailId);

    if (stepsError) {
      return NextResponse.json({ error: 'Failed to delete trail steps' }, { status: 500 });
    }

    // Delete trail
    const { error } = await supabase
      .from('trails')
      .delete()
      .eq('id', trailId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete trail' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 