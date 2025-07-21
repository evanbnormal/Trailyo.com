import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Star, Zap, Users, BarChart3, Crown, X } from 'lucide-react';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../hooks/use-toast';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [setupIntentId, setSetupIntentId] = useState<string>('');
  const { startSubscription } = useSubscription();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { clientSecret: secret, setupIntentId: intentId } = await startSubscription();
      setClientSecret(secret);
      setSetupIntentId(intentId);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: "Failed to start subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    onSubscribe();
    toast({
      title: "Success!",
      description: "Your free trial has started. Welcome to Creator tier!",
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleCardSwitch = (newCard: 'creator' | 'free') => {
    setActiveCard(newCard);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-6 overflow-y-auto rounded-xl">
          <DialogHeader className="pb-4">
            <div className="flex items-center mb-2">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-2 rounded-full mr-3">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-3xl font-bold text-gray-900">
                Choose Your Plan
              </DialogTitle>
            </div>
            <p className="text-gray-600 ml-12">
              Click on a plan to see details
            </p>
          </DialogHeader>

          <div className="space-y-4 mb-6">
            {/* Collapsed Free Tier Card (when Creator is active) */}
            {activeCard === 'creator' && (
              <div 
                className="border border-gray-200 bg-white rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md"
                onClick={() => handleCardSwitch('free')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Free Tier</h4>
                      <p className="text-sm text-gray-600">Perfect for learning</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">$0</div>
                    <div className="text-sm text-gray-600">forever</div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Creator Card */}
            {activeCard === 'creator' && (
              <div className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6">
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
                  <div className="flex items-center justify-center text-yellow-600 font-semibold mb-2">
                    <Zap className="h-4 w-4 mr-2" />
                    14-Day Free Trial
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    Free trial • Cancel anytime
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Create unlimited trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Publish and share with the world</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Advanced analytics and insights</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-yellow-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Early access to new features</span>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed Creator Card (when Free Tier is active) */}
            {activeCard === 'free' && (
              <div 
                className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md"
                onClick={() => handleCardSwitch('creator')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-2 rounded-full mr-3">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Creator</h4>
                      <p className="text-sm text-gray-600">Everything + trail creation</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">$29.99</div>
                    <div className="text-sm text-gray-600">per month</div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mt-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Full Free Tier Card */}
            {activeCard === 'free' && (
              <div className="border border-gray-200 bg-white rounded-xl p-6">
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
                    <Check className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Browse and complete unlimited trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Track your learning progress</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Access to all public trails</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
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
                  <div className="flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-500">Advanced analytics</span>
                  </div>
                </div>
              </div>
            )}
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

      <SubscriptionPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        clientSecret={clientSecret}
        setupIntentId={setupIntentId}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  );
};

export default SubscriptionModal; 