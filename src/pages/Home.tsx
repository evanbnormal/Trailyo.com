'use client'

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Lock } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import SubscriptionModal from '@/components/SubscriptionModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

const Home: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const { canCreateTrails, startSubscription } = useSubscription();
  const navigate = useNavigate();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    if (searchParams && searchParams.get('showLogin') === '1') {
      setShowLoginModal(true);
      // Optionally, remove the param from the URL after opening
      const url = new URL(window.location.href);
      url.searchParams.delete('showLogin');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
    
    // Handle email confirmation - just clean up URL params silently
    if (searchParams && searchParams.get('confirmed') === 'true') {
      // Remove the params from the URL silently
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      url.searchParams.delete('email');
      url.searchParams.delete('autoLogin');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);



  const handleCreateTrail = () => {
    if (!isAuthenticated) {
      // User is not signed in, show login modal
      setShowLoginModal(true);
    } else if (!canCreateTrails()) {
      // User is signed in but doesn't have creator subscription, show upgrade modal
      setShowSubscriptionModal(true);
    } else {
      // User is signed in and has creator subscription, navigate to creator
      navigate('/creator');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-6">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Converting attention into currency
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create engaging learning trails and earn from your audience's attention
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-black text-white hover:bg-black/90 px-8 py-4 text-lg"
              onClick={handleCreateTrail}
            >
              {!isAuthenticated || !canCreateTrails() ? (
                <Lock className="mr-2 h-5 w-5" />
              ) : (
                <Plus className="mr-2 h-5 w-5" />
              )}
              {!isAuthenticated || !canCreateTrails() ? 'Upgrade to Create' : 'Create a Trail'}
            </Button>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
      />
      
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        onSubscribe={startSubscription}
      />
    </>
  );
};

export default Home; 