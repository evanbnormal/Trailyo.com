'use client'

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const AppComponent = dynamic(() => import('../../components/AppComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 w-8 h-8 mx-auto"></div>
    </div>
  ),
});

export default function CatchAllPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 w-8 h-8 mx-auto"></div>
      </div>
    }>
      <AppComponent />
    </Suspense>
  );
}

