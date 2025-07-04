// Analytics tracking service for real user behavior

export interface AnalyticsEvent {
  trailId: string;
  eventType: 'trail_view' | 'step_complete' | 'step_skip' | 'tip_donated' | 'trail_complete' | 'video_watch';
  timestamp: number;
  data: any;
}

export interface TrailAnalytics {
  trailId: string;
  totalLearners: number;
  totalRevenue: number;
  totalTips: number;
  completionRate: number;
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
    await this.recordEvent(trailId, 'trail_view', { trailTitle });
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

  // Private method for recording events
  private async recordEvent(trailId: string, eventType: AnalyticsEvent['eventType'], data: any): Promise<void> {
    try {
      await fetch('/api/analytics', {
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
    } catch (error) {
      console.error('Error recording analytics event:', error);
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
}

export const analyticsService = AnalyticsService.getInstance(); 