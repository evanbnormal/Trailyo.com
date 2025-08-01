'use client'

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const EmailConfirmedPage: React.FC = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Store user data in localStorage for auto-login
    const userDataParam = searchParams.get('userData');
    console.log('Email confirmed page - userDataParam:', userDataParam);
    
    if (userDataParam) {
      try {
        const userData = JSON.parse(userDataParam);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        console.log('User data stored for auto-login:', userData);
        console.log('localStorage after storing:', localStorage.getItem('currentUser'));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      console.log('No userData parameter found in URL');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-lg">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h1>
        <p className="text-gray-600 mb-4">
          Your account has been successfully verified.
        </p>
        <p className="text-gray-500 text-sm">
          You can now close this window and return to your trail.
        </p>
      </div>
    </div>
  );
};

export default EmailConfirmedPage; 