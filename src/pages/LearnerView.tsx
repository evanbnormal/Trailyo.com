'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ArrowLeft, ArrowRight, Check, Lock, Unlock, Gift, Expand, Shrink, PartyPopper } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TrailProgress from '@/components/TrailProgress';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { analyticsService } from '@/lib/analytics';
import { StripePayment } from '@/components/StripePayment';

interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'reward';
  source: string;
  thumbnailUrl?: string;
  isSaved?: boolean;
  duration?: number;
}

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
  trailValue?: number;
  trailCurrency?: string;
  creator?: string;
}

const LearnerView: React.FC = () => {
  const { trailId } = useParams<{ trailId: string }>();
  const navigate = useNavigate();
  const { getUserTrails, saveUserTrail, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  console.log('LearnerView mounted. trailId:', trailId);

  const [trail, setTrail] = useState<Trail | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressStepIndex, setProgressStepIndex] = useState(0); // Track actual progress
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [playConfetti, setPlayConfetti] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipToStep, setSkipToStep] = useState<number | null>(null);
  const [trailLoaded, setTrailLoaded] = useState(false);
  const [tipAmount, setTipAmount] = useState(25); // Move tipAmount state to top level
  const [tipCompleted, setTipCompleted] = useState(false); // Track if user has tipped or skipped
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [skipPaymentAmount, setSkipPaymentAmount] = useState(0);
  const [skipPaymentTarget, setSkipPaymentTarget] = useState<number | null>(null);
  
  // Video tracking
  const [videoWatchTime, setVideoWatchTime] = useState<Record<number, number>>({});
  const [videoCompleted, setVideoCompleted] = useState<Record<number, boolean>>({});
  const watchTimeRef = useRef<Record<number, { startTime: number; totalWatched: number; isPlaying: boolean }>>({});
  const playersRef = useRef<Record<number, any>>({});

  // Handle trailId parameter (could be 'test' or actual ID)
  const actualTrailId = trailId === 'test' ? null : trailId;

  const [windowStart, setWindowStart] = useState(0);
  const [windowEnd, setWindowEnd] = useState(2);

  // Update tip amount when trail changes
  useEffect(() => {
    if (trail?.suggestedInvestment) {
      setTipAmount(trail.suggestedInvestment);
    }
  }, [trail?.suggestedInvestment]);

  // Update window when currentStepIndex or trail changes
  useEffect(() => {
    if (!trail?.steps) return;
    const totalSteps = trail.steps.length;
    let start = Math.max(0, currentStepIndex - 1);
    let end = Math.min(totalSteps - 1, currentStepIndex + 1);
    if (end - start < 2) {
      if (start === 0) end = Math.min(totalSteps - 1, start + 2);
      else if (end === totalSteps - 1) start = Math.max(0, end - 2);
    }
    setWindowStart(start);
    setWindowEnd(end);
  }, [currentStepIndex, trail?.steps]);

  useEffect(() => {
    console.log('LearnerView useEffect running. trailId:', trailId, 'actualTrailId:', actualTrailId);
    let isMounted = true;

    const loadTrail = async () => {
      if (!actualTrailId) return;

      console.log('Loading trail with ID:', actualTrailId);

      // First try to find the trail in current user's trails
      const userTrails = await getUserTrails();
      const { drafts, published } = userTrails;
      const allUserTrails = [...drafts, ...published];
      console.log('User trails:', allUserTrails.map(t => ({ id: t.id, title: t.title })));
      
      const foundTrail = allUserTrails.find(t => t.id === actualTrailId);
      
      // If not found in user's trails, search through all published trails from all users
      if (!foundTrail) {
        console.log('Trail not found in user trails, searching all users...');
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        console.log('All users:', allUsers);
        
        for (const user of allUsers) {
          const userPublished = JSON.parse(localStorage.getItem(`user_${user.id}_published`) || '[]');
          console.log(`User ${user.id} published trails:`, userPublished.map(t => ({ id: t.id, title: t.title })));
          const foundTrail = userPublished.find(t => t.id === actualTrailId);
          if (foundTrail) {
            console.log('Found trail in user:', user.id);
            break;
          }
        }
      }
      
      if (foundTrail && isMounted) {
        console.log('Setting trail:', foundTrail.title);
        setTrail(foundTrail);
        setTrailLoaded(true);
        
        // Track trail view
        analyticsService.trackTrailView(actualTrailId, foundTrail.title);
      } else if (isMounted) {
        console.log('Trail not found anywhere, showing error');
        // Trail not found, show error instead of redirecting
        setTrail(null);
        setTrailLoaded(true);
      }
    };

    // Fallback trail for testing
    const fallbackTrail: Trail = {
      id: 'demo-trail',
      title: 'Demo Learning Trail',
      description: 'This is a demonstration trail to test the learner view functionality.',
      status: 'published',
      createdAt: new Date().toISOString(),
      views: 0,
      earnings: 0,
      steps: [
        { 
          id: 'step-1', 
          title: 'Welcome to the Demo', 
          content: 'This is a demonstration of the learner view. You can test all the features here.', 
          type: 'video' as const, 
          source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
          thumbnailUrl: '', 
          isSaved: true 
        },
        { 
          id: 'step-2', 
          title: 'Test Skip Functionality', 
          content: 'This step allows you to test the skip functionality. Try using the skip button!', 
          type: 'video' as const, 
          source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
          thumbnailUrl: '', 
          isSaved: true 
        },
        { 
          id: 'reward-1', 
          title: '🎉 Demo Reward', 
          content: 'Congratulations! You\'ve reached the reward step. This will trigger the confetti animation!', 
          type: 'reward' as const, 
          source: 'https://example.com/demo-reward', 
          thumbnailUrl: '', 
          isSaved: true 
        }
      ],
      thumbnailUrl: '',
      shareableLink: '',
      suggestedInvestment: 25,
      trailValue: 150,
      trailCurrency: 'USD',
      creator: 'Evan Brady'
    };

    // Handle different cases
    if (trailId === 'test' || !trailId) {
      // Load fallback trail for test route or when no trailId
      console.log('Loading fallback trail for test route');
      if (isMounted) {
        setTrail({
          ...fallbackTrail,
          status: fallbackTrail.status || 'published',
          createdAt: fallbackTrail.createdAt || new Date().toISOString(),
          views: fallbackTrail.views || 0,
          earnings: fallbackTrail.earnings || 0,
        } as Trail);
        setTrailLoaded(true);
        // Track trail view for demo trail
        analyticsService.trackTrailView('demo-trail', fallbackTrail.title);
      }
    } else if (actualTrailId) {
      // Load actual trail by ID
      loadTrail();
    } else {
      // Invalid trailId, show error
      if (isMounted) {
        console.log('Invalid trailId:', trailId);
        setTrail(null);
        setTrailLoaded(true);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [actualTrailId, getUserTrails, navigate, trailId]);

  // Reset trail loaded state when trailId changes
  useEffect(() => {
    setTrailLoaded(false);
    setTrail(null);
  }, [actualTrailId]);

  const currentStep = trail?.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === (trail?.steps.length || 0) - 1;

  // Calculate step value for skipping
  const stepValue = useMemo(() => {
    if (!trail?.trailValue || !trail?.steps) return 0;
    return Math.round(trail.trailValue / trail.steps.length);
  }, [trail?.trailValue, trail?.steps]);

  // Calculate skip cost for a specific step
  const getSkipCost = (targetStep: number) => {
    if (!trail?.trailValue || !trail?.steps) return 0;
    const stepsToSkip = targetStep - currentStepIndex;
    return Math.round((trail.trailValue / trail.steps.length) * stepsToSkip);
  };

  // Video watch time tracking with proper time tracking
  const getYouTubeVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const initializeYouTubePlayer = (stepIndex: number, videoId: string) => {
    // Destroy existing player if it exists
    if (playersRef.current[stepIndex]) {
      try {
        playersRef.current[stepIndex].destroy();
      } catch (error) {
        console.log('Player already destroyed');
      }
      playersRef.current[stepIndex] = null;
    }

    // Use different player IDs for overview vs focused view
    const playerId = isOverviewMode ? `youtube-player-overview-${stepIndex}` : `youtube-player-${stepIndex}`;
    
    // Check if the DOM element exists
    const element = document.getElementById(playerId);
    if (!element) {
      console.log(`Player element ${playerId} not found, skipping initialization`);
      return;
    }

    if (window.YT && window.YT.Player) {
      console.log(`Initializing YouTube player for step ${stepIndex} with video ${videoId}`);
      
      const player = new window.YT.Player(playerId, {
        videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
          disablekb: 1, // Disable keyboard controls
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              // Start tracking watch time
              if (!watchTimeRef.current[stepIndex]) {
                watchTimeRef.current[stepIndex] = { startTime: Date.now(), totalWatched: 0, isPlaying: false };
              }
              watchTimeRef.current[stepIndex].isPlaying = true;
              watchTimeRef.current[stepIndex].startTime = Date.now();
              
              const interval = setInterval(() => {
                if (watchTimeRef.current[stepIndex]?.isPlaying) {
                  const currentTime = Date.now();
                  const elapsed = (currentTime - watchTimeRef.current[stepIndex].startTime) / 1000;
                  watchTimeRef.current[stepIndex].totalWatched += elapsed;
                  watchTimeRef.current[stepIndex].startTime = currentTime;
                  
                  const duration = player.getDuration();
                  const watchedPercentage = (watchTimeRef.current[stepIndex].totalWatched / duration) * 100;
                  
                  setVideoWatchTime(prev => ({
                    ...prev,
                    [stepIndex]: watchedPercentage
                  }));

                  if (watchedPercentage >= 80) {
                    setVideoCompleted(prev => ({
                      ...prev,
                      [stepIndex]: true
                    }));
                    clearInterval(interval);
                  }
                }
              }, 1000);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              // Pause tracking
              if (watchTimeRef.current[stepIndex]) {
                watchTimeRef.current[stepIndex].isPlaying = false;
              }
            } else if (event.data === window.YT.PlayerState.ENDED) {
              // Video ended, mark as completed
              if (watchTimeRef.current[stepIndex]) {
                watchTimeRef.current[stepIndex].isPlaying = false;
              }
              setVideoCompleted(prev => ({
                ...prev,
                [stepIndex]: true
              }));
            }
          },
          onReady: () => {
            console.log(`YouTube player ready for step ${stepIndex}`);
            playersRef.current[stepIndex] = player;
          },
          onError: (event: any) => {
            console.error(`YouTube player error for step ${stepIndex}:`, event.data);
          }
        }
      });
    } else {
      console.log('YouTube API not ready, will retry later');
    }
  };

  // Clean up players when component unmounts or step changes
  useEffect(() => {
    return () => {
      // Destroy all players on cleanup
      Object.values(playersRef.current).forEach(player => {
        if (player && player.destroy) {
          player.destroy();
        }
      });
      playersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      // Set up the callback for when YouTube API is ready
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready');
        // Trigger re-initialization when API becomes available
        if (trail?.steps) {
          if (isOverviewMode) {
            trail.steps.forEach((step, index) => {
              if (step.type === 'video' && step.source) {
                const videoId = getYouTubeVideoId(step.source);
                if (videoId) {
                  setTimeout(() => initializeYouTubePlayer(index, videoId), 100);
                }
              }
            });
          } else if (currentStep?.type === 'video' && currentStep?.source) {
            const videoId = getYouTubeVideoId(currentStep.source);
            if (videoId) {
              setTimeout(() => initializeYouTubePlayer(currentStepIndex, videoId), 100);
            }
          }
        }
      };
    }

    // Initialize players for all video steps in overview mode
    if (isOverviewMode && trail?.steps) {
      trail.steps.forEach((step, index) => {
        if (step.type === 'video' && step.source) {
          const videoId = getYouTubeVideoId(step.source);
          if (videoId) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
              initializeYouTubePlayer(index, videoId);
            }, 300);
            
            return () => clearTimeout(timer);
          }
        }
      });
    }
    // Initialize only the current step's player in focused view
    else if (!isOverviewMode && trail?.steps && currentStep?.type === 'video' && currentStep?.source) {
      const videoId = getYouTubeVideoId(currentStep.source);
      if (videoId) {
        // Longer delay to ensure DOM is ready and animation is complete
        const timer = setTimeout(() => {
          initializeYouTubePlayer(currentStepIndex, videoId);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentStepIndex, currentStep?.source, currentStep?.type, isOverviewMode, trail?.steps]);

  const canProceed = currentStep?.type === 'video' ? 
    (videoCompleted[currentStepIndex] || (videoWatchTime[currentStepIndex] || 0) >= 80) : 
    true;

  // Function to calculate canProceed for any step (for overview mode)
  const canStepProceed = (stepIndex: number) => {
    const step = trail?.steps[stepIndex];
    if (!step) return false;
    
    return step.type === 'video' ? 
      (videoCompleted[stepIndex] || (videoWatchTime[stepIndex] || 0) >= 80) : 
      true;
  };

  // Debug logging
  useEffect(() => {
    if (currentStep?.type === 'video') {
      console.log(`Step ${currentStepIndex}: watchTime=${videoWatchTime[currentStepIndex] || 0}%, canProceed=${canProceed}, videoCompleted=${videoCompleted[currentStepIndex]}`);
    }
  }, [currentStepIndex, videoWatchTime, canProceed, videoCompleted, currentStep?.type]);

  const handleNext = () => {
    if (!trail) return;

    const currentStep = trail.steps[currentStepIndex];
    if (!currentStep) return;

    // Track step completion
    analyticsService.trackStepComplete(trail.id, currentStepIndex, currentStep.title);

    // If this is a video step, track video completion
    if (currentStep.type === 'video' && videoWatchTime[currentStepIndex]) {
      const watchTime = videoWatchTime[currentStepIndex];
      analyticsService.trackVideoWatch(trail.id, currentStepIndex, currentStep.title, watchTime);
    }

    // Mark current step as completed
    const newCompletedSteps = new Set(completedSteps);
    newCompletedSteps.add(currentStepIndex);
    setCompletedSteps(newCompletedSteps);

    // Check if this is the final step
    if (currentStepIndex === trail.steps.length - 1) {
      setCompleted(true);
      // Track trail completion
      analyticsService.trackTrailComplete(trail.id);
      return;
    }

    // Move to next step
    const nextStepIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextStepIndex);
    setProgressStepIndex(Math.max(progressStepIndex, nextStepIndex - 1));

    // Confetti for reward step
    const nextStep = trail.steps[nextStepIndex];
    if (nextStep?.type === 'reward') {
      setPlayConfetti(true);
    }
  };

  // New function for overview mode - handles Next button for any step
  const handleStepNext = (stepIndex: number) => {
    if (!trail) return;

    console.log(`Completing step ${stepIndex}, moving to step ${stepIndex + 1}`);
    console.log(`Before: progressStepIndex=${progressStepIndex}, completedSteps=${Array.from(completedSteps)}`);

    // Add current step to completed steps
    setCompletedSteps(prev => new Set([...prev, stepIndex]));

    // Check if next step is a reward step
    const nextStep = trail.steps[stepIndex + 1];
    if (nextStep?.type === 'reward') {
      setPlayConfetti(true);
    }

    // If current step has a source and is not a video, open the link
    const currentStep = trail.steps[stepIndex];
    if (currentStep?.source && currentStep?.type !== 'video') {
      window.open(currentStep.source, '_blank');
    }

    const isLastStep = stepIndex === trail.steps.length - 1;
    if (isLastStep) {
      // Trail completed
      setCompleted(true);
      toast({
        title: "Congratulations!",
        description: "You have completed the trail!",
      });
    } else {
      const nextStepIndex = stepIndex + 1;
      // Update progress to unlock next step
      setProgressStepIndex(Math.max(progressStepIndex, nextStepIndex));
      
      console.log(`After: progressStepIndex will be ${Math.max(progressStepIndex, nextStepIndex)}, next step should be unlocked`);
      
      // Smooth scroll to the next step card in overview mode
      if (isOverviewMode) {
        setTimeout(() => {
          const nextStepElement = document.getElementById(`step-card-${nextStepIndex}`);
          if (nextStepElement) {
            // Scroll to the next step card with more offset
            const headerHeight = 100; // Reduced header height for better positioning
            const elementTop = nextStepElement.offsetTop;
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Always scroll down to the next step, ensuring it's well in view
            const targetScrollTop = elementTop - headerHeight;
            
            // Only scroll if we need to move down
            if (targetScrollTop > currentScrollTop) {
              window.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
              });
            }
          }
        }, 100); // Small delay to ensure state updates are processed
      }
    }
  };

  // Focused view specific Next handler with slide animation
  const handleFocusedNext = () => {
    if (!trail) return;

    console.log(`Completing step ${currentStepIndex}, moving to step ${currentStepIndex + 1}`);
    console.log(`Before: progressStepIndex=${progressStepIndex}, completedSteps=${Array.from(completedSteps)}`);

    // Set slide direction for animation
    setSlideDirection('right');

    // Add current step to completed steps
    setCompletedSteps(prev => new Set([...prev, currentStepIndex]));

    // Check if next step is a reward step
    const nextStep = trail.steps[currentStepIndex + 1];
    if (nextStep?.type === 'reward') {
      setPlayConfetti(true);
    }

    // If current step has a source and is not a video, open the link
    if (currentStep?.source && currentStep?.type !== 'video') {
      window.open(currentStep.source, '_blank');
    }

    if (isLastStep) {
      // Trail completed
      setCompleted(true);
      toast({
        title: "Congratulations!",
        description: "You have completed the trail!",
      });
    } else {
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextStepIndex);
      setProgressStepIndex(nextStepIndex); // Advance progress to unlock next step
      
      console.log(`After: progressStepIndex will be ${nextStepIndex}, next step should be unlocked`);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setSlideDirection('left');
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Arrow navigation functions that respect locking
  const handleArrowPrev = () => {
    if (currentStepIndex > 0) {
      setSlideDirection('left');
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleArrowNext = () => {
    if (currentStepIndex < (trail?.steps.length || 0) - 1) {
      setSlideDirection('right');
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSkipStep = () => {
    if (skipToStep === null || !trail) return;

    // Track step skip with cost
    const skipCost = getSkipCost(skipToStep);
    const currentStep = trail.steps[currentStepIndex];
    analyticsService.trackStepSkip(trail.id, currentStepIndex, currentStep.title, skipCost);

    // Instantly mark all previous steps as completed (no animation)
    const newCompletedSteps = new Set(completedSteps);
    for (let i = currentStepIndex; i < skipToStep; i++) {
      newCompletedSteps.add(i);
    }
    setCompletedSteps(newCompletedSteps);

    setCurrentStepIndex(skipToStep);
    setProgressStepIndex(skipToStep - 1); // Only unlock up to the previous step
    setShowSkipDialog(false);
    setSkipToStep(null);

    // Confetti for reward step
    const targetStep = trail.steps[skipToStep];
    if (targetStep?.type === 'reward') {
      setPlayConfetti(true);
    }

    toast({
      title: "Step skipped",
      description: `Skipped to step ${skipToStep + 1}`,
    });
  };

  const [showSkipToStepDialog, setShowSkipToStepDialog] = useState(false);
  const [skipTargetStep, setSkipTargetStep] = useState<number | null>(null);
  const [lockHovered, setLockHovered] = useState(false);
  const [lockHoveredIndex, setLockHoveredIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  const handleStepClick = (index: number) => {
    if (isStepLocked(index)) {
      setSkipTargetStep(index);
      setShowSkipToStepDialog(true);
    } else {
      setCurrentStepIndex(index);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setProgressStepIndex(0); // Reset progress
    setCompletedSteps(new Set());
    setCompleted(false);
    setTipCompleted(false); // Reset tip completion state
    setVideoWatchTime({});
    setVideoCompleted({});
  };

  const isStepLocked = (index: number) => index > progressStepIndex;

  // Progress calculation
  const progressPercentage = useMemo(() => {
    if (!trail?.steps) return 0;
    // Calculate progress based on how far we've advanced through the trail
    // Start at 0% for step 1, and progress through each step
    const progress = Math.max(0, progressStepIndex);
    const totalSteps = trail.steps.length;
    return Math.round((progress / totalSteps) * 100);
  }, [progressStepIndex, trail?.steps]);

  const { width, height } = useWindowSize();

  if (!trail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trail Not Found</h1>
          <p className="text-gray-600 mb-4">The trail you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (completed) {
    // Calculate percentage of trail value
    const actualTipAmount = tipAmount || trail?.suggestedInvestment || 25;
    const tipPercentage = trail?.trailValue ? ((actualTipAmount / trail.trailValue) * 100).toFixed(0) : '0';
    
    // Show second completion page if user has tipped or skipped
    if (tipCompleted) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Done!</h1>
              <p className="text-gray-600">Thanks for completing "{trail.title}".</p>
            </div>
            <div className="space-y-3">
              <Button onClick={handleRestart} className="w-full">
                Restart Trail
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Trail Completed!</h1>
            <p className="text-xl text-gray-600 mb-8">Congratulations! You've successfully completed "{trail.title}".</p>
          </div>

          {/* Tip CTA - Front and Centre */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mr-4">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold text-gray-900">Support the Creator</h2>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="flex flex-col gap-3 items-center">
                <div className="relative w-80">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                    placeholder={`${trail?.suggestedInvestment || 25}`}
                    className="text-2xl font-bold text-yellow-600 bg-white border-2 border-yellow-300 rounded-lg outline-none text-center pl-8 pr-4 w-full h-12 placeholder:text-yellow-400 placeholder:opacity-60 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 transition-all duration-200"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <Button 
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 px-8 py-3 text-lg font-semibold shadow-lg w-80 flex items-center justify-center"
                  onClick={() => {
                    const finalTipAmount = tipAmount || trail?.suggestedInvestment || 25;
                    
                    // Track tip donation
                    analyticsService.trackTipDonated(trail.id, finalTipAmount);
                    
                    toast({
                      title: "Thank you!",
                      description: `You've tipped $${finalTipAmount} to ${trail.creator || 'the creator'}.`,
                    });
                    setTipCompleted(true);
                  }}
                >
                  <Gift className="h-5 w-5 mr-2" />
                  <span>Tip ${tipAmount || 0}</span>
                  {trail?.trailValue && (
                    <span className="ml-2 text-white line-through text-sm opacity-70">
                      ${trail.trailValue}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-gray-500 underline text-sm py-2"
                onClick={() => {
                  toast({
                    title: "No worries!",
                    description: "You can always tip later from your profile.",
                  });
                  setTipCompleted(true);
                }}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {playConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={1.2}
          friction={0.85}
          wind={0.05}
          opacity={0.9}
          tweenDuration={1500}
          onConfettiComplete={() => setPlayConfetti(false)}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
        />
      )}
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="flex flex-row items-center justify-between px-6 md:px-16 pt-8 pb-2 mb-16">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 truncate overflow-hidden whitespace-nowrap">{trail.title}</h1>
            <p className="text-gray-600">{trail.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-700 font-semibold">{trail.creator || 'Evan Brady'}</span>
              <span className="inline-flex items-center justify-center w-5 h-5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#2196F3" />
                  <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center justify-end gap-4 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setIsOverviewMode(!isOverviewMode)}
              className="flex items-center gap-2"
            >
              {isOverviewMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              {isOverviewMode ? 'Focus View' : 'Overview'}
            </Button>
            {/* Reward Progress Tracker */}
            <div className="relative flex flex-col items-center">
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16" viewBox="0 0 44 44">
                  {/* Background circle */}
                  <circle
                    cx="22" cy="22" r="18"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="3"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="22" cy="22" r="18"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="113.1"
                    strokeDashoffset="113.1"
                    initial={{ strokeDashoffset: 113.1 }}
                    animate={{ strokeDashoffset: 113.1 - ((progressPercentage / 100) * 113.1) }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gift className="h-9 w-9 text-yellow-500" fill="none" />
                </div>
              </div>
              <motion.span 
                className="block text-center text-sm font-semibold text-gray-700 mt-1"
                key={progressPercentage}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {Math.round(progressPercentage)}%
              </motion.span>
            </div>
          </div>
        </div>

        {/* Dot-to-dot stepper above the card in focused view */}
        {!isOverviewMode && trail && (
          <div className="mb-6 flex justify-center">
            <TrailProgress
              totalSteps={trail.steps.length}
              currentStep={currentStepIndex}
              windowStart={windowStart}
              windowEnd={windowEnd}
              completedSteps={completedSteps}
              onStepClick={setCurrentStepIndex}
              onWindowChange={(newStart) => {
                // Instead of scrolling the window, move to the previous/next step
                if (newStart < windowStart) {
                  setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                } else {
                  setCurrentStepIndex((prev) => Math.min(trail.steps.length - 1, prev + 1));
                }
              }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center pb-8">
          {isOverviewMode ? (
            <div className="px-4 max-w-4xl mx-auto w-full">
              <div className="flex flex-col items-center w-full">
                {trail.steps.map((step, index) => (
                  <div key={index} className="relative w-full">
                    <Card 
                      id={`step-card-${index}`}
                      className={`relative overflow-hidden transition-all duration-300 mb-12 ${isStepLocked(index) ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-pointer hover:scale-[1.02]'}`}
                      onClick={() => handleStepClick(index)}
                      onMouseEnter={isStepLocked(index) ? () => setLockHoveredIndex(index) : undefined}
                      onMouseLeave={isStepLocked(index) ? () => setLockHoveredIndex(null) : undefined}>
                      <div className="bg-gray-50 rounded-lg shadow-md w-full relative flex flex-col justify-between min-h-[400px] max-h-screen overflow-y-auto sm:max-h-none sm:overflow-visible">
                        {/* Step number/icon and title - same as focused view (NEVER blurred) */}
                        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                          <div className={`flex items-center mb-6`}>
                            {step.type === 'reward' ? (
                              <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-full h-12 w-12 flex items-center justify-center text-lg font-bold shadow-lg">
                                <Gift className="h-6 w-6" />
                              </div>
                            ) : (
                              <span className="bg-black text-white rounded-full h-12 w-12 flex items-center justify-center text-lg font-bold">
                                {index + 1}
                              </span>
                            )}
                            <h2 className={`text-3xl font-bold ml-4 ${step.type === 'reward' ? 'text-amber-700' : 'text-gray-900'}`}>
                              {step.title}
                            </h2>
                          </div>
                        </div>
                        
                        {/* Full-width border */}
                        <div className="border-t border-gray-200" />
                        
                        {/* Content section - same as focused view (blur applied here) */}
                        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
                          <div className="relative">
                            {/* Lock icon for locked steps in overview mode - centered */}
                            {isStepLocked(index) && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className={`bg-white rounded-full p-3 shadow-lg transition-transform duration-300 ease-in-out ${lockHoveredIndex === index ? 'scale-110' : 'scale-100'}`}> 
                                  <span className="transition-all duration-300 ease-in-out">
                                    {lockHoveredIndex === index ? (
                                      <Unlock className="h-7 w-7 text-gray-600" />
                                    ) : (
                                      <Lock className="h-7 w-7 text-gray-600" />
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className={`${isStepLocked(index) ? 'blur-[16px] pointer-events-auto select-none relative cursor-pointer' : ''}`}>
                              {step.type === 'video' && step.source && (
                                <div className={`aspect-video mb-6 ${isStepLocked(index) ? 'pointer-events-none' : ''}`}>
                                  <div 
                                    key={`youtube-player-overview-${index}`}
                                    id={`youtube-player-overview-${index}`}
                                    className="w-full h-full rounded-lg"
                                  />
                                </div>
                              )}
                              {step.thumbnailUrl && step.type !== 'video' && (
                                <div className="aspect-video mb-6">
                                  <img 
                                    src={step.thumbnailUrl} 
                                    alt={`Thumbnail for ${step.title}`}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                </div>
                              )}
                              <p className={`${step.type === 'reward' ? 'mb-12 text-amber-700' : 'mb-6 text-gray-600'}`}>
                                {step.content}
                              </p>
                              <div className="border-t border-gray-200 mb-2" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Button row - same as focused view */}
                        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                          <div className={`flex flex-row items-end justify-between w-full mt-auto gap-2 ${isStepLocked(index) ? 'pointer-events-none' : ''}`}>
                            <Button
                              variant="outline"
                              onClick={handleArrowPrev}
                              disabled={isFirstStep}
                              className={isFirstStep ? "opacity-0" : ""}
                            >
                              <ArrowLeft className="mr-2 h-4 w-4" />
                            </Button>
                            <div className="flex-1 flex justify-center">
                              {step.type === 'video' && (
                                <Button
                                  variant="link"
                                  className="underline text-gray-500 mx-auto"
                                  onClick={() => {
                                    setSkipToStep(currentStepIndex);
                                    setShowSkipDialog(true);
                                  }}
                                >
                                  Skip this step
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Hide progress circle for reward steps */}
                              {step.type !== 'reward' && (
                                <div className="relative w-8 h-8">
                                  {!canStepProceed(index) ? (
                                    <motion.svg 
                                      className="w-8 h-8" 
                                      viewBox="0 0 36 36"
                                      initial={{ opacity: 1, scale: 1 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.8 }}
                                      transition={{ duration: 0.3 }}
                                    >
                                      <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                      <circle
                                        cx="18" cy="18" r="16"
                                        fill="none"
                                        stroke={
                                          (videoWatchTime[index] || 0) < 25 ? "#ef4444" :
                                          (videoWatchTime[index] || 0) < 80 ? "#f97316" : "#10b981"
                                        }
                                        strokeWidth="3"
                                        strokeDasharray={`${Math.min(videoWatchTime[index] || 0, 80) * 1.25}, 100`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 0.5s, stroke 0.5s' }}
                                      />
                                    </motion.svg>
                                  ) : (
                                    <motion.div
                                      key={`tick-${index}-${canStepProceed(index)}`}
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                      className="w-8 h-8 flex items-center justify-center"
                                    >
                                      <Check className="text-green-500 w-6 h-6 stroke-[3]" />
                                    </motion.div>
                                  )}
                                </div>
                              )}
                              <Button
                                onClick={() => handleStepNext(index)}
                                disabled={!canStepProceed(index)}
                                className={`disabled:opacity-50 disabled:cursor-not-allowed ${
                                  step.type === 'reward' 
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 shadow-lg' 
                                    : 'bg-black text-white hover:bg-black/90'
                                }`}
                              >
                                {step.type === 'reward' ? (
                                  <>
                                    🎉 Claim Reward 🎉
                                  </>
                                ) : (
                                  <>
                                    {isLastStep ? 'Complete Trail' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                    {/* Centered dash with equal spacing between cards */}
                    {index < trail.steps.length - 1 && (
                      <div className="w-[8px] h-28 bg-gray-300 mx-auto my-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 max-w-4xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  className="max-w-4xl mx-auto w-full relative"
                  initial={{ 
                    opacity: 0, 
                    x: slideDirection === 'right' ? 100 : slideDirection === 'left' ? -100 : 0,
                    y: slideDirection ? 0 : 20 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    y: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: slideDirection === 'right' ? -100 : slideDirection === 'left' ? 100 : 0,
                    y: slideDirection ? 0 : -20 
                  }}
                  transition={{ 
                    duration: 0.5, 
                    ease: "easeInOut",
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                  onAnimationComplete={() => setSlideDirection(null)}
                >
                  {/* Use the same shimmer/glow as Creator View for reward steps */}
                  {currentStep.type === 'reward' && (
                    <motion.div 
                      className="absolute inset-0 glow-container pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    />
                  )}
                  
                  <div className="bg-gray-50 rounded-lg shadow-md w-full relative flex flex-col justify-between min-h-[400px] max-h-screen overflow-y-auto sm:max-h-none sm:overflow-visible">
                    {/* Arrows in top right for cycling steps */}
                    <div className="absolute top-6 right-4 flex gap-2 z-30">
                      <Button size="icon" variant="ghost" onClick={handleArrowPrev} disabled={isFirstStep}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleArrowNext} disabled={isLastStep}>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                    {/* Remove the blue overlay and lock symbol. Only blur the content area for locked steps. */}
                    <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                      <div className={`flex items-center mb-6`}>
                        {currentStep.type === 'reward' ? (
                          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-full h-12 w-12 flex items-center justify-center text-lg font-bold shadow-lg">
                            <Gift className="h-6 w-6" />
                          </div>
                        ) : (
                          <span className="bg-black text-white rounded-full h-12 w-12 flex items-center justify-center text-lg font-bold">
                            {currentStepIndex + 1}
                          </span>
                        )}
                        <h2 className={`text-3xl font-bold ml-4 ${
                          currentStep.type === 'reward' ? 'text-amber-700' : 'text-gray-900'
                        }`}>{currentStep.title}</h2>
                      </div>
                    </div>
                    
                    {/* Full-width border */}
                    <div className="border-t border-gray-200" />
                    
                    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
                      <div className="relative">
                        {/* Lock icon for locked steps in focused view - centered */}
                        {isStepLocked(currentStepIndex) && (
                          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <div className={`bg-white rounded-full p-4 shadow-lg transition-transform duration-300 ease-in-out ${lockHovered ? 'scale-110' : 'scale-100'}`}>
                              <span className="transition-all duration-300 ease-in-out">
                                {lockHovered ? (
                                  <Unlock className="h-8 w-8 text-gray-600" />
                                ) : (
                                  <Lock className="h-8 w-8 text-gray-600" />
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                        <div
                          className={isStepLocked(currentStepIndex) ? 'blur-[16px] pointer-events-auto select-none relative cursor-pointer' : ''}
                          onClick={isStepLocked(currentStepIndex) ? () => {
                            setSkipTargetStep(currentStepIndex);
                            setShowSkipToStepDialog(true);
                          } : undefined}
                          onMouseEnter={isStepLocked(currentStepIndex) ? () => setLockHovered(true) : undefined}
                          onMouseLeave={isStepLocked(currentStepIndex) ? () => setLockHovered(false) : undefined}
                        >
                          {/* Content to blur */}
                          {currentStep.source && currentStep.type === 'video' && (
                            <div className={`aspect-video mb-6 ${isStepLocked(currentStepIndex) ? 'pointer-events-none' : ''}`}>
                              <div 
                                key={`youtube-player-${currentStepIndex}`}
                                id={`youtube-player-${currentStepIndex}`}
                                className="w-full h-full rounded-lg"
                              />
                            </div>
                          )}
                          {currentStep.thumbnailUrl && currentStep.type !== 'video' && (
                            <div className="aspect-video mb-6">
                              <img 
                                src={currentStep.thumbnailUrl} 
                                alt={`Thumbnail for ${currentStep.title}`}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          )}
                          <p className={`${currentStep.type === 'reward' ? 'mb-12 text-amber-700' : 'mb-6 text-gray-600'}`}>
                            {currentStep.content}
                          </p>
                          <div className="border-t border-gray-200 mb-2" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Button row */}
                    <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
                      <div className={`flex flex-row items-end justify-between w-full mt-auto gap-2 ${isStepLocked(currentStepIndex) ? 'pointer-events-none' : ''}`}>
                        <Button
                          variant="outline"
                          onClick={handleArrowPrev}
                          disabled={isFirstStep}
                          className={isFirstStep ? "opacity-0" : ""}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                        <div className="flex-1 flex justify-center">
                          {currentStep.type === 'video' && (
                            <Button
                              variant="link"
                              className="underline text-gray-500 mx-auto"
                              onClick={() => {
                                setSkipToStep(currentStepIndex);
                                setShowSkipDialog(true);
                              }}
                            >
                              Skip this step
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Hide progress circle for reward steps */}
                          {currentStep.type !== 'reward' && (
                            <div className="relative w-8 h-8">
                              {!canStepProceed(currentStepIndex) ? (
                                <motion.svg 
                                  className="w-8 h-8" 
                                  viewBox="0 0 36 36"
                                  initial={{ opacity: 1, scale: 1 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                  <circle
                                    cx="18" cy="18" r="16"
                                    fill="none"
                                    stroke={
                                      (videoWatchTime[currentStepIndex] || 0) < 25 ? "#ef4444" :
                                      (videoWatchTime[currentStepIndex] || 0) < 80 ? "#f97316" : "#10b981"
                                    }
                                    strokeWidth="3"
                                    strokeDasharray={`${Math.min(videoWatchTime[currentStepIndex] || 0, 80) * 1.25}, 100`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 0.5s, stroke 0.5s' }}
                                  />
                                </motion.svg>
                              ) : (
                                <motion.div
                                  key={`tick-${currentStepIndex}-${canStepProceed(currentStepIndex)}`}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="w-8 h-8 flex items-center justify-center"
                                >
                                  <Check className="text-green-500 w-6 h-6 stroke-[3]" />
                                </motion.div>
                              )}
                            </div>
                          )}
                          <Button
                            onClick={() => handleFocusedNext()}
                            disabled={!canStepProceed(currentStepIndex)}
                            className={`disabled:opacity-50 disabled:cursor-not-allowed ${
                              currentStep.type === 'reward' 
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 shadow-lg' 
                                : 'bg-black text-white hover:bg-black/90'
                            }`}
                          >
                            {currentStep.type === 'reward' ? (
                              <>
                                🎉 Claim Reward 🎉
                              </>
                            ) : (
                              <>
                                {isLastStep ? 'Complete Trail' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Skip Step Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {skipToStep !== null && trail && trail.trailValue && trail.steps ? (
                <>Skip Step for ${Math.round(trail.trailValue / trail.steps.length)}</>
              ) : (
                'Skip Step'
              )}
            </DialogTitle>
            {skipToStep !== null && trail && trail.steps && (
              (() => {
                let minutesLeft = 0;
                const step = trail.steps[currentStepIndex];
                if (step.type === 'video' && step.duration) {
                  const watched = videoWatchTime[currentStepIndex] || 0;
                  const left = Math.max(step.duration - Math.ceil((watched / 100) * step.duration), 0);
                  minutesLeft = Math.ceil(left);
                }
                return (
                  <p className="text-gray-500 text-sm mt-2">
                    This will progress you to the next step immediately.
                  </p>
                );
              })()
            )}
          </DialogHeader>
          <div className="flex justify-between gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (skipToStep !== null && trail && trail.trailValue && trail.steps) {
                const cost = Math.round(trail.trailValue / trail.steps.length);
                setSkipPaymentAmount(cost);
                setSkipPaymentTarget(skipToStep);
                setShowStripePayment(true);
                setShowSkipDialog(false);
              }
            }} className="bg-black text-white">
              Skip for ${skipToStep !== null && trail && trail.trailValue && trail.steps ? Math.round(trail.trailValue / trail.steps.length) : 0}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip to Step Dialog */}
      <Dialog open={showSkipToStepDialog} onOpenChange={setShowSkipToStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {skipTargetStep !== null && trail && trail.trailValue && trail.steps ? (
                (() => {
                  const targetStep = trail.steps[skipTargetStep];
                  const cost = Math.round((trail.trailValue / trail.steps.length) * (skipTargetStep - progressStepIndex));
                  if (targetStep.type === 'reward') {
                    return <>Skip to this reward for ${cost}</>;
                  } else {
                    return <>Skip to Step {skipTargetStep + 1} for ${cost}</>;
                  }
                })()
              ) : (
                'Skip to Step'
              )}
            </DialogTitle>
            <p className="text-gray-500 text-sm mt-2">
              {skipTargetStep !== null && trail && trail.steps && trail.steps[skipTargetStep]?.type === 'reward' 
                ? 'Skipping will unlock this reward and all steps in between.'
                : 'Skipping will unlock this step and all steps in between.'
              }
            </p>
          </DialogHeader>
          <div className="flex justify-between gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowSkipToStepDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (skipTargetStep !== null && trail && trail.trailValue && trail.steps) {
                const cost = Math.round((trail.trailValue / trail.steps.length) * (skipTargetStep - progressStepIndex));
                setSkipPaymentAmount(cost);
                setSkipPaymentTarget(skipTargetStep);
                setShowStripePayment(true);
                setShowSkipToStepDialog(false);
              }
            }} className="bg-black text-white">
              Skip for ${skipTargetStep !== null && trail && trail.trailValue && trail.steps ? Math.round((trail.trailValue / trail.steps.length) * (skipTargetStep - progressStepIndex)) : 0}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Modal for Skip */}
      <Dialog open={showStripePayment} onOpenChange={setShowStripePayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Skip to Step {skipPaymentTarget !== null ? skipPaymentTarget + 1 : ''}
            </DialogTitle>
            <DialogDescription>
              Complete payment to skip to this step and unlock all content in between.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <StripePayment
              amount={skipPaymentAmount}
              trailId={trail?.id || 'skip-payment'}
              creatorId={trail?.creator || 'unknown'}
              onSuccess={() => {
                if (skipPaymentTarget !== null && trail) {
                  // Mark all steps up to and including skipPaymentTarget as completed
                  const newCompletedSteps = new Set(completedSteps);
                  for (let i = progressStepIndex + 1; i <= skipPaymentTarget; i++) {
                    newCompletedSteps.add(i);
                  }
                  setCompletedSteps(newCompletedSteps);
                  
                  // Check if the target step is a reward step and trigger confetti
                  const targetStep = trail.steps[skipPaymentTarget];
                  if (targetStep?.type === 'reward') {
                    setPlayConfetti(true);
                  }
                  
                  setCurrentStepIndex(skipPaymentTarget);
                  setProgressStepIndex(skipPaymentTarget);
                  
                  // Track skip payment
                  analyticsService.trackTipDonated(trail.id, skipPaymentAmount);
                }
                
                toast({
                  title: "Payment successful!",
                  description: `You've skipped to step ${skipPaymentTarget !== null ? skipPaymentTarget + 1 : ''}.`,
                });
                
                setShowStripePayment(false);
                setSkipPaymentAmount(0);
                setSkipPaymentTarget(null);
              }}
              onCancel={() => {
                toast({
                  title: "Payment cancelled",
                  description: "You can try again anytime.",
                });
                setShowStripePayment(false);
                setSkipPaymentAmount(0);
                setSkipPaymentTarget(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Progress Button at the bottom */}
      <div className="flex justify-end px-12 pb-8 bg-gray-50">
        <Button
          className="bg-black text-white hover:bg-black/90 px-6 py-2 text-base font-semibold shadow-lg active:scale-95 transition-transform"
          onClick={async () => {
            if (!isAuthenticated) {
              toast({ title: 'Sign in required', description: 'Please sign in to save your progress.' });
              return;
            }
            if (!user) return;
            const savedTrail = {
              ...trail,
              active: true,
              progressStepIndex,
              completedSteps: Array.from(completedSteps),
              lastSavedAt: new Date().toISOString(),
            };
            const userTrails = await getUserTrails();
            const { drafts, published } = userTrails;
            const allUserTrails = [...drafts, ...published];
            const filteredDrafts = allUserTrails.filter((t: any) => t.id !== savedTrail.id);
            localStorage.setItem(`user_${user.id}_drafts`, JSON.stringify([...filteredDrafts, savedTrail]));
            toast({ title: 'Progress saved!', description: 'You can resume this trail from your profile.', duration: 1000 });
          }}
        >
          Save Progress
        </Button>
      </div>
    </>
  );
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default LearnerView; 