'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Trail } from '@/data/sampleTrail';
import InvestmentModal from './InvestmentModal';
import CompletionScreen from './CompletionScreen';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AspectRatio } from './ui/aspect-ratio';
import { ArrowRight, ArrowLeft, Play, Youtube, Eye, EyeOff, Lock, Check, Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsService } from '@/lib/analytics';

interface TrailViewerProps {
  trail: Trail;
}

const TrailViewer: React.FC<TrailViewerProps> = ({ trail }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showInvestmentModal, setShowInvestmentModal] = useState(true);
  const [investedAmount, setInvestedAmount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({});
  const [videoCompleted, setVideoCompleted] = useState<{ [key: number]: boolean }>({});
  const playersRef = useRef<{ [key: number]: any }>({});

  const currentStep = trail.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === trail.steps.length - 1;

  useEffect(() => {
    setShowInvestmentModal(true);
    // Track trail view
    analyticsService.trackTrailView(trail.id, trail.title);
  }, [trail.id, trail.title]);

  const handleInvest = (amount: number) => {
    setInvestedAmount(amount);
    setShowInvestmentModal(false);
  };

  const handleNext = () => {
    // Track step completion
    analyticsService.trackStepComplete(trail.id, currentStepIndex, currentStep.title);
    
    // Track video completion if this is a video step
    if (currentStep.type === 'video' && videoProgress[currentStepIndex] >= 80) {
      const watchTimeMinutes = (videoProgress[currentStepIndex] / 100) * 5; // Assuming 5 minute video
      analyticsService.trackVideoWatch(trail.id, currentStepIndex, currentStep.title, watchTimeMinutes);
    }
    
    if (isLastStep) {
      setCompleted(true);
      // Track trail completion
      analyticsService.trackTrailComplete(trail.id);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (index <= currentStepIndex) {
      setCurrentStepIndex(index);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setCompleted(false);
    setShowInvestmentModal(true);
    setVideoProgress({});
    setVideoCompleted({});
  };

  const getYouTubeVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  };

  const initializeYouTubePlayer = (stepIndex: number, videoId: string) => {
          if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      const player = new window.YT.Player(`youtube-player-${stepIndex}`, {
        videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          controls: 1, // Enable normal YouTube controls
          modestbranding: 1,
          rel: 0,
          showinfo: 0, // Hide video title and uploader info
          iv_load_policy: 3, // Disable video annotations
        },
        events: {
          onStateChange: (event: any) => {
            if (typeof window !== 'undefined' && event.data === window.YT.PlayerState.PLAYING) {
              const interval = setInterval(() => {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                const progress = (currentTime / duration) * 100;
                
                setVideoProgress(prev => ({
                  ...prev,
                  [stepIndex]: progress
                }));

                if (progress >= 80) {
                  setVideoCompleted(prev => ({
                    ...prev,
                    [stepIndex]: true
                  }));
                  clearInterval(interval);
                }
              }, 1000);
            } else if (typeof window !== 'undefined' && event.data === window.YT.PlayerState.ENDED) {
              // Video ended, but only mark as completed if 80% was watched
              const currentProgress = videoProgress[stepIndex] || 0;
              if (currentProgress >= 80) {
                setVideoCompleted(prev => ({
                  ...prev,
                  [stepIndex]: true
                }));
              } else {
                // If video ended but user hasn't watched 80%, don't mark as completed
                console.log(`Video ended but only watched ${currentProgress}%, need 80% to complete`);
              }
            }
          },
          onReady: () => {
            playersRef.current[stepIndex] = player;
          }
        }
      });
    }
  };

  useEffect(() => {
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

    if (isOverviewMode) {
      trail.steps.forEach((step, index) => {
        if (step.type === 'video' && step.source) {
          const videoId = getYouTubeVideoId(step.source);
          setTimeout(() => {
            initializeYouTubePlayer(index, videoId);
          }, 100);
        }
      });
    }
  }, [isOverviewMode, trail.steps]);

  const isStepLocked = (index: number) => index > currentStepIndex;
  const isStepCompleted = (index: number) => index < currentStepIndex;
  const canProceed = currentStep.type === 'video' ? 
    (videoCompleted[currentStepIndex] || videoProgress[currentStepIndex] >= 80) : 
    true;

  if (!investedAmount && showInvestmentModal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InvestmentModal
          isOpen={showInvestmentModal}
          onClose={() => setShowInvestmentModal(false)}
          suggestedAmount={trail.suggestedInvestment}
          onInvest={handleInvest}
        />
      </div>
    );
  }

  if (completed) {
    return (
      <CompletionScreen 
        trail={{
          title: trail.title,
          creator: trail.creator
        }}
        investedAmount={investedAmount}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8">
        <header className="px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{trail.title}</h1>
              <p className="text-gray-600">Created by {trail.creator}</p>
            </div>
            <div className="flex items-center bg-black text-white py-2 px-4 rounded-full">
              <Coins className="h-4 w-4 mr-2" />
              <span className="font-medium">${investedAmount} invested</span>
            </div>
          </div>
        </header>

        <div className="px-4 mb-8">
          <Button
            variant="outline"
            onClick={() => setIsOverviewMode(!isOverviewMode)}
            className="flex items-center gap-2"
          >
            {isOverviewMode ? (
              <>
                <ArrowDownLeft className="h-4 w-4" />
                Focus Mode
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                Overview Mode
              </>
            )}
          </Button>
        </div>

        {isOverviewMode ? (
          <div className="px-4">
            <div className="grid gap-8">
              {trail.steps.map((step, index) => (
                <div key={index} className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`relative overflow-hidden transition-all duration-300 ${
                        isStepLocked(index) 
                          ? 'cursor-pointer hover:scale-[1.02]' 
                          : 'cursor-pointer hover:scale-[1.02]'
                      }`}
                      onClick={() => handleStepClick(index)}
                    >
                      <div className={`absolute inset-0 z-10 ${
                        isStepLocked(index) ? 'bg-blue-500/20 backdrop-blur-md' : ''
                      }`} />
                      
                      <CardHeader className="relative z-20">
                        <CardTitle className={`text-xl font-medium ${
                          isStepLocked(index) ? 'blur-sm' : ''
                        }`}>
                          {step.title}
                        </CardTitle>
                        {step.duration && (
                          <div className={`text-sm text-gray-500 ${
                            isStepLocked(index) ? 'blur-sm' : ''
                          }`}>
                            Estimated time: {step.duration} minutes
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="relative z-20">
                        {step.type === 'video' && step.source && (
                          <div className="mb-4 mt-4 relative">
                            <AspectRatio ratio={16 / 9} className="bg-gray-100 rounded-md overflow-hidden">
                              <div 
                                id={`youtube-player-${index}`}
                                className="w-full h-full"
                              />

                            </AspectRatio>
                          </div>
                        )}

                        {step.thumbnail && step.type !== 'video' && (
                          <div className="mb-4 mt-4">
                            <AspectRatio ratio={16 / 9} className="bg-gray-100 rounded-md overflow-hidden">
                              <img 
                                src={step.thumbnail} 
                                alt={`Thumbnail for ${step.title}`}
                                className="w-full h-full object-cover"
                              />
                            </AspectRatio>
                          </div>
                        )}

                        <div className={`prose max-w-none ${
                          isStepLocked(index) ? 'blur-sm' : ''
                        }`}>
                          <p>{step.content}</p>
                        </div>

                        {step.type === 'reward' && (
                          <div className={`mt-4 p-4 bg-green-50 rounded-lg border border-green-200 ${
                            isStepLocked(index) ? 'blur-sm' : ''
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-green-800">Reward Unlocked!</h4>
                                <p className="text-sm text-green-600">Complete this step to claim your reward</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-100"
                              >
                                Redeem
                              </Button>
                            </div>
                          </div>
                        )}

                        {index === currentStepIndex && (
                          <div className="flex justify-between items-center mt-6">
                            <Button
                              variant="outline"
                              onClick={handlePrev}
                              disabled={isFirstStep}
                              className={isFirstStep ? "opacity-0" : ""}
                            >
                              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-gray-200 flex items-center justify-center">
                                  {canProceed ? (
                                    <Check className="h-6 w-6 text-green-600" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-500" />
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={handleNext}
                                disabled={!canProceed}
                                className="bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isLastStep ? 'Complete' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>

                      {isStepLocked(index) && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg"
                          >
                            <Lock className="h-6 w-6 text-gray-600" />
                          </motion.div>
                        </div>
                      )}
                    </Card>
                  </motion.div>

                  {index < trail.steps.length - 1 && (
                    <div className="relative h-16 flex items-center justify-center">
                      <div className={`w-1 h-full ${
                        index < currentStepIndex ? 'bg-green-500' : 
                        index === currentStepIndex ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mx-4 relative">
            {/* Arrows in top right */}
            <div className="absolute top-4 right-4 flex gap-2 z-30">
              <Button size="icon" variant="ghost" onClick={handlePrev} disabled={isFirstStep}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleNext} disabled={isLastStep}>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center mb-4">
              <span className="bg-blue-500 text-white rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold">
                {currentStepIndex + 1}
              </span>
              <h2 className="text-xl font-bold text-gray-900 ml-3">{currentStep.title}</h2>
            </div>
            
            {currentStep.source && currentStep.type === 'video' && (
              <div className="aspect-video mb-4">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={currentStep.source}
                  title={currentStep.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <p className="text-gray-600 mb-6">{currentStep.content}</p>
            
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handlePrev} disabled={isFirstStep}>
                Previous
              </Button>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-gray-200 flex items-center justify-center">
                    {canProceed ? (
                      <Check className="h-6 w-6 text-green-600" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500" />
                    )}
                  </div>
                </div>
                <Button onClick={handleNext} disabled={!canProceed}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <Button
                variant="link"
                className="text-gray-500 underline"
                onClick={() => {
                  // Skip functionality would go here
                  console.log('Skip step clicked');
                }}
              >
                Skip this step
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default TrailViewer;
