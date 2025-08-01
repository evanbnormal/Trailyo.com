import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
  onVerified?: () => void;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({ isOpen, onClose, email, name, onVerified }) => {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const handleResend = async () => {
    if (!email || !name) {
      toast.error('Missing email or name');
      return;
    }
    setIsResending(true);
    setResent(false);
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Confirmation email resent!');
        setResent(true);
      } else {
        toast.error(data.error || 'Failed to resend confirmation email');
      }
    } catch (e) {
      toast.error('Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  const handleOkayGotIt = async () => {
    if (!email) {
      onClose();
      return;
    }
    
    setIsCheckingVerification(true);
    try {
      // Try to log in to check if user is verified
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: '' }), // We'll get a specific error for unverified users
      });
      
      if (res.ok) {
        // User is verified and can log in
        onVerified?.();
        onClose();
      } else {
        // User is not verified yet
        toast.error('Please check your email and click the verification link before continuing.');
      }
    } catch (e) {
      toast.error('Please check your email and click the verification link before continuing.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

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
        <Button 
          className="mt-4 w-full max-w-xs" 
          onClick={handleOkayGotIt} 
          disabled={isCheckingVerification}
          autoFocus
        >
          {isCheckingVerification ? 'Checking...' : 'Okay, got it!'}
        </Button>
        <div className="mt-2">
          <button
            className="text-sm text-gray-600 underline hover:text-gray-800 disabled:opacity-60"
            onClick={handleResend}
            disabled={isResending || resent}
            type="button"
          >
            {isResending ? 'Resending...' : resent ? 'Confirmation Email Sent!' : 'Resend confirmation email'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailConfirmationModal; 