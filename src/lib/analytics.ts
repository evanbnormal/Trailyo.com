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
  retentionByStep: Array<{
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
  async trackStepComplete(trailId: string, stepIndex: number, stepTitle: string, sessionId?: string): Promise<void> {
    await this.recordEvent(trailId, 'step_complete', { 
      stepIndex, 
      stepTitle, 
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Track when someone skips a step (revenue)
  async trackStepSkip(trailId: string, stepIndex: number, stepTitle: string, skipCost: number, sessionId?: string): Promise<void> {
    await this.recordEvent(trailId, 'step_skip', { 
      stepIndex, 
      stepTitle, 
      skipCost,
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Track when someone donates a tip
  async trackTipDonated(trailId: string, tipAmount: number, sessionId?: string): Promise<void> {
    await this.recordEvent(trailId, 'tip_donated', { 
      tipAmount,
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Track when someone completes the entire trail
  async trackTrailComplete(trailId: string, sessionId?: string): Promise<void> {
    await this.recordEvent(trailId, 'trail_complete', { 
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Track video watch time
  async trackVideoWatch(trailId: string, stepIndex: number, stepTitle: string, watchTime: number, sessionId?: string): Promise<void> {
    await this.recordEvent(trailId, 'video_watch', { 
      stepIndex, 
      stepTitle, 
      watchTime,
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  // Debug analytics - call this from browser console to test
  async debugAnalytics(): Promise<void> {
    try {
      console.log('🔍 Starting analytics debug...');
      
      // Test the debug endpoint
      const debugResponse = await fetch('/api/debug-analytics');
      const debugData = await debugResponse.json();
      
      console.log('🔍 Debug endpoint response:', debugData);
      
      // Test creating an event
      const testResponse = await fetch('/api/debug-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trailId: 'debug-trail-' + Date.now(),
          eventType: 'trail_view',
          action: { debug: true, timestamp: Date.now() }
        })
      });
      
      const testData = await testResponse.json();
      console.log('🔍 Test event creation response:', testData);
      
      // Test the main analytics endpoint
      const analyticsResponse = await fetch('/api/analytics?trailId=debug-trail');
      const analyticsData = await analyticsResponse.json();
      
      console.log('🔍 Analytics endpoint response:', analyticsData);
      
      console.log('✅ Analytics debug completed');
      
    } catch (error) {
      console.error('❌ Analytics debug failed:', error);
    }
  }

  // Test analytics functionality
  async testAnalytics(): Promise<void> {
    try {
      console.log('🧪 Testing analytics service...');
      
      // Test trail view
      await this.trackTrailView('test-trail', 'Test Trail');
      
      // Test step completion
      await this.trackStepComplete('test-trail', 0, 'Test Step');
      
      // Test video watch
      await this.trackVideoWatch('test-trail', 0, 'Test Video', 2.5);
      
      console.log('✅ Analytics test completed successfully');
    } catch (error) {
      console.error('❌ Analytics test failed:', error);
    }
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

  // Reset analytics for a specific trail
  async resetAnalytics(trailId?: string): Promise<void> {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resetTrailId: trailId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Analytics reset successfully:', result);
      } else {
        console.error('❌ Failed to reset analytics:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error resetting analytics:', error);
    }
  }

  // Private method for recording events
  private async recordEvent(trailId: string, eventType: AnalyticsEvent['eventType'], data: any): Promise<void> {
    try {
      console.log('📤 Sending analytics event:', { trailId, eventType, data });
      console.log('📤 Environment check:', { 
        isClient: typeof window !== 'undefined',
        baseUrl: typeof window !== 'undefined' ? window.location.origin : 'server',
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trailId,
          eventType,
          action: data
        }),
      });
      
      console.log('📤 Analytics API response status:', response.status);
      console.log('📤 Analytics API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📤 Analytics API error response:', errorText);
        throw new Error(`Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Analytics event recorded:', result);
      
    } catch (error) {
      console.error('❌ Failed to record analytics event:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        trailId,
        eventType,
        data
      });
      // Don't throw - we don't want analytics failures to break the app
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