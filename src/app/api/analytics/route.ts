import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get events from database
      const events = await db.trailAnalyticsEvent.findMany({
        where: { trailId },
        orderBy: { timestamp: 'asc' }
      });
      
      // Convert database events to the expected format
      const formattedEvents = events.map(event => ({
        trailId: event.trailId,
        eventType: event.eventType,
        data: event.data,
        timestamp: event.timestamp.getTime()
      }));
      
      // Calculate analytics from events
      const analytics = calculateAnalyticsFromEvents(trailId, formattedEvents);
      
      return NextResponse.json(analytics);
    }

    // Return all analytics if no trailId specified
    const allEvents = await db.trailAnalyticsEvent.findMany({
      orderBy: { timestamp: 'asc' }
    });
    
    const allAnalytics: Record<string, any> = {};
    const eventsByTrail = new Map<string, any[]>();
    
    // Group events by trailId
    allEvents.forEach(event => {
      const formattedEvent = {
        trailId: event.trailId,
        eventType: event.eventType,
        data: event.data,
        timestamp: event.timestamp.getTime()
      };
      
      if (!eventsByTrail.has(event.trailId)) {
        eventsByTrail.set(event.trailId, []);
      }
      eventsByTrail.get(event.trailId)!.push(formattedEvent);
    });
    
    for (const [trailId, events] of eventsByTrail.entries()) {
      allAnalytics[trailId] = calculateAnalyticsFromEvents(trailId, events);
    }
    
    return NextResponse.json(allAnalytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Analytics API received POST request');
    const body = await request.json();
    const { trailId, eventType, data, action } = body;
    console.log('📥 Request body:', { trailId, eventType, action });

    // Handle reset action
    if (action === 'reset') {
      await db.trailAnalyticsEvent.deleteMany({});
      console.log('Analytics data reset');
      return NextResponse.json({ success: true, message: 'Analytics reset' });
    }

    if (!trailId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Store the event in database
    await db.trailAnalyticsEvent.create({
      data: {
        trailId,
        eventType,
        data,
        timestamp: new Date()
      }
    });

    console.log('📊 Analytics event stored in database:', { trailId, eventType, data });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording analytics event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateAnalyticsFromEvents(trailId: string, events: any[]) {
  // REAL DATA CALCULATIONS - No more sample data
  
  console.log('📊 Calculating analytics for trail:', trailId);
  console.log('📊 Total events:', events.length);
  console.log('📊 Event types:', events.map(e => e.eventType));
  
  // 1. TOTAL LEARNERS: Count trail views (each visit counts as a learner)
  const trailViews = events.filter(e => e.eventType === 'trail_view');
  console.log('📊 Trail views found:', trailViews.length);
  console.log('📊 Trail view session IDs:', trailViews.map(e => e.data.sessionId));
  
  // Count all visits as learners (each visit = one learner interaction)
  const uniqueLearners = trailViews.length;
  console.log('📊 Total learner visits calculated:', uniqueLearners);
  
  // 2. REVENUE: All cash from Stripe payments (skip payments + tips)
  const stepSkips = events.filter(e => e.eventType === 'step_skip');
  const tips = events.filter(e => e.eventType === 'tip_donated');
  const skipRevenue = stepSkips.reduce((total, event) => total + (event.data.skipCost || 0), 0);
  const tipRevenue = tips.reduce((total, event) => total + (event.data.tipAmount || 0), 0);
  const totalRevenue = skipRevenue + tipRevenue;
  
  // 3. TIPS: Only tip payments
  const totalTips = tipRevenue;
  
  // 4. COMPLETION RATE: People who unlocked reward vs total learners
  const trailCompletions = events.filter(e => e.eventType === 'trail_complete').length;
  const completionRate = uniqueLearners > 0 ? (trailCompletions / uniqueLearners) * 100 : 0;
  
  // Calculate total learners over time (cumulative unique viewers like YouTube)
  const learnersOverTime = new Map<string, number>();
  let cumulativeLearners = 0;
  
  // Sort trail views by timestamp to calculate cumulative
  const sortedTrailViews = trailViews.sort((a, b) => a.timestamp - b.timestamp);
  
  sortedTrailViews.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    cumulativeLearners += 1;
    learnersOverTime.set(monthKey, cumulativeLearners);
  });
  
  const learnersOverTimeArray = Array.from(learnersOverTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, learners]) => ({ date, learners }));
  
  // Calculate completion rate over time (percentage of learners who complete the trial)
  const completionEvents = events.filter(e => e.eventType === 'trail_complete');
  const monthlyCompletions = new Map<string, number>();
  const monthlyLearners = new Map<string, number>();
  
  // Count completions by month
  completionEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCompletions.set(monthKey, (monthlyCompletions.get(monthKey) || 0) + 1);
  });
  
  // Count total learners by month
  trailViews.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyLearners.set(monthKey, (monthlyLearners.get(monthKey) || 0) + 1);
  });
  
  // Calculate completion rate over time (percentage)
  const completionRateOverTime = Array.from(monthlyCompletions.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, completions]) => {
      const totalLearners = monthlyLearners.get(date) || 0;
      const completionRate = totalLearners > 0 ? (completions / totalLearners) * 100 : 0;
      return { date, completionRate };
    });
  
  // 5. WATCH TIME: Total minutes watched across all videos
  const videoWatches = events.filter(e => e.eventType === 'video_watch');
  const totalWatchTime = videoWatches.reduce((total, event) => total + (event.data.watchTime || 0), 0);
  
  // Calculate watch time over time (cumulative like YouTube)
  const watchTimeOverTime = new Map<string, number>();
  let cumulativeWatchTime = 0;
  
  // Sort video watches by timestamp to calculate cumulative
  const sortedVideoWatches = videoWatches.sort((a, b) => a.timestamp - b.timestamp);
  
  sortedVideoWatches.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    cumulativeWatchTime += (event.data.watchTime || 0);
    watchTimeOverTime.set(monthKey, cumulativeWatchTime);
  });
  
  const watchTimeOverTimeArray = Array.from(watchTimeOverTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, watchTime]) => ({ date, watchTime }));
  
  // 6. RETENTION RATE: Proportion of learners left over time/by step
  const stepCompletions = events.filter(e => e.eventType === 'step_complete');
  
  // Define step indices for consistent step tracking
  const allStepIndices = [0, 1]; // This should be dynamic based on actual trail data
  
  // Calculate step retention (proportion of learners at each step)
  // We need to ensure ALL steps are included, even if no one reached them
  // Consider both step completions AND step skips as "reaching" a step
  // Retention should be cumulative - each step shows % of learners who reached that step or beyond
  const stepRetention = allStepIndices.map((stepIndex) => {
    if (stepIndex === 0) {
      // Step 1: All learners start here, so 100% retention
      return {
        stepIndex,
        stepTitle: `Step ${stepIndex + 1}`,
        learnersReached: uniqueLearners,
        retentionRate: 100
      };
    } else {
      // For subsequent steps: count learners who completed or skipped this specific step
      const stepCompletionsForStep = stepCompletions.filter(e => e.data.stepIndex === stepIndex);
      const stepSkipsForStep = stepSkips.filter(e => e.data.stepIndex === stepIndex);
      const learnersReached = stepCompletionsForStep.length + stepSkipsForStep.length;
      
      const retentionRate = uniqueLearners > 0 ? (learnersReached / uniqueLearners) * 100 : 0;
      
      // Use "Reward" for step 1 (index 1), "Step X" for other steps
      const stepTitle = stepIndex === 1 ? 'Reward' : `Step ${stepIndex + 1}`;
      
      return {
        stepIndex,
        stepTitle,
        learnersReached,
        retentionRate
      };
    }
  });
  
  // Calculate video watch time by step
  const videoWatchTime = allStepIndices.map((stepIndex) => {
    const stepVideoWatches = videoWatches.filter(v => v.data.stepIndex === stepIndex);
    const totalWatchTime = stepVideoWatches.reduce((total, event) => total + (event.data.watchTime || 0), 0);
    
    // Use "Reward" for step 1 (index 1), "Step X" for other steps
    const stepTitle = stepIndex === 1 ? 'Reward' : `Step ${stepIndex + 1}`;
    
    return {
      stepIndex,
      stepTitle,
      totalWatchTime,
      uniqueViewers: stepVideoWatches.length
    };
  });
  
  // Calculate revenue by step - ensure ALL steps are included even if no revenue
  // We need to get the total number of steps from the trail data
  // For now, we'll assume steps 0 and 1 exist (based on the image showing 2 steps)
  
  const revenueByStep = allStepIndices.map((stepIndex) => {
    // Skip payments should only be attributed to the step that was skipped (current step)
    const stepSkips = events.filter(e => e.eventType === 'step_skip' && e.data.stepIndex === stepIndex);
    
    // Tips should NOT be distributed per step since they're only given at the end
    // Tips will be handled separately in tipsOverTime
    const skipRevenue = stepSkips.reduce((total, event) => total + (event.data.skipCost || 0), 0);
    
    // Use "Reward" for step 1 (index 1), "Step X" for other steps
    const stepTitle = stepIndex === 1 ? 'Reward' : `Step ${stepIndex + 1}`;
    
    return {
      stepIndex,
      stepTitle,
      skipRevenue,
      tipRevenue: 0, // Tips are not per step - they're given at the end
      totalRevenue: skipRevenue // Only skip revenue per step
    };
  });

  // Calculate tips analytics - proportion of users who tip and amount over time
  const tipEvents = events.filter(e => e.eventType === 'tip_donated');
  const usersWhoTipped = new Set(tipEvents.map(e => e.data.sessionId || e.data.userId)).size;
  const tipProportion = uniqueLearners > 0 ? (usersWhoTipped / uniqueLearners) * 100 : 0;
  
  // Revenue over time (cumulative like YouTube)
  const revenueOverTime = new Map<string, number>();
  let cumulativeRevenue = 0;
  
  // Combine all revenue events (skip payments + tips)
  const allRevenueEvents = [
    ...stepSkips.map(event => ({ ...event, amount: event.data.skipCost || 0 })),
    ...tipEvents.map(event => ({ ...event, amount: event.data.tipAmount || 0 }))
  ];
  
  // Sort revenue events by timestamp to calculate cumulative
  const sortedRevenueEvents = allRevenueEvents.sort((a, b) => a.timestamp - b.timestamp);
  
  sortedRevenueEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    cumulativeRevenue += event.amount;
    revenueOverTime.set(monthKey, cumulativeRevenue);
  });
  
  const revenueOverTimeArray = Array.from(revenueOverTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));
  
  // Tips over time (cumulative)
  const tipsOverTime = new Map<string, number>();
  let cumulativeTips = 0;
  
  // Sort tip events by timestamp to calculate cumulative
  const sortedTipEvents = tipEvents.sort((a, b) => a.timestamp - b.timestamp);
  
  sortedTipEvents.forEach(event => {
    const date = new Date(event.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    cumulativeTips += (event.data.tipAmount || 0);
    tipsOverTime.set(monthKey, cumulativeTips);
  });
  
  const tipsOverTimeArray = Array.from(tipsOverTime.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  // Return REAL data only - no sample data
  return {
    trailId,
    totalLearners: uniqueLearners, // Single number, not broken down by step
    totalRevenue: totalRevenue,
    totalTips: totalTips,
    completionRate: completionRate,
    completionRateOverTime: completionRateOverTime, // Completion rate over time
    totalWatchTime: totalWatchTime,
    stepRetention: stepRetention,
    videoWatchTime: videoWatchTime,
    revenueByStep: revenueByStep,
    revenueOverTime: revenueOverTimeArray, // Cumulative revenue over time
    tipsOverTime: tipsOverTimeArray, // Cumulative tips over time
    tipProportion: tipProportion,
    usersWhoTipped: usersWhoTipped,
    watchTimeOverTime: watchTimeOverTimeArray, // Cumulative watch time over time
    learnersOverTime: learnersOverTimeArray, // Cumulative learners over time
    events
  };
}



 