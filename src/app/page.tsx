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
import Settings from "@/pages/Settings";
import ResetPassword from "@/pages/ResetPassword";
import PublishConfirmation from "@/pages/PublishConfirmation";
import TrailAnalytics from "@/pages/TrailAnalytics";

// Dynamically import all components with no SSR to avoid React Router issues
const AppComponent = dynamic(() => import('../components/AppComponent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 w-8 h-8 mx-auto"></div>
    </div>
  ),
});

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen">
              <Navigation />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/learn" element={<LearnerView />} />
                <Route path="/trail/:trailId" element={<LearnerView />} />
                <Route path="/test-trail" element={<LearnerView />} />
                <Route path="/creator" element={<CreatorView />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/publish-confirmation" element={<PublishConfirmation />} />
                <Route path="/trail-analytics/:trailId" element={<TrailAnalytics />} />
                {/* Removed NotFound route to prevent SSR issues */}
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
} 