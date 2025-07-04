import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({ isOpen, onClose, email }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center flex flex-col items-center justify-center py-10">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-black" strokeWidth={1.5} />
        <DialogHeader className="w-full">
          <DialogTitle className="text-3xl font-bold mb-2 text-center w-full">Check Your Email</DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mb-4 w-full text-center">
            {email ? (
              <span>We sent a confirmation link to <b>{email}</b>. Please check your inbox and follow the link to verify your account.</span>
            ) : (
              <span>We sent a confirmation link to your email. Please check your inbox and follow the link to verify your account.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Button className="mt-4 w-full max-w-xs" onClick={onClose} autoFocus>
          Okay, got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default EmailConfirmationModal; 