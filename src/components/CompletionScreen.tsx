
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CheckCircle, Coins, WalletCards, HandCoins } from "lucide-react";

interface CompletionScreenProps {
  trail: {
    title: string;
    creator: string;
  };
  investedAmount: number;
  onRestart: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  trail,
  investedAmount,
  onRestart,
}) => {
  const [tipAmount, setTipAmount] = useState(Math.round(investedAmount * 0.3));
  const [showThanks, setShowThanks] = useState(false);
  
  const handleEarnBack = () => {
    toast.success(`Congratulations! You've earned back $${investedAmount}.`);
    onRestart();
  };
  
  const handleTip = () => {
    console.log('🎁 Tip button clicked in CompletionScreen!');
    // This will be handled by the parent component
  };
  
  return (
    <>


      <div className="w-full max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <Card className="border border-gray-100 shadow-md bg-white text-center">
        <CardHeader className="pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Trail Completed!</CardTitle>
        </CardHeader>
        <CardContent>
          {!showThanks ? (
            <>
              <p className="text-gray-600 mb-6">
                You've successfully completed <span className="font-medium">{trail.title}</span> by {trail.creator}.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <h3 className="font-semibold mb-4">What would you like to do with your invested money?</h3>
                
                <div className="space-y-8">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-2 text-gray-600">
                      <WalletCards className="h-5 w-5 mr-2" />
                      <p>Earn back all ${investedAmount}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleEarnBack}
                      className="w-full max-w-xs"
                    >
                      Receive Refund
                    </Button>
                  </div>
                  
                  <div className="w-full h-px bg-gray-200" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-center text-gray-600">
                      <HandCoins className="h-5 w-5 mr-2" />
                      <p>Tip the creator</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        <Coins className="h-5 w-5 mr-2" />
                        <span className="text-3xl font-bold">${tipAmount}</span>
                      </div>
                      
                      <div className="px-8">
                        <Slider
                          defaultValue={[Math.round(investedAmount * 0.3)]}
                          max={investedAmount}
                          step={1}
                          onValueChange={(value) => setTipAmount(value[0])}
                        />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>$0</span>
                          <span>Suggested: ${Math.round(investedAmount * 0.3)}</span>
                          <span>${investedAmount}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleTip}
                      className="w-full max-w-xs bg-black text-white hover:bg-black/90"
                    >
                      Tip ${tipAmount}
                    </Button>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                You can restart this trail anytime to review the content again.
              </p>
            </>
          ) : (
            <div className="py-8 animate-fade-in">
              <h3 className="text-2xl font-medium mb-4">Thank You!</h3>
              <p className="text-gray-600 mb-8">
                Your tip of ${tipAmount} will help {trail.creator} create more valuable content.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={onRestart} 
                  className="bg-black text-white hover:bg-black/90"
                >
                  Return Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default CompletionScreen;
