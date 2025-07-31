import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";

// Use React.lazy for proper lazy loading
const LearnerView = lazy(() => import('./pages/LearnerView'));
import CreatorView from "./pages/CreatorView";
import Profile from "./pages/Profile";
import PublishConfirmation from "./pages/PublishConfirmation";
import TrailAnalytics from "./pages/TrailAnalytics";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";

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

const App = () => (
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
              <Route path="/publish-confirmation" element={<PublishConfirmation />} />
              <Route path="/trail-analytics/:trailId" element={<TrailAnalytics />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ClientOnlyRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
