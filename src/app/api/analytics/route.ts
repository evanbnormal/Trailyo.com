import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (trailId) {
      // Get analytics for specific trail
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('trail_id', trailId)
        .order('created_at', { ascending: true });

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
      }

      // Calculate analytics from events
      const analytics = calculateAnalytics(events || [], trailId);
      return NextResponse.json(analytics);
    }

    // Return all analytics
    const { data: allEvents, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Group events by trail and calculate analytics
    const trailGroups = (allEvents || []).reduce((acc: any, event) => {
      if (!acc[event.trail_id]) {
        acc[event.trail_id] = [];
      }
      acc[event.trail_id].push(event);
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
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        trail_id: trailId,
        event_type: eventType,
        data: data || {}
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate analytics from events
function calculateAnalytics(events: any[], trailId: string) {
  const analytics = {
    trailId,
    totalLearners: 0,
    totalRevenue: 0,
    totalTips: 0,
    completionRate: 0,
    totalWatchTime: 0,
    stepRetention: [] as any[],
    videoWatchTime: [] as any[],
    revenueByStep: [] as any[],
    events
  };

  const uniqueLearners = new Set();
  const stepCompletions = new Map();
  const stepSkips = new Map();
  const stepTips = new Map();
  const stepWatchTime = new Map();

  events.forEach(event => {
    switch (event.event_type) {
      case 'trail_view':
        uniqueLearners.add(event.user_id || 'anonymous');
        break;
      case 'step_complete':
        uniqueLearners.add(event.user_id || 'anonymous');
        const { stepIndex, stepTitle } = event.data;
        if (!stepCompletions.has(stepIndex)) {
          stepCompletions.set(stepIndex, { stepIndex, stepTitle, count: 0 });
        }
        stepCompletions.get(stepIndex).count++;
        break;
      case 'step_skip':
        const { skipCost } = event.data;
        analytics.totalRevenue += skipCost || 0;
        const skipStepIndex = event.data.stepIndex;
        if (!stepSkips.has(skipStepIndex)) {
          stepSkips.set(skipStepIndex, { stepIndex: skipStepIndex, revenue: 0 });
        }
        stepSkips.get(skipStepIndex).revenue += skipCost || 0;
        break;
      case 'tip_donated':
        const { tipAmount } = event.data;
        analytics.totalTips += tipAmount || 0;
        analytics.totalRevenue += tipAmount || 0;
        break;
      case 'video_watch':
        const { watchTime } = event.data;
        analytics.totalWatchTime += watchTime || 0;
        const watchStepIndex = event.data.stepIndex;
        if (!stepWatchTime.has(watchStepIndex)) {
          stepWatchTime.set(watchStepIndex, { stepIndex: watchStepIndex, totalTime: 0, viewers: new Set() });
        }
        const watchData = stepWatchTime.get(watchStepIndex);
        watchData.totalTime += watchTime || 0;
        watchData.viewers.add(event.user_id || 'anonymous');
        break;
    }
  });

  analytics.totalLearners = uniqueLearners.size;
  
  // Calculate completion rate
  const completedEvents = events.filter(e => e.event_type === 'trail_complete').length;
  analytics.completionRate = analytics.totalLearners > 0 ? Math.round((completedEvents / analytics.totalLearners) * 100) : 0;

  // Convert maps to arrays
  analytics.stepRetention = Array.from(stepCompletions.values()).map(step => ({
    ...step,
    retentionRate: analytics.totalLearners > 0 ? Math.round((step.count / analytics.totalLearners) * 100) : 0
  }));

  analytics.revenueByStep = Array.from(stepSkips.values());

  analytics.videoWatchTime = Array.from(stepWatchTime.values()).map(step => ({
    stepIndex: step.stepIndex,
    totalWatchTime: step.totalTime,
    uniqueViewers: step.viewers.size
  }));

  return analytics;
} 