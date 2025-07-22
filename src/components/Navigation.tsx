'use client'

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Crown, Gift, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import LoginModal from './LoginModal';
import SubscriptionModal from './SubscriptionModal';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { subscriptionStatus, canCreateTrails, startSubscription } = useSubscription();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleLogout = () => {
    logout(() => {
      // Redirect to home page after logout
      navigate('/');
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="bg-black text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img 
              src="/Logo White.svg" 
              alt="Trailyo" 
              className="h-8 w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white hover:bg-white/10 p-2">
                    <Menu className="h-12 w-12 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {/* Subscription Status */}
                    <div className="flex items-center gap-2 mt-2">
                      {canCreateTrails() ? (
                        <>
                          <Crown className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-amber-600 font-medium">Creator</span>
                          {subscriptionStatus.isTrialing && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              Trial
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Free Tier</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {!canCreateTrails() && (
                    <DropdownMenuItem 
                      onClick={() => setShowSubscriptionModal(true)}
                      className="cursor-pointer text-yellow-600 focus:text-yellow-600"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Creator
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 px-6 py-3 text-base"
                onClick={() => setShowLoginModal(true)}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

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

export default Navigation; 