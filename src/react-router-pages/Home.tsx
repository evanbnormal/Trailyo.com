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
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const { canCreateTrails, startSubscription } = useSubscription();
  const navigate = useNavigate();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    if (typeof window !== 'undefined' && searchParams) {
      if (searchParams.get('showLogin') === '1') {
        setShowLoginModal(true);
        // Optionally, remove the param from the URL after opening
        const url = new URL(window.location.href);
        url.searchParams.delete('showLogin');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
      
      // Handle email confirmation
      if (searchParams.get('confirmed') === 'true') {
        const email = searchParams.get('email');
        const fromTrail = searchParams.get('fromTrail') === 'true';
        const userId = searchParams.get('userId');
        const userName = searchParams.get('userName');
        
        // Auto-login the user after email confirmation
        if (email && userId && userName) {
          const userData = {
            id: userId,
            email: email,
            name: userName,
            avatar: undefined,
            createdAt: new Date().toISOString(),
          };
          
          // Store user data in localStorage to simulate login
          localStorage.setItem('currentUser', JSON.stringify(userData));
          console.log('Auto-logged in user after email confirmation:', userData);
        }
        
        // Check if user signed up from a trail and redirect them back
        if (email && fromTrail) {
          const storedTrailUrl = localStorage.getItem(`pending_confirmation_${email}`);
          console.log('Looking for stored trail URL for email:', email);
          console.log('Found stored trail URL:', storedTrailUrl);
          
          if (storedTrailUrl) {
            // Clean up the stored URL
            localStorage.removeItem(`pending_confirmation_${email}`);
            
            // Show success message
            setShowConfirmationMessage(true);
            
            // Redirect back to trail after a short delay
            setTimeout(() => {
              const redirectPath = storedTrailUrl.replace(window.location.origin, '');
              console.log('Redirecting to:', redirectPath);
              navigate(redirectPath);
            }, 2000);
          } else {
            console.log('No stored trail URL found for email:', email);
            // Still show success message even if no trail URL found
            setShowConfirmationMessage(true);
            setTimeout(() => {
              setShowConfirmationMessage(false);
            }, 3000);
          }
        }
        
        // Remove the params from the URL silently
        const url = new URL(window.location.href);
        url.searchParams.delete('confirmed');
        url.searchParams.delete('email');
        url.searchParams.delete('fromTrail');
        url.searchParams.delete('autoLogin');
        url.searchParams.delete('userId');
        url.searchParams.delete('userName');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
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
      {/* Email Confirmation Success Message */}
      {showConfirmationMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
            <p className="text-gray-600 mb-4">
              Your account has been successfully verified. Redirecting you back to the trail...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-6">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Converting 👀 into 💰.
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