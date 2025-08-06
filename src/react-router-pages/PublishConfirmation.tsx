import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Trail } from "@/lib/data";

const PublishConfirmation: React.FC = () => {
  const [publishedTrail, setPublishedTrail] = useState<Trail | null>(null);
  const [showTick, setShowTick] = useState(false);
  const navigate = useNavigate();
  const { user, getUserTrails } = useAuth();

  useEffect(() => {
    const fetchPublishedTrail = async () => {
      if (!user) {
        console.log('⏳ User not loaded yet, waiting...');
        return;
      }

      // First, try to get the trail from sessionStorage (passed from publish action)
      const publishedTrailData = sessionStorage.getItem('publishedTrail');
      if (publishedTrailData) {
        try {
          const trail = JSON.parse(publishedTrailData);
          console.log('📄 Found published trail in sessionStorage:', trail.title);
          console.log('🔗 Shareable link:', trail.shareableLink);
          
          // Generate shareable link if missing
          if (!trail.shareableLink) {
            trail.shareableLink = `${window.location.origin}/trail/${trail.id}`;
            console.log('🔗 Generated missing shareable link:', trail.shareableLink);
          }
          
          setPublishedTrail(trail);
          // Clear the sessionStorage after use
          sessionStorage.removeItem('publishedTrail');
          
          // Animate tick in after a short delay
          const timer = setTimeout(() => {
            setShowTick(true);
          }, 300);
          return () => clearTimeout(timer);
        } catch (error) {
          console.error('Error parsing published trail from sessionStorage:', error);
        }
      }

      // Fallback: Get the most recently published trail from user's data
      console.log('📄 No trail in sessionStorage, fetching from getUserTrails...');
      const userTrails = await getUserTrails();
      const { published } = userTrails;
      if (published.length > 0) {
        // Get the most recent one (last in array)
        const latestTrail = published[published.length - 1];
        console.log('📄 Found latest trail from getUserTrails:', latestTrail.title);
        console.log('🔗 Shareable link:', latestTrail.shareableLink);
        
        // Generate shareable link if missing
        if (!latestTrail.shareableLink) {
          latestTrail.shareableLink = `${window.location.origin}/trail/${latestTrail.id}`;
          console.log('🔗 Generated missing shareable link:', latestTrail.shareableLink);
        }
        
        setPublishedTrail(latestTrail);
      } else {
        // If no published trail found, show a message but don't auto-redirect
        console.log('📄 No published trails found in database');
        // Don't auto-redirect - let user decide when to leave the page
      }

      // Animate tick in after a short delay
      const timer = setTimeout(() => {
        setShowTick(true);
      }, 300);

      return () => clearTimeout(timer);
    };
    fetchPublishedTrail();
  }, [navigate, user, getUserTrails]);

  const copyShareLink = async () => {
    console.log('📋 Copy link clicked in PublishConfirmation');
    console.log('📋 Published trail:', publishedTrail?.title);
    console.log('📋 Shareable link:', publishedTrail?.shareableLink);
    
    if (publishedTrail?.shareableLink) {
      try {
        await navigator.clipboard.writeText(publishedTrail.shareableLink);
        toast.success('Link copied to clipboard!');
        console.log('📋 Link copied successfully');
      } catch (error) {
        console.error('📋 Failed to copy to clipboard:', error);
        // Fallback: create a temporary input and copy
        const textArea = document.createElement('textarea');
        textArea.value = publishedTrail.shareableLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copied to clipboard!');
        console.log('📋 Link copied using fallback method');
      }
    } else {
      console.log('📋 No shareable link available');
      toast.error('No shareable link available');
    }
  };

  if (!publishedTrail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-12 max-w-4xl w-full text-center">
        {/* Animated Green Tick */}
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-12">
          <CheckCircle 
            className={`h-16 w-16 text-green-500 transition-all duration-700 ease-out ${
              showTick 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-75'
            }`} 
          />
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-12">Trail Published!</h1>

        {/* Shareable Link */}
        <div className="space-y-6 mb-12">
          <p className="text-gray-700 font-medium text-lg">Your shareable link:</p>
          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-lg">
            <input
              type="text"
              value={publishedTrail.shareableLink || 'Loading...'}
              readOnly
              className="flex-1 bg-transparent border-none outline-none text-lg font-normal text-gray-700"
              placeholder="Generating your shareable link..."
            />
            <Button size="sm" onClick={copyShareLink} className="h-12 w-12 p-0">
              <Copy className="h-6 w-6" />
            </Button>
          </div>
          {!publishedTrail.shareableLink && (
            <p className="text-sm text-red-500">
              Debug: Trail ID: {publishedTrail.id}, Title: {publishedTrail.title}
            </p>
          )}
        </div>

        {/* Go to Profile Button */}
        <Button 
          onClick={() => navigate('/profile')} 
          className="bg-black text-white hover:bg-black/90 px-8 py-3 text-lg"
        >
          Go to Profile
        </Button>
      </div>
    </div>
  );
};

export default PublishConfirmation; 