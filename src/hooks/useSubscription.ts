import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionService, SubscriptionStatus } from '../lib/subscription';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    isTrialing: false,
    status: 'inactive',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionStatus();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh subscription status every 60 seconds for logged-in users
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadSubscriptionStatus();
    }, 60000); // 60 seconds (1 minute) - reduced frequency

    return () => clearInterval(interval);
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