import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Star, Zap, Users, BarChart3, Crown, X } from 'lucide-react';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  open,
  onOpenChange,
  onSubscribe
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<'creator' | 'free'>('creator');

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      onSubscribe();
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-6 overflow-y-auto rounded-xl">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 rounded-full">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogTitle className="text-3xl font-bold text-center text-gray-900">
            Choose Your Plan
          </DialogTitle>
          <p className="text-gray-600 text-center mt-2">
            Click on a plan to see details
          </p>
        </DialogHeader>

        <div className="relative h-96 mb-6">
          {/* Card Container with 3D Perspective */}
          <div className="relative w-full h-full perspective-1000">
            
            {/* Creator Card - Front by default */}
            <div 
              className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${
                activeCard === 'creator' 
                  ? 'rotate-y-0 translate-z-0 scale-100 opacity-100 z-20' 
                  : 'rotate-y-0 translate-z-[-10px] scale-95 opacity-80 z-10'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: activeCard === 'creator' 
                  ? 'rotateY(0deg) translateZ(0px) scale(1)' 
                  : 'rotateY(0deg) translateZ(-10px) scale(0.95)'
              }}
            >
              <div className="w-full h-full border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 cursor-pointer"
                   onClick={() => setActiveCard('creator')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-2 rounded-full mr-3">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">Creator</h4>
                      <p className="text-sm text-gray-600">Everything + trail creation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">$29.99</div>
                    <div className="text-gray-600">per month</div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mt-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center text-green-600 font-semibold mb-2">
                    <Zap className="h-4 w-4 mr-2" />
                    14-Day Free Trial
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Free trial • Cancel anytime
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Create unlimited trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Publish and share with the world</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Advanced analytics and insights</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Free Tier Card - Back by default */}
            <div 
              className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${
                activeCard === 'free' 
                  ? 'rotate-y-0 translate-z-0 scale-100 opacity-100 z-20' 
                  : 'rotate-y-0 translate-z-[-10px] scale-95 opacity-80 z-10'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: activeCard === 'free' 
                  ? 'rotateY(0deg) translateZ(0px) scale(1)' 
                  : 'rotateY(0deg) translateZ(-10px) scale(0.95)'
              }}
            >
              <div className="w-full h-full border border-gray-200 bg-white rounded-xl p-6 cursor-pointer"
                   onClick={() => setActiveCard('free')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <Users className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">Free Tier</h4>
                      <p className="text-sm text-gray-600">Perfect for learning</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">$0</div>
                    <div className="text-gray-600">forever</div>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 mt-1">
                      Free
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Browse and complete unlimited trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Track your learning progress</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Access to all public trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Basic support</span>
                  </div>
                  <div className="flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-500">Create trails</span>
                  </div>
                  <div className="flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-500">Publish trails</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {activeCard === 'creator' && (
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold py-3 text-lg rounded-lg"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal; 