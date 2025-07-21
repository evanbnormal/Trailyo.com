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

  // Force refresh subscription status every 30 seconds for logged-in users
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadSubscriptionStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await SubscriptionService.getSubscriptionStatus(user!.id, user!.email);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
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