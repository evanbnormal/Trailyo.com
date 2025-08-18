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
    console.log('📊 Sample events:', events.slice(0, 3).map(e => ({
      eventType: e.eventType,
      data: e.data,
      timestamp: e.timestamp
    })));

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
    const { trailId, eventType, action, resetTrailId } = body;

    console.log('📥 Analytics API received POST request');
    console.log('📥 Request body:', { trailId, eventType, action, resetTrailId });

    // Handle reset analytics
    if (resetTrailId) {
      console.log('🗑️ Resetting analytics for trail:', resetTrailId);
      
      // Delete all analytics events for this trail
      const deletedEvents = await db.trailAnalyticsEvent.deleteMany({
        where: { trailId: resetTrailId }
      });
      
      console.log('🗑️ Deleted analytics events:', deletedEvents);
      
      return NextResponse.json({ 
        success: true, 
        message: `Reset analytics for trail ${resetTrailId}`,
        deletedCount: deletedEvents.count 
      });
    }

    // Handle creating new analytics event
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
    console.log('📊 Event details:', {
      trailId,
      eventType,
      data: action,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true, event: storedEvent });
  } catch (error) {
    console.error('Error in analytics POST:', error);
    return NextResponse.json({ error: 'Failed to process analytics request' }, { status: 500 });
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
  const trailCompletions = events.filter(e => e.eventType === 'trail_complete');

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

  // 2. REVENUE CALCULATION - SEPARATE TIPS AND SKIP REVENUE
  const tipEvents = events.filter(e => e.eventType === 'tip_donated');
  const skipEvents = events.filter(e => e.eventType === 'step_skip');
  
  // Calculate total tips
  const totalTips = tipEvents.reduce((sum, event) => {
    return sum + ((event.data.tipAmount as number) || 0);
  }, 0);
  
  // Calculate total skip revenue
  const totalSkipRevenue = skipEvents.reduce((sum, event) => {
    return sum + ((event.data.skipAmount as number) || (event.data.skipCost as number) || 0);
  }, 0);
  
  // Total revenue is sum of tips and skip revenue
  const totalRevenue = totalTips + totalSkipRevenue;

  console.log('📊 Revenue breakdown:', {
    totalTips,
    totalSkipRevenue,
    totalRevenue,
    tipEventsCount: tipEvents.length,
    skipEventsCount: skipEvents.length
  });

  // Revenue by step - separate tips and skip revenue
  // Determine the number of steps based on the highest step index seen
  const revenueStepIndices = [...stepCompletions.map(e => (e.data.stepIndex as number) || 0), ...stepSkips.map(e => (e.data.stepIndex as number) || 0)];
  const maxRevenueStepIndex = revenueStepIndices.length > 0 ? Math.max(...revenueStepIndices) : 0;
  const numSteps = maxRevenueStepIndex + 1;
  
  const revenueByStep = trailViews[0]?.data?.trailTitle ? Array(numSteps).fill(0).map((_, index) => ({
    step: index,
    title: index === 0 ? 'Step 1' : index === 1 ? 'Reward' : `Step ${index + 1}`,
    skipRevenue: 0,
    tipRevenue: 0,
    revenue: 0
  })) : [];

  // Attribute skip revenue to steps
  skipEvents.forEach(event => {
    const stepIndex = (event.data.stepIndex as number) || 0;
    if (revenueByStep[stepIndex]) {
      const skipAmount = (event.data.skipAmount as number) || (event.data.skipCost as number) || 0;
      revenueByStep[stepIndex].skipRevenue += skipAmount;
      revenueByStep[stepIndex].revenue += skipAmount;
    }
  });

  // Attribute tip revenue to reward step (index 1)
  tipEvents.forEach(event => {
    if (revenueByStep[1]) {
      const tipAmount = (event.data.tipAmount as number) || 0;
      revenueByStep[1].tipRevenue += tipAmount;
      revenueByStep[1].revenue += tipAmount;
    }
  });

  // 3. WATCH TIME CALCULATION
  const totalWatchTime = videoWatches.reduce((sum, event) => {
    return sum + ((event.data.watchTime as number) || 0);
  }, 0);

  // 4. COMPLETION RATE
  // Count users who completed the trail through various methods
  const completedStepIndices = stepCompletions.map(e => (e.data.stepIndex as number) || 0);
  const skippedStepIndices = stepSkips.map(e => (e.data.stepIndex as number) || 0);
  const allStepIndices = [...completedStepIndices, ...skippedStepIndices];
  const maxStepIndex = allStepIndices.length > 0 ? Math.max(...allStepIndices) : -1;
  
  // Count unique users who reached the final step (either by completing or skipping)
  const usersWhoReachedFinalStep = new Set();
  
  // Add users who completed the final step
  stepCompletions.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    if (stepIndex === maxStepIndex) {
      const sessionId = event.data.sessionId as string;
      if (sessionId) usersWhoReachedFinalStep.add(sessionId);
    }
  });
  
  // Add users who skipped to the final step
  stepSkips.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    if (stepIndex === maxStepIndex) {
      const sessionId = event.data.sessionId as string;
      if (sessionId) usersWhoReachedFinalStep.add(sessionId);
    }
  });
  
  // Add users who completed the entire trail (trail_complete event)
  trailCompletions.forEach(event => {
    const sessionId = event.data.sessionId as string;
    if (sessionId) usersWhoReachedFinalStep.add(sessionId);
  });
  
  // Calculate completion rate based on unique users who reached the final step
  const completionRate = totalLearners > 0 ? (usersWhoReachedFinalStep.size / totalLearners) * 100 : 0;

  console.log('📊 Completion rate calculation:', {
    totalLearners,
    usersWhoReachedFinalStep: Array.from(usersWhoReachedFinalStep),
    trailCompletionsCount: trailCompletions.length,
    completionRate,
    maxStepIndex
  });

  // 5. RETENTION RATE (how many people reached each step)
  // Determine the number of steps based on the highest step index seen
  const retentionStepIndices = [...stepCompletions.map(e => (e.data.stepIndex as number) || 0), ...stepSkips.map(e => (e.data.stepIndex as number) || 0)];
  const maxRetentionStepIndex = retentionStepIndices.length > 0 ? Math.max(...retentionStepIndices) : 0;
  const stepReachCounts = new Array(maxRetentionStepIndex + 1).fill(0);
  
  // Track unique users per step to avoid double counting
  const stepUserSets = new Array(maxRetentionStepIndex + 1).fill(null).map(() => new Set<string>());
  
  // Count unique users who completed steps
  stepCompletions.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    const sessionId = event.data.sessionId as string;
    if (stepIndex >= 0 && stepIndex < stepReachCounts.length && sessionId) {
      stepUserSets[stepIndex].add(sessionId);
    }
  });

  // Count unique users who skipped to steps (including reward step)
  stepSkips.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    const sessionId = event.data.sessionId as string;
    if (stepIndex >= 0 && stepIndex < stepReachCounts.length && sessionId) {
      stepUserSets[stepIndex].add(sessionId);
    }
  });

  // Count unique users who tipped (indicates they reached the reward step - step 1)
  tipEvents.forEach(event => {
    const sessionId = event.data.sessionId as string;
    const rewardStepIndex = 1;
    if (rewardStepIndex < stepReachCounts.length && sessionId) {
      stepUserSets[rewardStepIndex].add(sessionId);
    }
  });

  // Convert sets to counts
  stepUserSets.forEach((userSet, index) => {
    stepReachCounts[index] = userSet.size;
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

  // Calculate daily completions (including trail completions and skips to final step)
  const dailyStepIndices = [...stepCompletions.map(e => (e.data.stepIndex as number) || 0), ...stepSkips.map(e => (e.data.stepIndex as number) || 0)];
  const dailyMaxStepIndex = dailyStepIndices.length > 0 ? Math.max(...dailyStepIndices) : -1;
  
  // Count step completions
  stepCompletions.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    if (stepIndex === dailyMaxStepIndex) { // Only count final step completions
      const date = event.timestamp;
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dailyCompletions.set(dayKey, (dailyCompletions.get(dayKey) || 0) + 1);
    }
  });
  
  // Count skips to final step
  stepSkips.forEach(event => {
    const stepIndex = event.data.stepIndex as number;
    if (stepIndex === dailyMaxStepIndex) { // Only count skips to final step
      const date = event.timestamp;
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dailyCompletions.set(dayKey, (dailyCompletions.get(dayKey) || 0) + 1);
    }
  });
  
  // Count trail completions
  trailCompletions.forEach(event => {
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

  // Calculate revenue by day - separate tips and skip revenue
  const sortedTipEvents = tipEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedSkipEvents = skipEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Calculate tips by day
  const tipsByDay = new Map<string, number>();
  sortedTipEvents.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const tipAmount = (event.data.tipAmount as number) || 0;
    tipsByDay.set(dayKey, (tipsByDay.get(dayKey) || 0) + tipAmount);
  });
  
  // Calculate skip revenue by day
  sortedSkipEvents.forEach(event => {
    const date = event.timestamp;
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const skipAmount = (event.data.skipAmount as number) || (event.data.skipCost as number) || 0;
    revenueByDay.set(dayKey, (revenueByDay.get(dayKey) || 0) + skipAmount);
  });
  const revenueByDayArray = Array.from(revenueByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Calculate tips over time
  const tipsOverTime = Array.from(tipsByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  return {
    trailId: events[0]?.trailId || '',
    totalLearners,
    totalRevenue,
    totalTips,
    totalSkipRevenue,
    totalWatchTime,
    completionRate,
    retentionRate,
    revenueByStep,
    completionRateByDay: completionRateByDay,
    watchTimeByDay: watchTimeByDayArray,
    learnersByDay: learnersByDayArray,
    revenueByDay: revenueByDayArray,
    tipsByDay: Array.from(tipsByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount })),
    tipsOverTime,
    events: events.map(event => ({
      trailId: event.trailId,
      eventType: event.eventType,
      data: event.data,
      timestamp: event.timestamp.getTime()
    }))
  };
}



 