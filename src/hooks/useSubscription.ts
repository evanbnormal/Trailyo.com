import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionService, SubscriptionStatus } from '../lib/subscription';

// Global state for subscription management - SMART CACHING WITH AUTO-INVALIDATION
let globalSubscribers = new Set<(status: SubscriptionStatus) => void>();
let globalSubscriptionStatus: SubscriptionStatus | null = null;
let globalLoadingPromise: Promise<SubscriptionStatus> | null = null;
let globalCacheTimestamp: number = 0;
const CACHE_DURATION = 10000; // 10 seconds cache (reduced from 30)
const FRESH_DURATION = 500; // Consider cache "fresh" for only 500ms (very aggressive)

// Add function to force clear cache
export const clearSubscriptionCache = () => {
  console.log('🧹 Clearing subscription cache...');
  globalSubscriptionStatus = null;
  globalLoadingPromise = null;
  globalCacheTimestamp = 0;
};

// Clear cache on window focus and visibility change (client-side only)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('focus', () => {
    console.log('🔄 Window focused, clearing subscription cache for fresh data');
    clearSubscriptionCache();
  });
  
  // Also clear cache on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('🔄 Page became visible, clearing subscription cache');
      clearSubscriptionCache();
    }
  });
}

// Add function to invalidate cache (called by subscription actions)
export const invalidateSubscriptionCache = () => {
  console.log('❌ Invalidating subscription cache due to user action');
  globalCacheTimestamp = 0; // Mark cache as stale
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    isTrialing: false,
    status: 'inactive',
  });
  const [isLoading, setIsLoading] = useState(true);
  const subscriberRef = useRef<(status: SubscriptionStatus) => void>();

  // Debug logging for user and subscription status
  useEffect(() => {
    console.log('🔍 useSubscription debug:', {
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      currentSubscriptionStatus: subscriptionStatus,
      isLoading
    });
  }, [user?.id, user?.email, user?.name, subscriptionStatus, isLoading]);

  // Create a subscriber function for this component
  useEffect(() => {
    subscriberRef.current = (status: SubscriptionStatus) => {
      console.log('📡 Subscription status update received:', status);
      setSubscriptionStatus(status);
      setIsLoading(false);
    };
    
    // Add this component to global subscribers
    globalSubscribers.add(subscriberRef.current);
    
    return () => {
      if (subscriberRef.current) {
        globalSubscribers.delete(subscriberRef.current);
      }
    };
  }, []);

  // Smart subscription status loading with automatic cache invalidation
  const loadSubscriptionStatusSmart = useCallback(async (): Promise<SubscriptionStatus> => {
    if (!user?.id) {
      console.log('❌ No user ID available for subscription lookup');
      const defaultStatus: SubscriptionStatus = { isSubscribed: false, isTrialing: false, status: 'inactive' };
      setSubscriptionStatus(defaultStatus);
      setIsLoading(false);
      return defaultStatus;
    }

    console.log(`🔍 Loading subscription status for user: ${user.id} (${user.email})`);

    const now = Date.now();
    const cacheAge = globalCacheTimestamp ? now - globalCacheTimestamp : 0;
    const isCacheFresh = globalCacheTimestamp && cacheAge < FRESH_DURATION;
    const isCacheValid = globalCacheTimestamp && cacheAge < CACHE_DURATION;

    console.log(`🔍 Cache check for user ${user.id}:`, {
      hasCachedStatus: !!globalSubscriptionStatus,
      cacheAge: cacheAge,
      isCacheFresh,
      isCacheValid,
      currentStatus: globalSubscriptionStatus
    });

    // Return cached data if fresh
    if (globalSubscriptionStatus && isCacheFresh) {
      console.log(`⚡ Using fresh cached subscription status:`, globalSubscriptionStatus);
      setSubscriptionStatus(globalSubscriptionStatus);
      setIsLoading(false);
      return globalSubscriptionStatus;
    }

    // Use cached data while loading fresh data in background if cache is valid but not fresh
    if (globalSubscriptionStatus && isCacheValid) {
      console.log(`🔄 Using cached data while loading fresh subscription status in background`);
      setSubscriptionStatus(globalSubscriptionStatus);
      setIsLoading(false);
      
      // Load fresh data in background
      loadFreshData().catch(console.error);
      return globalSubscriptionStatus;
    }

    // If we're already loading, wait for that
    if (globalLoadingPromise) {
      console.log(`⏳ Waiting for existing subscription status request`);
      const status = await globalLoadingPromise;
      setSubscriptionStatus(status);
      setIsLoading(false);
      return status;
    }

    // Load fresh data
    console.log(`🚀 Loading fresh subscription data (cache stale or missing)`);
    return await loadFreshData();

    async function loadFreshData(): Promise<SubscriptionStatus> {
      globalLoadingPromise = (async () => {
        try {
          console.log(`🔄 Loading fresh subscription status for user: ${user?.id}`);
          setIsLoading(true);
          
          const status = await SubscriptionService.getSubscriptionStatus(user?.id || '', user?.email || '');
          
          console.log(`📥 Received subscription status from API:`, status);
          
          // Update global cache
          globalSubscriptionStatus = status;
          globalCacheTimestamp = Date.now();
          
          // Update all subscribers
          setSubscriptionStatus(status);
          globalSubscribers.forEach(subscriber => {
            console.log(`📡 Notifying subscriber with status:`, status);
            subscriber(status);
          });
          
          console.log(`✅ Fresh subscription status loaded and cached:`, status);
          return status;
          
        } catch (error) {
          console.error('❌ Failed to load subscription status:', error);
          const defaultStatus: SubscriptionStatus = { isSubscribed: false, isTrialing: false, status: 'inactive' };
          setSubscriptionStatus(defaultStatus);
          return defaultStatus;
        } finally {
          setIsLoading(false);
          globalLoadingPromise = null;
        }
      })();
      
      return await globalLoadingPromise;
    }
  }, [user?.id, user?.email]);

  // Initialize subscription status with smart caching
  useEffect(() => {
    if (user?.id) {
      console.log(`🔄 User changed, clearing cache and loading fresh subscription status for: ${user.id}`);
      // Force fresh load by clearing cache first
      globalSubscriptionStatus = null;
      globalLoadingPromise = null;
      globalCacheTimestamp = 0;
      
      loadSubscriptionStatusSmart();
    } else if (!user?.id) {
      console.log('🔄 User logged out, clearing subscription status');
      // User logged out - clear state
      const defaultStatus: SubscriptionStatus = { isSubscribed: false, isTrialing: false, status: 'inactive' };
      setSubscriptionStatus(defaultStatus);
      setIsLoading(false);
      
      // Clear global cache when user logs out
      globalSubscriptionStatus = null;
      globalLoadingPromise = null;
      globalCacheTimestamp = 0;
    }
  }, [user?.id, loadSubscriptionStatusSmart]);

  // Helper functions
  const canCreateTrails = useCallback(() => {
    const canCreate = subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing;
    console.log(`🔍 canCreateTrails check: ${canCreate} (isSubscribed: ${subscriptionStatus.isSubscribed}, isTrialing: ${subscriptionStatus.isTrialing})`);
    return canCreate;
  }, [subscriptionStatus.isSubscribed, subscriptionStatus.isTrialing]);

  /**
   * Start a new subscription (invalidates cache automatically)
   */
  const startSubscription = useCallback(async () => {
    if (!user?.email || !user?.id || !user?.name) {
      throw new Error('User authentication required');
    }

    try {
      console.log('🚀 Starting subscription...');
      
      // Invalidate cache before action
      invalidateSubscriptionCache();
      
      const result = await SubscriptionService.startSubscription(user.email, user.id, user.name);
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Failed to start subscription');
      }
      
      console.log('✅ Subscription started successfully');
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start subscription:', error);
      throw error;
    }
  }, [user?.email, user?.id, user?.name]);

  /**
   * Confirm payment setup (refreshes data automatically)
   */
  const confirmPaymentSetup = useCallback(async (setupIntentId: string) => {
    try {
      console.log('🔄 Confirming payment setup...');
      
      const result = await SubscriptionService.confirmPaymentSetup(setupIntentId);
      
      // Invalidate cache and load fresh data after successful confirmation
      invalidateSubscriptionCache();
      await loadSubscriptionStatusSmart();
      
      console.log('✅ Payment setup confirmed');
      return result;
      
    } catch (error) {
      console.error('❌ Failed to confirm payment setup:', error);
      throw error;
    }
  }, [loadSubscriptionStatusSmart]);

  /**
   * Cancel subscription (refreshes data automatically)
   */
  const cancelSubscription = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User authentication required');
    }

    try {
      console.log('🚫 Canceling subscription...');
      
      const result = await SubscriptionService.cancelSubscription(user.id);
      
      // Invalidate cache and load fresh data after cancellation
      invalidateSubscriptionCache();
      await loadSubscriptionStatusSmart();
      
      console.log('✅ Subscription canceled');
      return result;
      
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }, [user?.id, loadSubscriptionStatusSmart]);

  /**
   * Manual refresh function for debugging
   */
  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('🔄 Manual subscription status refresh requested');
    clearSubscriptionCache();
    return await loadSubscriptionStatusSmart();
  }, [loadSubscriptionStatusSmart]);

  return {
    subscriptionStatus,
    isLoading,
    canCreateTrails,
    startSubscription,
    confirmPaymentSetup,
    cancelSubscription,
    refreshSubscriptionStatus,
  };
}; 