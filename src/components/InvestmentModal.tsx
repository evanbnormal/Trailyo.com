
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Coins } from "lucide-react";

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedAmount: number;
  onInvest: (amount: number) => void;
}

const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  suggestedAmount,
  onInvest,
}) => {
  const [investmentAmount, setInvestmentAmount] = useState(suggestedAmount);
  
  const handleInvest = () => {
    onInvest(investmentAmount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-gray-100 shadow-lg animate-fade-in">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">Invest In Learning</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Commit to this learning trail by investing. You can earn this back upon completion or tip the creator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="font-medium text-sm">How much would you like to invest?</p>
            <div className="flex items-center justify-center">
              <Coins className="h-5 w-5 mr-2" />
              <span className="text-5xl font-bold">${investmentAmount}</span>
            </div>
          </div>
          
          <div className="px-4">
            <Slider 
              defaultValue={[suggestedAmount]} 
              max={Math.max(50, suggestedAmount * 1.5)} 
              step={1}
              onValueChange={(value) => setInvestmentAmount(value[0])}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>$5</span>
              <span>Suggested: ${suggestedAmount}</span>
              <span>${Math.max(50, suggestedAmount * 1.5)}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              By investing money, you're committing to complete this trail. You'll get your investment back when you finish, or you can choose to tip the creator.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvest} className="bg-black text-white hover:bg-black/90">
            Invest ${investmentAmount} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentModal;
