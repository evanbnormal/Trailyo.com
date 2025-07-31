'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrailStep as TrailStepType } from '@/data/sampleTrail';
import { ArrowRight, ArrowLeft, Play, Youtube } from "lucide-react";
import { Button } from '@/components/ui/button';
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface TrailStepProps {
  step: TrailStepType;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const TrailStep: React.FC<TrailStepProps> = ({
  step,
  onNext,
  onPrev,
  isFirst,
  isLast,
}) => {
  const [videoCompleted, setVideoCompleted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Setup YouTube API listener when the component mounts
  useEffect(() => {
    // Reset video completion state when step changes
    setVideoCompleted(step.type !== 'video'); // If it's not a video, no need to wait
    
    // Only setup YouTube player API if this is a video step
    if (step.type === 'video' && iframeRef.current) {
      // Add YouTube API script if it doesn't exist
      if (typeof window !== 'undefined' && !window.YT) {
                      const tag = typeof document !== 'undefined' ? document.createElement('script') : null;
    if (tag && typeof document !== 'undefined') {
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = typeof document !== 'undefined' ? document.getElementsByTagName('script')[0] : null;
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }
      }

      // Function to initialize the YouTube player
      const initYouTubePlayer = () => {
        if (typeof window !== 'undefined' && window.YT && window.YT.Player && iframeRef.current) {
          const videoId = getYouTubeVideoId(step.source || '');
          
          // Create a new player
          new window.YT.Player(iframeRef.current, {
            videoId,
            events: {
              'onStateChange': (event: any) => {
                // Video has ended - YT.PlayerState.ENDED = 0
                if (event.data === 0) {
                  setVideoCompleted(true);
                }
              }
            }
          });
        }
      };

      // Initialize player when API is ready
      if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
        initYouTubePlayer();
      } else {
        // If the API isn't loaded yet, set up callback
        if (typeof window !== 'undefined') {
          window.onYouTubeIframeAPIReady = initYouTubePlayer;
        }
      }
    }
  }, [step]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 animate-slide-up">
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader className="border-b border-gray-50 bg-gray-50/50">
          <CardTitle className="text-xl font-medium">{step.title}</CardTitle>
          {step.duration && (
            <div className="text-sm text-gray-500">
              Estimated time: {step.duration} minutes
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {/* YouTube Video Embed */}
          {step.type === 'video' && step.source && (
            <div className="mb-6">
              <AspectRatio ratio={16 / 9} className="bg-gray-100 rounded-md overflow-hidden">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(step.source)}?enablejsapi=1`}
                  title={step.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </AspectRatio>
              {!videoCompleted && step.type === 'video' && (
                <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <Play className="h-4 w-4" /> Please watch the full video to continue
                </div>
              )}
            </div>
          )}
          
          {/* Thumbnail Display (for non-video content) */}
          {step.thumbnail && step.type !== 'video' && (
            <div className="mb-6">
              <AspectRatio ratio={16 / 9} className="bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={step.thumbnail} 
                  alt={`Thumbnail for ${step.title}`}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
          )}
          
          <div className="prose max-w-none">
            <p>{step.content}</p>
          </div>
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={onPrev}
              disabled={isFirst}
              className={isFirst ? "opacity-0" : ""}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            <Button
              onClick={onNext}
              disabled={step.type === 'video' && !videoCompleted}
              className="bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLast ? 'Complete' : 'Complete'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Add type definition for the YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Helper function to extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string): string => {
  // Handle different YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : url;
};

export default TrailStep;
