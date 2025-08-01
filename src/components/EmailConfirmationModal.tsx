import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const { refreshSession } = useAuth();

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
      // Check if user data exists in localStorage (meaning they confirmed their email)
      const storedUserData = localStorage.getItem('currentUser');
      console.log('Checking localStorage for user data:', storedUserData);
      console.log('Looking for email:', email);
      
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          console.log('Parsed user data:', userData);
          console.log('Comparing emails:', userData.email, '===', email);
          
          if (userData.email === email) {
            // User is confirmed and signed in
            console.log('Email match found! User is confirmed.');
            refreshSession(); // Refresh the authentication context
            toast.success('Welcome! You are now signed in.');
            onVerified?.();
            onClose();
            return;
          } else {
            console.log('Email mismatch. Stored:', userData.email, 'Looking for:', email);
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      } else {
        console.log('No user data found in localStorage');
      }
      
      // User is not confirmed yet
      toast.error('Please check your email and click the verification link before continuing.');
    } catch (e) {
      console.error('Error in handleOkayGotIt:', e);
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