'use client'

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Home from "@/react-router-pages/Home";

// Use React.lazy for proper lazy loading
const LearnerView = lazy(() => import('../react-router-pages/LearnerView'));
import CreatorView from "@/react-router-pages/CreatorView";
import Profile from "@/react-router-pages/Profile";
import Settings from "@/react-router-pages/Settings";
import ResetPassword from "@/react-router-pages/ResetPassword";
import PublishConfirmation from "@/react-router-pages/PublishConfirmation";
import TrailAnalytics from "@/react-router-pages/TrailAnalytics";

const queryClient = new QueryClient();

// Client-side only router wrapper to prevent SSR issues
const ClientOnlyRouter = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Show a loading state during SSR/hydration
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <BrowserRouter>{children}</BrowserRouter>;
};

// Simple NotFound component
const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-gray-600 mb-8">Page not found</p>
      <a href="/" className="text-blue-600 hover:text-blue-800 underline">
        Go back home
      </a>
    </div>
  </div>
);

const AppComponent = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ClientOnlyRouter>
          <div className="min-h-screen">
            <Navigation />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learn" element={
                <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg">Loading trail...</div></div>}>
                  <LearnerView />
                </Suspense>
              } />
              <Route path="/trail/:trailId" element={
                <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg">Loading trail...</div></div>}>
                  <LearnerView />
                </Suspense>
              } />
              <Route path="/test-trail" element={
                <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-lg">Loading trail...</div></div>}>
                  <LearnerView />
                </Suspense>
              } />
              <Route path="/creator" element={<CreatorView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/publish-confirmation" element={<PublishConfirmation />} />
              <Route path="/trail-analytics/:trailId" element={<TrailAnalytics />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ClientOnlyRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AppComponent; 