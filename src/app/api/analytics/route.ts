import { NextRequest, NextResponse } from 'next/server';
import { analyticsService, calculateAnalytics, AnalyticsEvent } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get analytics for specific trail
      const events = await analyticsService.getEventsByTrailId(trailId);

      // Calculate analytics from events
      const analytics = calculateAnalytics(events, trailId);
      return NextResponse.json(analytics);
    }

    // Return all analytics
    const allEvents = await analyticsService.getAllEvents();

    // Group events by trail and calculate analytics
    const trailGroups = allEvents.reduce((acc: Record<string, unknown[]>, event) => {
      if (!acc[event.trail_id]) {
        acc[event.trail_id] = [];
      }
      acc[event.trail_id].push(event);
      return acc;
    }, {});

    const allAnalytics = Object.fromEntries(
      Object.entries(trailGroups).map(([trailId, events]) => [
        trailId,
        calculateAnalytics(events as AnalyticsEvent[], trailId)
      ])
    );

    return NextResponse.json(allAnalytics);
  } catch (error) {
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
    await analyticsService.recordEvent({
      trail_id: trailId,
      event_type: eventType,
      data: data || {}
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

 