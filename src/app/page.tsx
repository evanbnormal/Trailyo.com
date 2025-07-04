'use client'

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Home from "@/pages/Home";
import LearnerView from "@/pages/LearnerView";
import CreatorView from "@/pages/CreatorView";
import Profile from "@/pages/Profile";
import PublishConfirmation from "@/pages/PublishConfirmation";
import TrailAnalytics from "@/pages/TrailAnalytics";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Dynamically import the app component with no SSR to avoid React Router issues
const AppComponent = dynamic(() => import('../components/AppComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 w-8 h-8 mx-auto"></div>
    </div>
  ),
});

export default function App() {
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