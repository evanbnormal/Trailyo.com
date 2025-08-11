import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing analytics endpoint...');
    
    // Test database connection
    const testEvent = await db.trailAnalyticsEvent.create({
      data: {
        trailId: 'test-trail-' + Date.now(),
        eventType: 'trail_view',
        data: { test: true, timestamp: Date.now() },
        timestamp: new Date(),
      },
    });
    
    console.log('✅ Test event created:', testEvent);
    
    // Get all events
    const allEvents = await db.trailAnalyticsEvent.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' }
    });
    
    console.log('📊 Total events in database:', allEvents.length);
    
    return NextResponse.json({
      success: true,
      testEvent,
      totalEvents: allEvents.length,
      recentEvents: allEvents.slice(0, 5).map(e => ({
        id: e.id,
        trailId: e.trailId,
        eventType: e.eventType,
        timestamp: e.timestamp
      }))
    });
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
    return NextResponse.json(
      { error: 'Analytics test failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test analytics POST received:', body);
    
    const { trailId, eventType, action } = body;
    
    if (!trailId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create test event
    const testEvent = await db.trailAnalyticsEvent.create({
      data: {
        trailId,
        eventType,
        data: action || {},
        timestamp: new Date(),
      },
    });
    
    console.log('✅ Test event created via POST:', testEvent);
    
    return NextResponse.json({ success: true, event: testEvent });
    
  } catch (error) {
    console.error('❌ Test analytics POST failed:', error);
    return NextResponse.json(
      { error: 'Test analytics POST failed', details: error.message },
      { status: 500 }
    );
  }
}
