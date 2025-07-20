'use client'

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '@/contexts/AuthContext';

const Home: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, login } = useAuth();
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
    
    // Handle email confirmation success and auto-login
    if (searchParams && searchParams.get('confirmed') === 'true') {
      const email = searchParams.get('email');
      const autoLogin = searchParams.get('autoLogin');
      
      if (email && autoLogin === 'true') {
        // Auto-login the user
        handleAutoLogin(email);
      } else {
        // Show success message for manual confirmation
        alert('Email confirmed successfully! You can now sign in.');
      }
      
      // Remove the params from the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      url.searchParams.delete('email');
      url.searchParams.delete('autoLogin');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  const handleAutoLogin = async (email: string) => {
    try {
      // For auto-login after email confirmation, we'll need to implement
      // a way to get the user's password or use a temporary token
      // For now, we'll show a success message and prompt them to login
      alert(`Email confirmed successfully! Welcome to Trailyo, ${email}. Please sign in to continue.`);
      setShowLoginModal(true);
    } catch (error) {
      console.error('Auto-login error:', error);
      alert('Email confirmed successfully! Please sign in to continue.');
      setShowLoginModal(true);
    }
  };

  const handleCreateTrail = () => {
    if (isAuthenticated) {
      // User is signed in, navigate to creator
      navigate('/creator');
    } else {
      // User is not signed in, show login modal
      setShowLoginModal(true);
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
              <Plus className="mr-2 h-5 w-5" />
              Create a Trail
            </Button>
          </div>
        </div>
      </div>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
};

export default Home; 