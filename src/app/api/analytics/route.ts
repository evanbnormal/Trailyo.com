import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyticsEvents } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { calculateAnalytics } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get analytics for specific trail
      const events = await db.select().from(analyticsEvents).where(eq(analyticsEvents.trailId, trailId)).orderBy(analyticsEvents.createdAt);

      // Calculate analytics from events
      const analytics = calculateAnalytics(events as any[], trailId);
      return NextResponse.json(analytics);
    }

    // Return all analytics
    const allEvents = await db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.createdAt));

    // Group events by trail and calculate analytics
    const trailGroups = allEvents.reduce((acc: Record<string, unknown[]>, event) => {
      if (!acc[event.trailId]) {
        acc[event.trailId] = [];
      }
      acc[event.trailId].push(event);
      return acc;
    }, {});

    const allAnalytics = Object.fromEntries(
      Object.entries(trailGroups).map(([trailId, events]) => [
        trailId,
        calculateAnalytics(events as any[], trailId)
      ])
    );

    return NextResponse.json(allAnalytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trailId, eventType, data } = body;

    if (!trailId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Record the event
    await db.insert(analyticsEvents).values({
      trailId,
      eventType,
      data: data || {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording analytics event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

 