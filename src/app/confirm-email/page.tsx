'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const email = searchParams.get('email');
      
      if (!email) {
        setStatus('error');
        setMessage('No email provided for confirmation');
        return;
      }

      try {
        const response = await fetch(`/api/auth/confirm-email?email=${encodeURIComponent(email)}`);
        
        if (response.ok) {
          setStatus('success');
          setMessage('Email confirmed successfully! You can now sign in.');
        } else {
          const errorData = await response.json();
          setStatus('error');
          setMessage(errorData.error || 'Failed to confirm email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Failed to confirm email. Please try again.');
      }
    };

    confirmEmail();
  }, [searchParams]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/?showLogin=1');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-12 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirming your email...</h1>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Confirmed!</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="space-y-3">
              <Button onClick={handleSignIn} className="w-full bg-black hover:bg-black/90">
                Sign In
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirmation Failed</h1>
            <p className="text-gray-600 mb-8">{message}</p>
            <div className="space-y-3">
              <Button onClick={handleGoHome} className="w-full bg-black hover:bg-black/90">
                Go to Homepage
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-12 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmEmailContent />
    </Suspense>
  );
} 