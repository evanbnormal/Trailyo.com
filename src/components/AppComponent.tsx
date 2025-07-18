'use client'

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
import ResetPassword from "@/pages/ResetPassword";

const queryClient = new QueryClient();

export default function AppComponent() {
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
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/publish-confirmation" element={<PublishConfirmation />} />
                <Route path="/trail-analytics/:trailId" element={<TrailAnalytics />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
} 