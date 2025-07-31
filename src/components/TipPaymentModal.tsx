import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StripePayment } from '@/components/StripePayment';
import { Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  trailId: string;
  creatorId: string;
  creatorName?: string;
  onSuccess: () => void;
}

export const TipPaymentModal: React.FC<TipPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  trailId,
  creatorId,
  creatorName,
  onSuccess,
}) => {
  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-gray-100 shadow-lg">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-0 top-0 h-6 w-6 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Gift className="h-5 w-5 text-amber-500" />
            Tip the Creator
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {creatorName ? `Show your appreciation to ${creatorName}` : 'Show your appreciation to the creator'} for this amazing content.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl font-bold text-amber-600">${amount}</span>
            </div>
            <p className="text-sm text-gray-500">
              Your tip helps creators continue making great content
            </p>
          </div>

          <StripePayment
            amount={amount}
            trailId={trailId}
            creatorId={creatorId}
            type="tip"
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};