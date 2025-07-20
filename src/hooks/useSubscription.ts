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

  const loadSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await SubscriptionService.getSubscriptionStatus(user!.id);
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

  const startSubscription = async () => {
    if (!user?.email) {
      throw new Error('User email is required');
    }

    try {
      const { clientSecret } = await SubscriptionService.createSubscription(user.email);
      await SubscriptionService.redirectToCheckout(clientSecret);
      
      // Reload subscription status after successful subscription
      await loadSubscriptionStatus();
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