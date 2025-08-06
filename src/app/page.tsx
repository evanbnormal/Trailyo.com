'use client'

import dynamic from 'next/dynamic';

// Dynamically import the entire app with no SSR to avoid React Router and document issues
const AppComponent = dynamic(() => import('../components/AppComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 w-8 h-8 mx-auto"></div>
    </div>
  ),
});

export default function App() {
  return <AppComponent />;
} 