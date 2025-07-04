import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TrailStep } from "@/data/sampleTrail";

interface Trail {
  id: string;
  title: string;
  description: string;
  status: 'published' | 'draft';
  createdAt: string;
  views: number;
  earnings: number;
  steps: TrailStep[];
  thumbnailUrl?: string;
  shareableLink?: string;
  suggestedInvestment?: number;
}

const PublishConfirmation: React.FC = () => {
  const [publishedTrail, setPublishedTrail] = useState<Trail | null>(null);
  const [showTick, setShowTick] = useState(false);
  const navigate = useNavigate();
  const { user, getUserTrails } = useAuth();

  useEffect(() => {
    const fetchPublishedTrail = async () => {
      if (!user) {
        navigate('/profile');
        return;
      }

      // Get the most recently published trail from user's data
      const userTrails = await getUserTrails();
      const { published } = userTrails;
      if (published.length > 0) {
        // Get the most recent one (last in array)
        const latestTrail = published[published.length - 1];
        setPublishedTrail(latestTrail);
      } else {
        // If no published trail found, redirect to profile
        navigate('/profile');
      }

      // Animate tick in after a short delay
      const timer = setTimeout(() => {
        setShowTick(true);
      }, 300);

      return () => clearTimeout(timer);
    };
    fetchPublishedTrail();
  }, [navigate, user, getUserTrails]);

  const copyShareLink = () => {
    if (publishedTrail?.shareableLink) {
      navigator.clipboard.writeText(publishedTrail.shareableLink);
      toast.success('Link copied to clipboard!');
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
              value={publishedTrail.shareableLink || ''}
              readOnly
              className="flex-1 bg-transparent border-none outline-none text-lg font-normal text-gray-700"
            />
            <Button size="sm" onClick={copyShareLink} className="h-12 w-12 p-0">
              <Copy className="h-6 w-6" />
            </Button>
          </div>
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