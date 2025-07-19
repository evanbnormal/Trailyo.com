import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import EmailConfirmationModal from './EmailConfirmationModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup, resetPassword } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Reset password form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [confirmationName, setConfirmationName] = useState('');

  const [showResetEmailPrompt, setShowResetEmailPrompt] = useState(false);
  const [resetRequestEmail, setResetRequestEmail] = useState('');
  const [resetRequestSent, setResetRequestSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginEmail, loginPassword);
      if (result === true) {
        onClose();
        onSuccess?.();
        setLoginEmail('');
        setLoginPassword('');
      } else if (result && typeof result === 'object' && result.status === 'unconfirmed_user') {
        setConfirmationEmail(loginEmail);
        setConfirmationName(result.name || '');
        setShowEmailConfirmation(true);
        onClose();
        setLoginEmail('');
        setLoginPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signup(signupEmail, signupPassword, signupName);
      if (result === true || result === 'unconfirmed_user') {
        setConfirmationEmail(signupEmail);
        setConfirmationName(signupName);
        setShowEmailConfirmation(true);
        onClose();
        setSignupName('');
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetNewPassword || !resetConfirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (resetNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const success = await resetPassword(resetEmail, resetNewPassword);
      if (success) {
        onClose();
        onSuccess?.();
        setResetEmail('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setIsResetPassword(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // Reset form states
      setLoginEmail('');
      setLoginPassword('');
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setResetEmail('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setIsSignUp(false);
      setIsResetPassword(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsResetPassword(false);
    // Clear form fields when switching modes
    setLoginEmail('');
    setLoginPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setResetEmail('');
    setResetNewPassword('');
    setResetConfirmPassword('');
  };

  const toggleResetPassword = () => {
    setIsResetPassword(!isResetPassword);
    setIsSignUp(false);
    // Clear form fields when switching modes
    setLoginEmail('');
    setLoginPassword('');
    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setResetEmail('');
    setResetNewPassword('');
    setResetConfirmPassword('');
  };

  const handleForgotPassword = () => {
    setShowResetEmailPrompt(true);
    setResetRequestEmail('');
    setResetRequestSent(false);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetRequestEmail) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      // Call backend API to send reset link
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetRequestEmail }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'EMAIL_NOT_FOUND') {
          toast.error('No account found with this email address');
        } else if (data.code === 'SENDGRID_AUTH_ERROR') {
          toast.error('Email service not configured. Please contact support.');
        } else {
          toast.error(data.error || 'Failed to send reset email');
        }
        return;
      }
      
      setResetRequestSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (error) {
      console.error('Reset email error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <img 
                src="/Logo Black.svg" 
                alt="Trailyo" 
                className="h-12 w-auto transform translate-x-2"
              />
            </div>
            <h2 className="text-lg font-semibold mb-3">
              {showResetEmailPrompt
                ? (resetRequestSent ? "Check Your Email" : "Reset Password")
                : isSignUp
                  ? "Sign Up"
                  : isResetPassword
                    ? "Reset Password"
                    : "Sign In"
              }
            </h2>
          </div>

          {/* Reset Email Prompt Modal */}
          {showResetEmailPrompt && (
            <div>
              {resetRequestSent ? (
                <div className="text-center space-y-4">
                  <p>We sent a password reset link to <span className="font-medium">{resetRequestEmail}</span>.</p>
                  <Button onClick={() => setShowResetEmailPrompt(false)} className="w-full bg-black hover:bg-black/90">Back to Sign In</Button>
                </div>
              ) : (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-request-email">Email</Label>
                    <Input
                      id="reset-request-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetRequestEmail}
                      onChange={e => setResetRequestEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-black hover:bg-black/90" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => setShowResetEmailPrompt(false)} className="text-sm text-gray-600 underline hover:text-gray-800">Back to Sign In</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Main Login/Signup/Reset UI (hidden if reset email prompt is open) */}
          {!showResetEmailPrompt && (
            <>
              {isSignUp ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password (min 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-black/90" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-sm text-gray-600 underline hover:text-gray-800"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
              ) : isResetPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-new-password">New Password</Label>
                    <Input
                      id="reset-new-password"
                      type="password"
                      placeholder="Enter new password (min 6 characters)"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
                    <Input
                      id="reset-confirm-password"
                      type="password"
                      placeholder="Confirm your new password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-black/90" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleResetPassword}
                      className="text-sm text-gray-600 underline hover:text-gray-800"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-black/90" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                  
                  <div className="text-center space-y-2">
                    <div className="flex justify-center gap-4">
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="text-sm text-gray-600 underline hover:text-gray-800"
                      >
                        Create an account
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-gray-600 underline hover:text-gray-800"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <EmailConfirmationModal
        isOpen={showEmailConfirmation}
        onClose={() => setShowEmailConfirmation(false)}
        email={confirmationEmail}
        name={confirmationName}
      />
    </>
  );
};

export default LoginModal; 