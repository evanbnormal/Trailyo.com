// Analytics tracking service for real user behavior

export interface AnalyticsEvent {
  trailId: string;
  eventType: 'trail_view' | 'step_complete' | 'step_skip' | 'tip_donated' | 'trail_complete' | 'video_watch';
  timestamp: number;
  data: any;
}

export interface TrailAnalytics {
  trailId: string;
  totalLearners: number; // Total visits/interactions (each visit counts as a learner)
  totalRevenue: number;
  totalTips: number;
  completionRate: number;
  completionRateOverTime: Array<{ date: string; completionRate: number }>;
  totalWatchTime: number; // in minutes
  stepRetention: Array<{
    stepIndex: number;
    stepTitle: string;
    learnersReached: number;
    retentionRate: number;
  }>;
  videoWatchTime: Array<{
    stepIndex: number;
    stepTitle: string;
    totalWatchTime: number;
    uniqueViewers: number;
  }>;
  revenueByStep: Array<{
    stepIndex: number;
    stepTitle: string;
    skipRevenue: number;
    tipRevenue: number;
  }>;
  revenueOverTime: Array<{ date: string; revenue: number }>;
  tipsOverTime: Array<{ date: string; amount: number }>;
  tipProportion: number;
  usersWhoTipped: number;
  watchTimeOverTime: Array<{ date: string; watchTime: number }>;
  learnersOverTime: Array<{ date: string; learners: number }>;
  events: AnalyticsEvent[];
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private analyticsData: Map<string, TrailAnalytics> = new Map();

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Track when someone views a trail
  async trackTrailView(trailId: string, trailTitle: string): Promise<void> {
    // Generate a unique session ID that includes timestamp to ensure uniqueness
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔍 Tracking trail view:', { trailId, trailTitle, sessionId });
    await this.recordEvent(trailId, 'trail_view', { 
      trailTitle,
      timestamp: Date.now(),
      sessionId: sessionId // Generate unique session ID for each visit
    });
  }

  // Track when someone completes a step
  async trackStepComplete(trailId: string, stepIndex: number, stepTitle: string): Promise<void> {
    await this.recordEvent(trailId, 'step_complete', { stepIndex, stepTitle });
  }

  // Track when someone skips a step (revenue)
  async trackStepSkip(trailId: string, stepIndex: number, stepTitle: string, skipCost: number): Promise<void> {
    await this.recordEvent(trailId, 'step_skip', { stepIndex, stepTitle, skipCost });
  }

  // Track when someone donates a tip
  async trackTipDonated(trailId: string, tipAmount: number): Promise<void> {
    await this.recordEvent(trailId, 'tip_donated', { tipAmount });
  }

  // Track when someone completes the entire trail
  async trackTrailComplete(trailId: string): Promise<void> {
    await this.recordEvent(trailId, 'trail_complete', {});
  }

  // Track video watch time
  async trackVideoWatch(trailId: string, stepIndex: number, stepTitle: string, watchTime: number): Promise<void> {
    await this.recordEvent(trailId, 'video_watch', { stepIndex, stepTitle, watchTime });
  }

  // Get analytics for a specific trail
  async getTrailAnalytics(trailId: string): Promise<TrailAnalytics | null> {
    try {
      const response = await fetch(`/api/analytics?trailId=${trailId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  // Get all analytics data
  async getAllAnalytics(): Promise<Map<string, TrailAnalytics>> {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) return new Map();
      const data = await response.json();
      return new Map(Object.entries(data));
    } catch (error) {
      console.error('Error fetching all analytics:', error);
      return new Map();
    }
  }

  // Reset all analytics data
  async resetAnalytics(): Promise<void> {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (response.ok) {
        console.log('Analytics reset successfully');
      }
    } catch (error) {
      console.error('Error resetting analytics:', error);
    }
  }

  // Private method for recording events
  private async recordEvent(trailId: string, eventType: AnalyticsEvent['eventType'], data: any): Promise<void> {
    try {
      console.log('📤 Sending analytics event to API:', { trailId, eventType, data });
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trailId,
          eventType,
          data
        }),
      });
      
      if (!response.ok) {
        console.error('❌ Analytics API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
      } else {
        console.log('✅ Analytics event sent successfully');
      }
    } catch (error) {
      console.error('❌ Error recording analytics event:', error);
    }
  }

  // Clear analytics for a specific trail
  async clearTrailAnalytics(trailId: string): Promise<void> {
    // This would need to be implemented in the API
    console.log('Clear analytics not implemented yet');
  }

  // Clear all analytics
  async clearAllAnalytics(): Promise<void> {
    // This would need to be implemented in the API
    console.log('Clear all analytics not implemented yet');
  }

  // Generate a unique session ID for tracking
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const analyticsService = AnalyticsService.getInstance(); 