import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionService, SubscriptionStatus } from '../lib/subscription';

// Global state to prevent multiple intervals
let globalInterval: NodeJS.Timeout | null = null;
const globalSubscribers = new Set<(status: SubscriptionStatus) => void>();

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    isTrialing: false,
    status: 'inactive',
  });
  const [isLoading, setIsLoading] = useState(true);
  const subscriberRef = useRef<(status: SubscriptionStatus) => void>();

  // Create a subscriber function for this component
  useEffect(() => {
    subscriberRef.current = (status: SubscriptionStatus) => {
      setSubscriptionStatus(status);
    };
    
    // Add this component to global subscribers
    globalSubscribers.add(subscriberRef.current);
    
    return () => {
      if (subscriberRef.current) {
        globalSubscribers.delete(subscriberRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionStatus();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Only start global interval if not already running
  useEffect(() => {
    if (!user?.id) return;

    // Clear existing interval if user changed
    if (globalInterval) {
      clearInterval(globalInterval);
      globalInterval = null;
    }

    // Start global interval only once
    if (!globalInterval) {
      globalInterval = setInterval(() => {
        loadSubscriptionStatus();
      }, 300000); // 5 minutes - much less frequent
    }

    return () => {
      // Don't clear interval on component unmount - let it run globally
    };
  }, [user?.id]);

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      
      // First, try to load from localStorage for immediate display
      const storedStatus = localStorage.getItem(`subscription_${user!.id}`);
      if (storedStatus) {
        const parsedStatus = JSON.parse(storedStatus);
        setSubscriptionStatus(parsedStatus);
      }
      
      // Then fetch fresh data from server
      const status = await SubscriptionService.getSubscriptionStatus(user!.id, user!.email);
      
      // Only update localStorage if server returns a valid subscription
      // This prevents overwriting a stored subscription with "no subscription" from server
      if (status.isSubscribed || status.isTrialing) {
        setSubscriptionStatus(status);
        localStorage.setItem(`subscription_${user!.id}`, JSON.stringify(status));
        
        // Notify all subscribers of the new status
        globalSubscribers.forEach(subscriber => subscriber(status));
      } else {
        // If server says no subscription, but we have a stored subscription, keep the stored one
        const storedStatus = localStorage.getItem(`subscription_${user!.id}`);
        if (storedStatus) {
          const parsedStatus = JSON.parse(storedStatus);
          if (parsedStatus.isSubscribed || parsedStatus.isTrialing) {
            // Keep the stored subscription status
            setSubscriptionStatus(parsedStatus);
            return; // Don't overwrite localStorage
          }
        }
        // Only update if we don't have a stored subscription
        setSubscriptionStatus(status);
        localStorage.setItem(`subscription_${user!.id}`, JSON.stringify(status));
        
        // Notify all subscribers of the new status
        globalSubscribers.forEach(subscriber => subscriber(status));
      }
      
    } catch (error) {
      console.error('Failed to load subscription status:', error);
      
      // Fallback to localStorage if server fails
      const storedStatus = localStorage.getItem(`subscription_${user!.id}`);
      if (storedStatus) {
        const parsedStatus = JSON.parse(storedStatus);
        setSubscriptionStatus(parsedStatus);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canCreateTrails = () => {
    return subscriptionStatus.isSubscribed || subscriptionStatus.isTrialing;
  };

  const startSubscription = async (): Promise<{ clientSecret: string; setupIntentId: string }> => {
    if (!user?.email) {
      throw new Error('User email is required');
    }

    try {
      const result = await SubscriptionService.createSubscription(user.email, user.id);
      
      // Reload subscription status after successful subscription
      await loadSubscriptionStatus();
      
      return result;
    } catch (error) {
      console.error('Failed to start subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      await SubscriptionService.cancelSubscription(subscriptionId);
      await loadSubscriptionStatus();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    canCreateTrails,
    startSubscription,
    cancelSubscription,
    loadSubscriptionStatus,
  };
}; 