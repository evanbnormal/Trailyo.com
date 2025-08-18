import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug analytics endpoint called');
    
    // Get all analytics events
    const allEvents = await db.trailAnalyticsEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    
    // Group events by type
    const eventsByType = await db.trailAnalyticsEvent.groupBy({
      by: ['eventType'],
      _count: {
        eventType: true
      }
    });
    
    // Get recent events by trail
    const eventsByTrail = await db.trailAnalyticsEvent.groupBy({
      by: ['trailId'],
      _count: {
        trailId: true
      },
      orderBy: {
        _count: {
          trailId: 'desc'
        }
      },
      take: 10
    });
    
    // Check for events in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentEvents = await db.trailAnalyticsEvent.findMany({
      where: {
        timestamp: {
          gte: yesterday
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        totalEvents: allEvents.length,
        eventsInLast24Hours: recentEvents.length,
        eventTypes: eventsByType,
        trailsWithEvents: eventsByTrail
      },
      recentEvents: allEvents.slice(0, 10).map(e => ({
        id: e.id,
        trailId: e.trailId,
        eventType: e.eventType,
        timestamp: e.timestamp,
        data: e.data
      })),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Debug analytics failed:', error);
    return NextResponse.json(
      { 
        error: 'Debug analytics failed', 
        details: error.message,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Debug analytics POST received:', body);
    
    const { trailId, eventType, action } = body;
    
    if (!trailId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create a test event
    const testEvent = await db.trailAnalyticsEvent.create({
      data: {
        trailId,
        eventType,
        data: action || {},
        timestamp: new Date(),
      },
    });
    
    console.log('✅ Debug test event created:', testEvent);
    
    return NextResponse.json({ 
      success: true, 
      event: testEvent,
      message: 'Test event created successfully'
    });
    
  } catch (error) {
    console.error('❌ Debug analytics POST failed:', error);
    return NextResponse.json(
      { error: 'Debug analytics POST failed', details: error.message },
      { status: 500 }
    );
  }
}

