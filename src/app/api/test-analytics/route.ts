import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing analytics endpoint...');
    console.log('🧪 Environment check:', {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      baseUrl: process.env.BASE_URL || 'Not set',
      timestamp: new Date().toISOString()
    });
    
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
    
    // Get events by type
    const eventsByType = await db.trailAnalyticsEvent.groupBy({
      by: ['eventType'],
      _count: {
        eventType: true
      }
    });
    
    console.log('📊 Events by type:', eventsByType);
    
    return NextResponse.json({
      success: true,
      testEvent,
      totalEvents: allEvents.length,
      eventsByType,
      recentEvents: allEvents.slice(0, 5).map(e => ({
        id: e.id,
        trailId: e.trailId,
        eventType: e.eventType,
        timestamp: e.timestamp
      })),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        baseUrl: process.env.BASE_URL || 'Not set'
      }
    });
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
    return NextResponse.json(
      { 
        error: 'Analytics test failed', 
        details: error.message,
        stack: error.stack,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
          baseUrl: process.env.BASE_URL || 'Not set'
        }
      },
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

// New comprehensive test endpoint
export async function PUT(request: NextRequest) {
  try {
    console.log('🧪 Creating comprehensive analytics test...');
    
    const testTrailId = 'test-trail-comprehensive-' + Date.now();
    const sessionId1 = `session_${Date.now()}_user1`;
    const sessionId2 = `session_${Date.now()}_user2`;
    
    // Create comprehensive test data
    const testEvents = [
      // User 1: Views trail, completes step 0, skips to step 1, tips, completes trail
      {
        trailId: testTrailId,
        eventType: 'trail_view',
        data: { trailTitle: 'Test Trail', sessionId: sessionId1, timestamp: Date.now() },
        timestamp: new Date(Date.now() - 60000) // 1 minute ago
      },
      {
        trailId: testTrailId,
        eventType: 'step_complete',
        data: { stepIndex: 0, stepTitle: 'Step 1', sessionId: sessionId1 },
        timestamp: new Date(Date.now() - 50000) // 50 seconds ago
      },
      {
        trailId: testTrailId,
        eventType: 'step_skip',
        data: { stepIndex: 1, stepTitle: 'Reward', skipCost: 5, sessionId: sessionId1 },
        timestamp: new Date(Date.now() - 40000) // 40 seconds ago
      },
      {
        trailId: testTrailId,
        eventType: 'tip_donated',
        data: { tipAmount: 10, sessionId: sessionId1 },
        timestamp: new Date(Date.now() - 30000) // 30 seconds ago
      },
      {
        trailId: testTrailId,
        eventType: 'trail_complete',
        data: { sessionId: sessionId1 },
        timestamp: new Date(Date.now() - 20000) // 20 seconds ago
      },
      
      // User 2: Views trail, completes step 0, skips to step 2 (final step)
      {
        trailId: testTrailId,
        eventType: 'trail_view',
        data: { trailTitle: 'Test Trail', sessionId: sessionId2, timestamp: Date.now() },
        timestamp: new Date(Date.now() - 55000) // 55 seconds ago
      },
      {
        trailId: testTrailId,
        eventType: 'step_complete',
        data: { stepIndex: 0, stepTitle: 'Step 1', sessionId: sessionId2 },
        timestamp: new Date(Date.now() - 45000) // 45 seconds ago
      },
      {
        trailId: testTrailId,
        eventType: 'step_skip',
        data: { stepIndex: 2, stepTitle: 'Step 3', skipCost: 10, sessionId: sessionId2 },
        timestamp: new Date(Date.now() - 35000) // 35 seconds ago
      }
    ];
    
    // Insert all test events
    const createdEvents = [];
    for (const event of testEvents) {
      const createdEvent = await db.trailAnalyticsEvent.create({
        data: event
      });
      createdEvents.push(createdEvent);
    }
    
    console.log('✅ Created comprehensive test events:', createdEvents.length);
    
    // Test the analytics calculation
    const analyticsResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/analytics?trailId=${testTrailId}`);
    const analyticsData = await analyticsResponse.json();
    
    console.log('📊 Analytics calculation result:', analyticsData);
    
    return NextResponse.json({
      success: true,
      testTrailId,
      createdEvents: createdEvents.length,
      analytics: analyticsData,
      expectedResults: {
        totalLearners: 2,
        completionRate: 100, // Both users reached final step
        retentionRate: [
          { step: 0, learnersReached: 2, retentionRate: 100 }, // Both completed step 0
          { step: 1, learnersReached: 1, retentionRate: 50 },  // User 1 reached step 1
          { step: 2, learnersReached: 1, retentionRate: 50 }   // User 2 reached step 2
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    return NextResponse.json(
      { error: 'Comprehensive test failed', details: error.message },
      { status: 500 }
    );
  }
}
