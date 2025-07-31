interface SecureSubscriptionService {
  startSubscription(email: string, userId: string, name?: string): Promise<{
    clientSecret: string;
    sessionId: string;
  }>;
  
  verifySubscription(sessionId: string, userId: string): Promise<{
    status: 'success' | 'processing' | 'failed';
    subscriptionStatus?: string;
    message: string;
    retryAfter?: number;
  }>;
}

class SecureSubscriptionServiceImpl implements SecureSubscriptionService {
  async startSubscription(email: string, userId: string, name?: string) {
    const response = await fetch('/api/subscriptions/secure-start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, userId, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start subscription');
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Subscription initialization failed');
    }

    return {
      clientSecret: data.clientSecret,
      sessionId: data.sessionId,
    };
  }

  async verifySubscription(sessionId: string, userId: string) {
    const response = await fetch('/api/subscriptions/secure-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, userId }),
    });

    if (!response.ok) {
      throw new Error('Verification request failed');
    }

    const data = await response.json();
    return data;
  }
}

export const SecureSubscriptionService = new SecureSubscriptionServiceImpl(); 