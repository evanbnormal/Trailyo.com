// Simple in-memory data store to replace Supabase
// This will use localStorage for persistence and in-memory storage for performance

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  password?: string; // In a real app, this would be hashed
}

export interface Trail {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  is_published: boolean;
  price?: number;
  created_at: string;
  updated_at: string;
  steps: TrailStep[];
}

export interface TrailStep {
  id: string;
  trail_id: string;
  title: string;
  content: string;
  step_index: number;
  video_url?: string;
  skip_cost?: number;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  trail_id: string;
  event_type: string;
  user_id?: string;
  data: Record<string, unknown>;
  created_at: string;
}

// In-memory storage
let users: User[] = [];
let trails: Trail[] = [];
let analyticsEvents: AnalyticsEvent[] = [];

// Load data from localStorage on initialization
const loadFromStorage = () => {
  try {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      users = JSON.parse(storedUsers);
    }

    const storedTrails = localStorage.getItem('trails');
    if (storedTrails) {
      trails = JSON.parse(storedTrails);
    }

    const storedAnalytics = localStorage.getItem('analytics_events');
    if (storedAnalytics) {
      analyticsEvents = JSON.parse(storedAnalytics);
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
};

// Save data to localStorage
const saveToStorage = () => {
  try {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('trails', JSON.stringify(trails));
    localStorage.setItem('analytics_events', JSON.stringify(analyticsEvents));
  } catch (error) {
    console.error('Error saving data to localStorage:', error);
  }
};

// Initialize data
loadFromStorage();

// User management
export const userService = {
  async createUser(email: string, password: string, name: string): Promise<User> {
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      password, // In a real app, this would be hashed
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveToStorage();
    return user;
  },

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = users.find(u => u.email === email && u.password === password);
    return user || null;
  },

  async getUserById(id: string): Promise<User | null> {
    return users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return users.find(u => u.email === email) || null;
  }
};

// Trail management
export const trailService = {
  async createTrail(trailData: Omit<Trail, 'id' | 'created_at' | 'updated_at'>): Promise<Trail> {
    const trail: Trail = {
      ...trailData,
      id: `trail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    trails.push(trail);
    saveToStorage();
    return trail;
  },

  async getTrailById(id: string): Promise<Trail | null> {
    return trails.find(t => t.id === id) || null;
  },

  async getPublishedTrails(): Promise<Trail[]> {
    return trails.filter(t => t.is_published).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async updateTrail(id: string, updates: Partial<Trail>): Promise<Trail | null> {
    const index = trails.findIndex(t => t.id === id);
    if (index === -1) return null;

    trails[index] = {
      ...trails[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveToStorage();
    return trails[index];
  },

  async deleteTrail(id: string): Promise<boolean> {
    const index = trails.findIndex(t => t.id === id);
    if (index === -1) return false;

    trails.splice(index, 1);
    saveToStorage();
    return true;
  }
};

// Analytics management
export const analyticsService = {
  async recordEvent(eventData: Omit<AnalyticsEvent, 'id' | 'created_at'>): Promise<void> {
    const event: AnalyticsEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    analyticsEvents.push(event);
    saveToStorage();
  },

  async getEventsByTrailId(trailId: string): Promise<AnalyticsEvent[]> {
    return analyticsEvents
      .filter(e => e.trail_id === trailId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async getAllEvents(): Promise<AnalyticsEvent[]> {
    return analyticsEvents.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
};

// Helper function to calculate analytics from events
export const calculateAnalytics = (events: AnalyticsEvent[], trailId: string) => {
  const analytics = {
    trailId,
    totalLearners: 0,
    totalRevenue: 0,
    totalTips: 0,
    completionRate: 0,
    totalWatchTime: 0,
    stepRetention: [] as unknown[],
    videoWatchTime: [] as unknown[],
    revenueByStep: [] as unknown[],
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
      case 'step_complete': {
        uniqueLearners.add(event.user_id || 'anonymous');
        const stepIndex = event.data.stepIndex as number;
        const stepTitle = event.data.stepTitle as string;
        if (!stepCompletions.has(stepIndex)) {
          stepCompletions.set(stepIndex, { stepIndex, stepTitle, count: 0 });
        }
        stepCompletions.get(stepIndex)!.count++;
        break;
      }
      case 'step_skip': {
        const skipCost = event.data.skipCost as number;
        analytics.totalRevenue += skipCost || 0;
        const skipStepIndex = event.data.stepIndex as number;
        if (!stepSkips.has(skipStepIndex)) {
          stepSkips.set(skipStepIndex, { stepIndex: skipStepIndex, revenue: 0 });
        }
        stepSkips.get(skipStepIndex)!.revenue += skipCost || 0;
        break;
      }
      case 'tip_donated': {
        const tipAmount = event.data.tipAmount as number;
        analytics.totalTips += tipAmount || 0;
        analytics.totalRevenue += tipAmount || 0;
        break;
      }
      case 'video_watch': {
        const watchTime = event.data.watchTime as number;
        analytics.totalWatchTime += watchTime || 0;
        const watchStepIndex = event.data.stepIndex as number;
        if (!stepWatchTime.has(watchStepIndex)) {
          stepWatchTime.set(watchStepIndex, { stepIndex: watchStepIndex, totalTime: 0, viewers: new Set() });
        }
        const watchData = stepWatchTime.get(watchStepIndex)!;
        watchData.totalTime += watchTime || 0;
        watchData.viewers.add(event.user_id || 'anonymous');
        break;
      }
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
}; 