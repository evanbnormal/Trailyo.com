import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SecureSubscriptionService } from '../lib/subscription-secure';
import { invalidateSubscriptionCache } from './useSubscription';

interface SecureSubscriptionHook {
  isLoading: boolean;
  startSecureSubscription: () => Promise<{ clientSecret: string; sessionId: string }>;
  verifySecureSubscription: (sessionId: string) => Promise<boolean>;
}

export const useSecureSubscription = (): SecureSubscriptionHook => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const startSecureSubscription = useCallback(async () => {
    if (!user?.email || !user?.id) {
      throw new Error('User authentication required');
    }

    setIsLoading(true);
    try {
      console.log('🔐 Starting secure subscription process...');
      
      const result = await SecureSubscriptionService.startSubscription(
        user.email,
        user.id,
        user.name
      );
      
      console.log('✅ Secure subscription initialized');
      
      // Clear any existing subscription cache
      invalidateSubscriptionCache();
      
      return result;
    } catch (error) {
      console.error('❌ Secure subscription start failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, user?.id, user?.name]);

  const verifySecureSubscription = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('User authentication required');
    }

    setIsLoading(true);
    try {
      console.log(`🔍 Verifying subscription for session: ${sessionId}`);
      
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts over ~60 seconds
      
      while (attempts < maxAttempts) {
        const result = await SecureSubscriptionService.verifySubscription(sessionId, user.id);
        
        console.log(`🔄 Verification attempt ${attempts + 1}: ${result.status}`);
        
        if (result.status === 'success') {
          console.log('✅ Subscription verified successfully!');
          // Invalidate cache to force fresh load
          invalidateSubscriptionCache();
          return true;
        }
        
        if (result.status === 'failed') {
          console.log('❌ Subscription verification failed');
          return false;
        }
        
        // Status is 'processing' - wait and retry
        const waitTime = result.retryAfter || 3;
        console.log(`⏳ Waiting ${waitTime}s before retry...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        attempts++;
      }
      
      console.log('⏰ Verification timed out after maximum attempts');
      return false;
      
    } catch (error) {
      console.error('❌ Subscription verification error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    isLoading,
    startSecureSubscription,
    verifySecureSubscription,
  };
}; 