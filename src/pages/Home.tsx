'use client'

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '@/contexts/AuthContext';

const Home: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleCreateTrail = () => {
    if (isAuthenticated) {
      // User is signed in, navigate to creator
      window.location.href = '/creator';
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