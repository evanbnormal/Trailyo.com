import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (!trailId) {
      return NextResponse.json({ error: 'Trail ID is required' }, { status: 400 });
    }

    console.log('📊 Calculating analytics for trail:', trailId);

    // Get all events for this trail
    const events = await db.trailAnalyticsEvent.findMany({
      where: { trailId },
      orderBy: { timestamp: 'asc' },
    });

    console.log('📊 Total events:', events.length);
    console.log('📊 Event types:', events.map(e => e.eventType));

    if (events.length === 0) {
      return NextResponse.json({
        totalLearners: 0,
        totalRevenue: 0,
        totalWatchTime: 0,
        completionRate: 0,
        retentionRate: 0,
        revenueByStep: [],
        events: []
      });
    }

    // Calculate analytics from events
    const analytics = calculateAnalyticsFromEvents(events.map(event => ({
      trailId: event.trailId,
      eventType: event.eventType,
      data: event.data as Record<string, unknown>,
      timestamp: event.timestamp
    })));

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return NextResponse.json({ error: 'Failed to calculate analytics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trailId, eventType, action } = body;

    console.log('📥 Analytics API received POST request');
    console.log('📥 Request body:', { trailId, eventType, action });

    if (!trailId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create analytics event
    const analyticsEvent = {
      trailId,
      eventType,
      data: action || {},
      timestamp: new Date(),
    };

    // Store in database
    const storedEvent = await db.trailAnalyticsEvent.create({
      data: analyticsEvent,
    });

    console.log('📊 Analytics event stored in database:', storedEvent);

    return NextResponse.json({ success: true, event: storedEvent });
  } catch (error) {
    console.error('Error storing analytics event:', error);
    return NextResponse.json({ error: 'Failed to store analytics event' }, { status: 500 });
  }
}

function calculateAnalyticsFromEvents(events: Array<{
  trailId: string;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: Date;
}>) {
  // 1. TOTAL LEARNERS: Count unique active learners (people who take action)
  const trailViews = events.filter(e => e.eventType === 'trail_view');
  const videoWatches = events.filter(e => e.eventType === 'video_watch');
  const stepSkips = events.filter(e => e.eventType === 'step_skip');
  const tips = events.filter(e => e.eventType === 'tip_donated');
  const stepCompletions = events.filter(e => e.eventType === 'step_complete');

  const activeSessionIds = new Set();
  trailViews.forEach(trailView => {
    const sessionId = trailView.data.sessionId as string;
    if (sessionId) {
      const hasActions = videoWatches.some(e => e.data.sessionId === sessionId) ||
                       stepSkips.some(e => e.data.sessionId === sessionId) ||
                       tips.some(e => e.data.sessionId === sessionId) ||
                       stepCompletions.some(e => e.data.sessionId === sessionId);
      if (hasActions) {
        activeSessionIds.add(sessionId);
      }
    }
  });
  if (videoWatches.length > 0 || stepSkips.length > 0 || tips.length > 0 || stepCompletions.length > 0) {
    activeSessionIds.add('active_learner');
  }
  const totalLearners = activeSessionIds.size;

  console.log('📊 Trail views found:', trailViews.length);
  console.log('📊 Active session IDs:', Array.from(activeSessionIds));
  console.log('📊 Total active learners calculated:', totalLearners);

  // 2. REVENUE CALCULATION
  const revenueEvents = events.filter(e => e.eventType === 'tip_donated' || e.eventType === 'step_skip');
  const totalRevenue = revenueEvents.reduce((sum, event) => {
    if (event.eventType === 'tip_donated') {
      return sum + ((event.data.tipAmount as number) || 0);
    } else if (event.eventType === 'step_skip') {
      return sum + ((event.data.skipAmount as number) || 0);
    }
    return sum;
  }, 0);

  // Revenue by step
  const revenueByStep = trailViews[0]?.data?.trailTitle ? Array(3).fill(0).map((_, index) => ({
    step: index,
    title: index === 0 ? 'Step 1' : index === 1 ? 'Reward' : 'Step 2',
    revenue: 0
  })) : [];

  // Attribute revenue to steps
  revenueEvents.forEach(event => {
    if (event.eventType === 'tip_donated') {
      // Tips go to the reward step (index 1)
      if (revenueByStep[1]) {
        revenueByStep[1].revenue += (event.data.tipAmount as number) || 0;
      }
    } else if (event.eventType === 'step_skip') {
      // Skip payments go to the skipped step
      const stepIndex = (event.data.stepIndex as number) || 0;
      if (revenueByStep[stepIndex]) {
        revenueByStep[stepIndex].revenue += (event.data.skipAmount as number) || 0;
      }
    }
  });

  // 3. WATCH TIME CALCULATION
  const totalWatchTime = videoWatches.reduce((sum, event) => {
    return sum + ((event.data.watchTime as number) || 0);
  }, 0);

  // 4. COMPLETION RATE
  const finalStepCompletions = stepCompletions.filter(e => (e.data.stepIndex as number) === 2); // Assuming 3 steps (0, 1, 2)
  const completionRate = totalLearners > 0 ? (finalStepCompletions.length / totalLearners) * 100 : 0;

  // 5. RETENTION RATE (how many people reached each step)
  const stepReachCounts = [0, 0, 0]; // For 3 steps
  stepCompletions.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    if (stepIndex >= 0 && stepIndex < stepReachCounts.length) {
      stepReachCounts[stepIndex]++;
    }
  });

  const retentionRate = stepReachCounts.map((count, index) => ({
    step: index,
    learnersReached: count,
    retentionRate: totalLearners > 0 ? (count / totalLearners) * 100 : 0
  }));

  // 6. DAILY AGGREGATION
  const dailyCompletions = new Map<string, number>();
  const dailyLearners = new Map<string, number>();
  const watchTimeByDay = new Map<string, number>();
  const revenueByDay = new Map<string, number>();

  // Sort events by timestamp
  const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedVideoWatches = videoWatches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedRevenueEvents = revenueEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate daily completions
  stepCompletions.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailyCompletions.set(dayKey, (dailyCompletions.get(dayKey) || 0) + 1);
  });

  // Calculate daily learners (unique session IDs per day)
  const learnersByDay = new Map<string, Set<string>>();
  trailViews.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!learnersByDay.has(dayKey)) {
      learnersByDay.set(dayKey, new Set());
    }
    const sessionId = (event.data.sessionId as string) || 'anonymous';
    learnersByDay.get(dayKey)?.add(sessionId);
  });

  const learnersByDayArray = Array.from(learnersByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessionIds]) => ({ date, learners: sessionIds.size }));

  // Calculate completion rate by day
  const completionRateByDay = Array.from(dailyCompletions.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, completions]) => {
      const totalLearners = dailyLearners.get(date) || 0;
      const completionRate = totalLearners > 0 ? (completions / totalLearners) * 100 : 0;
      return { date, completionRate };
    });

  // Calculate watch time by day
  sortedVideoWatches.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    watchTimeByDay.set(dayKey, (watchTimeByDay.get(dayKey) || 0) + ((event.data.watchTime as number) || 0));
  });
  const watchTimeByDayArray = Array.from(watchTimeByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, watchTime]) => ({ date, watchTime }));

  // Calculate revenue by day
  sortedRevenueEvents.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const amount = event.eventType === 'tip_donated' ? 
      ((event.data.tipAmount as number) || 0) : 
      ((event.data.skipAmount as number) || 0);
    revenueByDay.set(dayKey, (revenueByDay.get(dayKey) || 0) + amount);
  });
  const revenueByDayArray = Array.from(revenueByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  return {
    totalLearners,
    totalRevenue,
    totalWatchTime,
    completionRate,
    retentionRate,
    revenueByStep,
    completionRateByDay: completionRateByDay,
    watchTimeByDay: watchTimeByDayArray,
    learnersByDay: learnersByDayArray,
    revenueByDay: revenueByDayArray,
    events
  };
}



 