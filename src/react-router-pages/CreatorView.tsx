'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Save, Eye, X, Edit, Trash2, ChevronDown, Gift, Video, ChevronLeft, ChevronRight, Expand, ChevronUp, GripVertical, ArrowUp, ArrowDown, Check, LayoutGrid, PartyPopper, ImageIcon, UploadCloud, Shrink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence, LayoutGroup, useIsPresent, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import { sampleTrail } from "@/data/sampleTrail";
import Confetti from 'react-confetti';
import { useWindowSize, useDebounce } from 'react-use';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/LoginModal';
import SubscriptionModal from '@/components/SubscriptionModal';
import { useSubscription } from '@/hooks/useSubscription';

interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'reward';
  source: string;
  thumbnailUrl?: string;
  isSaved?: boolean;
  trail_id: string;
  step_index: number;
  created_at: string;
}

// Use process.env for Next.js public env variables
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const RewardGlow = () => {
  const isPresent = useIsPresent();

  return isPresent ? (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="glow-container" />
    </motion.div>
  ) : null;
}

const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

// Utility function to convert blob URL to base64 data URL
const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob URL to base64:', error);
    return blobUrl; // Fallback to original URL if conversion fails
  }
};

// Utility function to check if a URL is a blob URL
const isBlobUrl = (url: string): boolean => {
  return url.startsWith('blob:');
};

const ContentPreview = ({ 
  url, 
  thumbnailUrl,
  onThumbnailUpdate,
  className = "" 
}: { 
  url: string; 
  thumbnailUrl?: string;
  onThumbnailUpdate: (newThumbnailUrl: string) => void;
  className?: string;
}) => {
  const [preview, setPreview] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorToastId = useRef<string | null>(null);

  const [debouncedUrl, setDebouncedUrl] = useState(url);
  useDebounce(() => {
    setDebouncedUrl(url);
    // Dismiss any error toast when user types again
    if (errorToastId.current) {
      toast.dismiss(errorToastId.current);
      errorToastId.current = null;
    }
  }, 500, [url]);

  // Convert blob URLs to base64 when component mounts or thumbnailUrl changes
  useEffect(() => {
    const convertThumbnailIfNeeded = async () => {
      if (thumbnailUrl && isBlobUrl(thumbnailUrl)) {
        try {
          const base64Url = await convertBlobUrlToBase64(thumbnailUrl);
          onThumbnailUpdate(base64Url);
          // Revoke the blob URL to free memory
          URL.revokeObjectURL(thumbnailUrl);
        } catch (error) {
          console.error('Failed to convert thumbnail:', error);
        }
      }
    };

    convertThumbnailIfNeeded();
  }, [thumbnailUrl, onThumbnailUpdate]);

  useEffect(() => {
    let isCancelled = false;
    
    const generatePreview = async () => {
      if (!debouncedUrl) {
        setPreview(null);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);

      if (thumbnailUrl) {
        setPreview(<img src={thumbnailUrl} alt="Custom thumbnail" className="w-full h-full object-cover" />);
        setIsLoading(false);
        return;
      }

      const videoId = getYouTubeVideoId(debouncedUrl);
      if (videoId) {
        setPreview(
          <iframe
            key={videoId}
            className="w-full h-full aspect-video"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
        setIsLoading(false);
        return;
      }

      // Default fallback UI with your logo
      const fallbackUi = (
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 mb-3 bg-white rounded-lg shadow-sm flex items-center justify-center">
            <img src="/Asset 10newest.png" alt="Default thumbnail" className="w-10 h-10 object-contain" />
          </div>
          <p className="text-sm text-gray-600 text-center font-medium">
            Enter a URL to automatically generate preview
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            We'll automatically detect videos or generate thumbnails
          </p>
        </div>
      );

      if (isValidUrl(debouncedUrl) && !getYouTubeVideoId(debouncedUrl) && !thumbnailUrl) {
        // Try to fetch content from the URL (video or thumbnail)
        const fetchPromise = async () => {
          const response = await fetch(`${PROXY_BASE_URL}/api/proxy?url=${encodeURIComponent(debouncedUrl)}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch preview: ${response.status} ${errorText}`);
          }
          
          const contentType = response.headers.get('content-type');
          
          // Clone response first to avoid consuming the stream
          const responseClone = response.clone();
          
          // Check if response is JSON (video metadata)
          if (contentType?.includes('application/json')) {
            try {
              const data = await response.json();
              if (data.type === 'video' && data.videoUrl) {
                return { type: 'video', url: data.videoUrl, title: data.title };
              }
            } catch (jsonError) {
              // Failed to parse JSON, treat as image
            }
          }
          
          // Otherwise it's an image - use the cloned response
          const blob = await responseClone.blob();
          
          if (!blob.type.startsWith('image/')) {
            throw new Error(`Fetched content is not an image: ${blob.type}`);
          }
          
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          if (isCancelled) {
            throw new Error("Component unmounted");
          }
          
          return { type: 'image', url: base64Url };
        };

        try {
          const result = await fetchPromise();
          if (!isCancelled) {
            if (result.type === 'video') {
              // Show video embed
              setPreview(
                <iframe
                  className="w-full h-full aspect-video rounded-md"
                  src={result.url}
                  title={result.title || "Embedded video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            } else {
              // Show image thumbnail
              onThumbnailUpdate(result.url);
              setPreview(
                <img 
                  src={result.url} 
                  alt="Website preview" 
                  className="w-full h-full object-cover rounded-md"
                />
              );
            }
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error fetching preview:', error);
          if (!isCancelled) {
            setPreview(fallbackUi);
            setIsLoading(false);
          }
        }
      } else {
        if (!isCancelled) {
          setPreview(fallbackUi);
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      isCancelled = true;
    };
  }, [debouncedUrl, thumbnailUrl]); // Removed onThumbnailUpdate to prevent infinite loop

  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image Too Large", { description: "Please upload an image smaller than 2MB." });
      return;
    }

    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = async () => {
      const aspectRatio = image.width / image.height;
      URL.revokeObjectURL(image.src);
      if (Math.abs(aspectRatio - 16 / 9) < 0.05) {
        // Convert file to base64 instead of creating a blob URL
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        onThumbnailUpdate(base64Url);
      } else {
        toast.error("Incorrect Aspect Ratio", { description: "Please upload an image with a 16:9 aspect ratio." });
      }
    };
  };



  return (
    <div className={`relative aspect-video bg-gray-100 rounded-md overflow-hidden flex items-center justify-center min-h-[200px] ${className}`}>
      {isLoading ? (
        <p className="text-gray-500">Loading Preview...</p>
      ) : preview ? (
        <div className="w-full h-full">
          {preview}
        </div>
      ) : (
        <p className="text-gray-500">No preview available</p>
      )}
      <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
        <Button size="icon" variant="secondary" onClick={handleEditClick} className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
      </div>
    </div>
  );
};

const EditView: React.FC<{
  step: TrailStep;
  index: number;
  updateStep: (index: number, value: Partial<TrailStep>) => void;
  removeStep: (index: number) => void;
  setEditingStepId: (id: string | null) => void;
  isOnlyStep: boolean;
  onRewardSave: () => void;
}> = React.memo(({ step, index, updateStep, removeStep, setEditingStepId, isOnlyStep, onRewardSave }) => {
  const handleSave = () => {
    updateStep(index, { 
      isSaved: true,
      title: step.title.trim() === '' 
        ? (step.type === 'reward' ? 'Reward' : `Step ${index + 1}`) 
        : step.title
    });
    setEditingStepId(null);
    if (step.type === 'reward') {
      onRewardSave();
    }
  };
  
  return (
      <CardContent className="p-4 sm:p-6 lg:p-10 space-y-3 sm:space-y-4 lg:space-y-8">
      <ContentPreview 
        url={step.source || ''} 
        thumbnailUrl={step.thumbnailUrl}
        onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
        className="my-0" 
      />
      <div>
          <label className="text-base sm:text-lg lg:text-xl font-semibold text-black">
            {step.type === 'reward' ? 'Reward URL' : 'Content URL'}
          </label>
          <Input
            value={step.source}
            onChange={(e) => {
              const newUrl = e.target.value;
              updateStep(index, { 
                source: newUrl,
                // Clear thumbnail when URL changes so preview updates
                thumbnailUrl: newUrl !== step.source ? '' : step.thumbnailUrl
              });
            }}
            placeholder={step.type === 'reward' ? 'Enter Reward Link' : 'Enter Content URL'}
            className={cn(
              "mt-2 h-10 sm:h-12 lg:h-14 text-sm sm:text-lg lg:text-xl [&::placeholder]:text-gray-400 [&::placeholder]:text-sm sm:[&::placeholder]:text-lg lg:[&::placeholder]:text-xl [&::placeholder]:font-normal",
              step.type === 'reward' && "focus-visible:ring-yellow-500 text-yellow-600 placeholder:text-yellow-400/70"
            )}
          />
      </div>
      <div>
          <label className="text-base sm:text-lg lg:text-xl font-semibold text-black">Step Description</label>
          <Textarea
          value={step.content}
          onChange={(e) => {
            const newContent = e.target.value;
            if (newContent.length <= 250) {
              updateStep(index, { content: newContent });
            }
          }}
          placeholder={step.type === 'reward' ? 'Describe the reward...' : 'Describe this step...'}
          className={cn(
            "mt-2 text-sm sm:text-base lg:text-lg [&::placeholder]:text-gray-400 [&::placeholder]:text-sm sm:[&::placeholder]:text-lg lg:[&::placeholder]:text-xl [&::placeholder]:font-normal",
            step.type === 'reward' && "focus-visible:ring-yellow-500 text-yellow-600 placeholder:text-yellow-400/70"
          )}
          rows={3}
          maxLength={250}
          />
          <div className="flex justify-end mt-1">
            <span className={cn(
              "text-xs text-gray-500",
              step.content.length > 200 && "text-orange-500",
              step.content.length >= 250 && "text-red-500"
            )}>
              {step.content.length}/250
            </span>
          </div>
      </div>
      <div className="flex justify-between items-center pt-3 sm:pt-4 lg:pt-8">
          <Button variant="ghost" size="sm" className="bg-red-50 hover:bg-red-100 text-red-600 disabled:bg-gray-100 disabled:text-gray-400 text-xs sm:text-sm lg:text-base" onClick={() => removeStep(index)} disabled={isOnlyStep}>
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1 sm:mr-2 lg:mr-3" />
          Delete
          </Button>
          <Button size="sm" className="bg-gray-800 text-white hover:bg-black text-xs sm:text-sm lg:text-base" onClick={handleSave} disabled={!step.source?.trim()}>
          <Check className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1 sm:mr-2 lg:mr-3" />
          Save Step
          </Button>
      </div>
      </CardContent>
  );
});

const PreviewView: React.FC<{
  step: TrailStep;
  index: number;
  updateStep: (index: number, value: Partial<TrailStep>) => void;
  removeStep: (index: number) => void;
  setEditingStepId: (id: string | null) => void;
  isOnlyStep: boolean;
}> = React.memo(({ step, index, updateStep, removeStep, setEditingStepId, isOnlyStep }) => {
  const handleRedeem = () => {
    if (step.source && isValidUrl(step.source)) {
              if (typeof window !== 'undefined') {
          window.open(step.source, '_blank', 'noopener,noreferrer');
        }
    } else {
      toast.error("Invalid or missing reward URL.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-0 flex flex-col min-h-[300px]">
      <div className="flex-grow">
        {step.type === 'reward' ? (
          <div className="text-center pt-0 pb-2 flex flex-col justify-center items-center">
              <ContentPreview 
                url={step.source || ''} 
                className="mb-4 w-full" 
                thumbnailUrl={step.thumbnailUrl}
                onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
              />
              <p className="text-base sm:text-lg mb-4" style={{ color: '#D4AF37' }}>{step.content}</p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block mt-1"
              >
                <Button onClick={handleRedeem} size="default" className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700 shadow-lg h-12 px-8 text-lg">
                  <Gift className="h-5 w-5 mr-3" />
                  Claim Reward
                  <Gift className="h-5 w-5 ml-3" />
                </Button>
              </motion.div>
          </div>
        ) : (
          <>
            <ContentPreview 
              url={step.source || ''} 
              thumbnailUrl={step.thumbnailUrl}
              onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
            />
            <p className="mt-6 text-lg sm:text-xl">{step.content}</p>
          </>
        )}
      </div>
      <div className="flex justify-between items-center mt-6 border-t pt-4">
        <div>
          {step.type === 'reward' ? (
            !isOnlyStep && (
              <Button variant="ghost" size="sm" className="bg-red-50 hover:bg-red-100 text-red-600" onClick={() => removeStep(index)}>
                <Trash2 className="h-3 w-3 mr-2" /> Delete
              </Button>
            )
          ) : (
            !isOnlyStep && (
              <Button variant="destructive" size="sm" onClick={() => removeStep(index)}>
                <Trash2 className="h-3 w-3 mr-2" /> Delete
              </Button>
            )
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditingStepId(step.id)}>
          <Edit className="h-3 w-3 mr-2" /> Edit
        </Button>
      </div>
    </div>
  );
});

interface StepCardProps {
  step: TrailStep;
  index: number;
  updateStep: (index: number, value: Partial<TrailStep>) => void;
  removeStep: (index: number) => void;
  editingStepId: string | null;
  setEditingStepId: (id: string | null) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  setCurrentStepIndex: (index: React.SetStateAction<number>) => void;
  isOnlyStep: boolean;
  onRewardSave: () => void;
  isOverviewMode?: boolean;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  updateStep,
  removeStep,
  editingStepId,
  setEditingStepId,
  isFirstStep,
  isLastStep,
  setCurrentStepIndex,
  isOnlyStep,
  onRewardSave,
  isOverviewMode,
}) => {
  const isEditing = editingStepId === step.id || !step.isSaved;

  return (
    <Card className={cn(
      "overflow-hidden transition-all shadow-lg hover:shadow-xl w-full",
      step.type === 'reward' && "bg-white"
    )}>
      <CardHeader className={cn(
        "flex flex-row items-center justify-between p-4 sm:p-6 lg:p-8 bg-white min-h-[60px] sm:min-h-[80px] lg:min-h-[100px]",
        !isEditing && "border-b",
        step.type === 'reward' && "bg-transparent"
      )}>
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-1 min-w-0">
          {/* Drag handle */}
          {isOverviewMode && (
            <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
          )}
          {step.type === 'reward' ? (
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex-shrink-0">
              <Gift className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </div>
          ) : (
            <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full bg-black text-white font-bold text-sm sm:text-lg lg:text-xl flex-shrink-0">
              {index + 1}
            </span>
          )}
          {isEditing ? (
            <Input
              value={step.title}
              onChange={(e) => updateStep(index, { title: e.target.value })}
              className={cn(
                "text-lg sm:text-2xl lg:text-3xl font-bold h-10 sm:h-12 lg:h-14 !text-lg sm:!text-2xl lg:!text-3xl placeholder:text-gray-400",
                step.type === 'reward' && "focus-visible:ring-amber-500 text-amber-700"
              )}
              autoFocus
              placeholder={step.type === 'reward' ? 'Reward Title' : `Step ${index + 1}`}
            />
          ) : (
            <h3 className={cn(
              "text-lg sm:text-2xl lg:text-3xl font-bold min-w-0 flex-1 line-clamp-2",
              step.type === 'reward' && "text-amber-700"
            )}>{step.title}</h3>
          )}
        </div>
        <div className="flex items-center flex-shrink-0 ml-2 sm:ml-4 lg:ml-6 space-x-1 sm:space-x-2 lg:space-x-3">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" onClick={() => setCurrentStepIndex(prev => prev - 1)} disabled={isFirstStep}>
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12" onClick={() => setCurrentStepIndex(prev => prev + 1)} disabled={isLastStep}>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
          </Button>
        </div>
      </CardHeader>
      {isEditing ? (
        <EditView
          step={step}
          index={index}
          updateStep={updateStep}
          removeStep={removeStep}
          setEditingStepId={setEditingStepId}
          isOnlyStep={isOnlyStep}
          onRewardSave={onRewardSave}
        />
      ) : (
        <PreviewView
          step={step}
          index={index}
          updateStep={updateStep}
          removeStep={removeStep}
          setEditingStepId={setEditingStepId}
          isOnlyStep={isOnlyStep}
        />
      )}
    </Card>
  );
}

const StepTimeline = ({
  steps,
  currentStepIndex,
  onNavigate,
  onAddStep,
}: {
  steps: TrailStep[];
  currentStepIndex: number;
  onNavigate: (index: number) => void;
  onAddStep: (index: number, type: "video" | "reward") => void;
}) => {
  const MAX_DOTS = 3;
  
  // Calculate the center position for the current step
  let start = Math.max(0, currentStepIndex - Math.floor(MAX_DOTS / 2));
  const end = Math.min(steps.length, start + MAX_DOTS);

  // Adjust if we're near the end
  if (end - start < MAX_DOTS && start > 0) {
    start = Math.max(0, end - MAX_DOTS);
  }

  const visibleSteps = steps.slice(start, end);

  return (
    <div className="flex flex-row items-center justify-center mt-10 mb-10 min-h-[64px] space-x-0">
      <AnimatePresence>
        {start > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => onNavigate(currentStepIndex - 1)} className="p-2">
              <ChevronLeft className="h-5 w-5 text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-row items-center justify-center">
        {visibleSteps.map((step, i) => {
          const originalIndex = start + i;
          const isLastVisibleStep = i === visibleSteps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <motion.div
                className="flex flex-row items-center"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={cn(
                    "transition-transform duration-300 relative flex items-center justify-center",
                    originalIndex === currentStepIndex && "scale-125"
                  )}
                >
                  <button
                    onClick={() => onNavigate(originalIndex)}
                    aria-label={`Go to ${step.title || `step ${originalIndex + 1}`}`}
                  >
                    {step.type === 'reward' ? (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500">
                        <Gift className="h-6 w-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black">
                        <span className="text-white text-lg font-bold">{originalIndex + 1}</span>
                      </div>
                    )}
                  </button>
                </div>
                {!isLastVisibleStep && (
                  <div className="h-1 w-28 bg-gray-300 mx-4 flex flex-row items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-6 h-6 aspect-square rounded-full bg-gray-300 flex items-center justify-center hover:bg-gray-400 z-10 border-0 p-0">
                            <Plus className="h-3 w-3 text-gray-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <Button variant="ghost" className="w-full justify-start" onClick={() => onAddStep(originalIndex + 1, 'video')}>
                            <div className="w-2.5 h-2.5 rounded-full bg-black mr-2" /> Add Step
                          </Button>
                          <Button variant="ghost" className="w-full justify-start" onClick={() => onAddStep(originalIndex + 1, 'reward')}>
                            <Gift className="h-4 w-4 mr-2" /> Add Reward
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>
      <AnimatePresence>
        {end < steps.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <button onClick={() => onNavigate(currentStepIndex + 1)} className="p-2">
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface OverviewModeProps {
  steps: TrailStep[];
  setSteps: React.Dispatch<React.SetStateAction<TrailStep[]>>;
  updateStep: (index: number, value: Partial<TrailStep>) => void;
  removeStep: (index: number) => void;
  editingStepId: string | null;
  setEditingStepId: (id: string | null) => void;
  setCurrentStepIndex: (index: React.SetStateAction<number>) => void;
  onRewardSave: () => void;
  handleAddStep: (index: number, type: 'video' | 'reward') => void;
}

const OverviewMode: React.FC<OverviewModeProps> = ({
  steps,
  setSteps,
  updateStep,
  removeStep,
  editingStepId,
  setEditingStepId,
  setCurrentStepIndex,
  onRewardSave,
  handleAddStep,
}) => {
  const finalRewardStep =
    steps.length > 0 && steps[steps.length - 1].type === 'reward'
      ? steps[steps.length - 1]
      : null;

  const reorderableSteps = finalRewardStep ? steps.slice(0, -1) : [...steps];

  const onReorder = (newOrder: TrailStep[]) => {
    setSteps(finalRewardStep ? [...newOrder, finalRewardStep] : newOrder);
  };

  const renderStepCard = (step: TrailStep, index: number) => (
    <div className="w-full max-w-4xl mx-auto relative">
      {step.type === 'reward' && editingStepId !== step.id && (
        <div className="absolute inset-0 glow-container pointer-events-none" />
      )}
      <div className="relative z-10">
        <StepCard
          step={step}
          index={index}
          updateStep={updateStep}
          removeStep={removeStep}
          editingStepId={editingStepId}
          setEditingStepId={setEditingStepId}
          isFirstStep={index === 0}
          isLastStep={index === steps.length - 1}
          setCurrentStepIndex={setCurrentStepIndex}
          isOnlyStep={steps.length === 1}
          onRewardSave={onRewardSave}
          isOverviewMode={true}
        />
      </div>
    </div>
  );

  const renderConnector = (index: number) => (
    <div className="flex items-center justify-center my-6">
      <div className="w-1 h-32 bg-gray-300 mx-6 flex items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-6 h-6 aspect-square rounded-full bg-gray-300 flex items-center justify-center hover:bg-gray-400 z-10 border-0 p-0">
                <Plus className="h-3 w-3 text-gray-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48" side="right" align="center">
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddStep(index + 1, 'video')}>
                <div className="w-2.5 h-2.5 rounded-full bg-black mr-2" /> Add Step
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddStep(index + 1, 'reward')}>
                <Gift className="h-4 w-4 mr-2" /> Add Reward
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="overview-mode"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <Reorder.Group axis="y" values={reorderableSteps} onReorder={onReorder}>
            {reorderableSteps.map((step, index) => (
              <Reorder.Item
                key={step.id}
                value={step}
                className="list-none"
                whileDrag={{
                  zIndex: 100,
                  boxShadow: '0px 8px 20px rgba(0,0,0,0.2)',
                }}
                dragListener={true}
                dragElastic={0.1}
                dragMomentum={false}
              >
                <div className="w-full">
                  {renderStepCard(step, index)}
                  {(index < reorderableSteps.length - 1 || finalRewardStep) && renderConnector(index)}
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {finalRewardStep && renderStepCard(finalRewardStep, steps.length - 1)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface FocusViewProps {
  steps: TrailStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (index: React.SetStateAction<number>) => void;
  updateStep: (index: number, value: Partial<TrailStep>) => void;
  removeStep: (index: number) => void;
  editingStepId: string | null;
  setEditingStepId: (id: string | null) => void;
  onRewardSave: () => void;
  handleAddStep: (index: number, type: 'video' | 'reward') => void;
}

const FocusView: React.FC<FocusViewProps> = ({
  steps,
  currentStepIndex,
  setCurrentStepIndex,
  updateStep,
  removeStep,
  editingStepId,
  setEditingStepId,
  onRewardSave,
  handleAddStep
}) => (
  <>
    <div className="max-w-2xl mx-auto">
      <StepTimeline
        steps={steps}
        currentStepIndex={currentStepIndex}
        onNavigate={setCurrentStepIndex}
        onAddStep={handleAddStep}
      />
    </div>
    
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={steps[currentStepIndex]?.id || currentStepIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-full relative"
        >
          {steps[currentStepIndex]?.type === 'reward' && editingStepId !== steps[currentStepIndex]?.id && (
            <div className="absolute inset-0 glow-container pointer-events-none" />
          )}
          <div className="relative z-10">
            {steps.length > 0 && steps[currentStepIndex] && (
              <StepCard
                step={steps[currentStepIndex]}
                index={currentStepIndex}
                updateStep={updateStep}
                removeStep={removeStep}
                editingStepId={editingStepId}
                setEditingStepId={setEditingStepId}
                isFirstStep={currentStepIndex === 0}
                isLastStep={currentStepIndex === steps.length - 1}
                setCurrentStepIndex={setCurrentStepIndex}
                isOnlyStep={steps.length === 1}
                onRewardSave={onRewardSave}
                isOverviewMode={false}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  </>
);

const CreatorView: React.FC = () => {
  const [showModal, setShowModal] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [trailTitle, setTrailTitle] = useState('');
  const [trailDescription, setTrailDescription] = useState('');
  const [suggestedInvestment, setSuggestedInvestment] = useState(0);
  const [trailValue, setTrailValue] = useState(0);
  const [trailCurrency, setTrailCurrency] = useState('USD');
  const [steps, setSteps] = useState<TrailStep[]>([]);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { width, height } = useWindowSize();
  const [playConfetti, setPlayConfetti] = useState(false);
  const navigate = useNavigate();
  const [editingTrailId, setEditingTrailId] = useState<string | null>(null);
  const [showPublishValidationDialog, setShowPublishValidationDialog] = useState(false);
  const [showUnsavedStepsDialog, setShowUnsavedStepsDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated, saveUserTrail, deleteUserTrail, user } = useAuth();
  const { canCreateTrails, startSubscription, subscriptionStatus, isLoading: subscriptionLoading } = useSubscription();

  // Currency options
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  ];

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || '$';
  };

  // Track if this is the initial load to prevent modal from auto-closing when user clicks Edit Details
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Check if we're editing an existing trail
    const editingTrailData = localStorage.getItem('editingTrail');
    if (editingTrailData) {
      try {
        const trail = JSON.parse(editingTrailData);
        console.log('🔄 Loading trail from localStorage:', {
          id: trail.id,
          title: trail.title,
          hasSteps: !!trail.steps,
          stepsCount: trail.steps?.length || 0,
          steps: trail.steps
        });
        setTrailTitle(trail.title);
        setTrailDescription(trail.description);
        setSuggestedInvestment(trail.suggestedInvestment || 0);
        setTrailValue(trail.trailValue || 0);
        setTrailCurrency(trail.trailCurrency || 'USD');
        setSteps(trail.steps || []);
        setEditingTrailId(trail.id);
        
        // Keep the editing data in localStorage for persistence across page refreshes
        // Only remove it when explicitly leaving the editor or publishing
        // localStorage.removeItem('editingTrail'); // ❌ Don't remove immediately!
        
        // Don't show modal when editing existing trail - but only on initial load
        if (!hasInitialized) {
          setShowModal(false);
          setHasInitialized(true);
        }
        
        // If there are steps, set the first one as current
        if (trail.steps && trail.steps.length > 0) {
          setCurrentStepIndex(0);
          setEditingStepId(trail.steps[0].id);
        } else {
          // If trail has no steps, create initial steps
          console.log('🆕 Creating initial steps for existing trail with no steps');
          const initialStepId = `step-${Date.now()}`;
                      const initialSteps = [
              { id: initialStepId, title: '', content: '', type: 'video' as const, source: '', thumbnailUrl: '', isSaved: false, trail_id: trail.id, step_index: 0, created_at: new Date().toISOString() },
              { id: 'reward', title: '', content: '', type: 'reward' as const, source: '', thumbnailUrl: '', isSaved: false, trail_id: trail.id, step_index: 1, created_at: new Date().toISOString() }
            ];
          setSteps(initialSteps);
          setEditingStepId(initialStepId);
          setCurrentStepIndex(0);
        }
      } catch (error) {
        console.error('Error loading trail data:', error);
      }
    } else {
      // Start with one step and a reward if none exist
      if (steps.length === 0 && !showModal) {
        console.log('🆕 Creating initial steps via useEffect fallback');
        const initialStepId = `step-${Date.now()}`;
        setSteps([
          { id: initialStepId, title: '', content: '', type: 'video', source: '', thumbnailUrl: '', isSaved: false, trail_id: '', step_index: 0, created_at: new Date().toISOString() },
          { id: 'reward', title: '', content: '', type: 'reward', source: '', thumbnailUrl: '', isSaved: false, trail_id: '', step_index: 0, created_at: new Date().toISOString() }
        ]);
        setEditingStepId(initialStepId);
      }
      if (!hasInitialized) {
        setHasInitialized(true);
      }
    }
  }, [steps.length, hasInitialized]);

  // Scroll to top when switching to overview mode
  useEffect(() => {
    if (isOverviewMode) {
      // Small delay to ensure the mode switch animation starts first
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOverviewMode]);

  const questions = [
    { id: 'title', question: 'What is the title of your Trail?', placeholder: 'e.g. How To Start On YouTube', type: 'text' },
    { id: 'description', question: 'Describe your Trail', placeholder: 'e.g. The basics of Youtube from a Millionaire Content Creator...', type: 'textarea' },
    { id: 'trailValue', question: 'What is the value of your Trail?', placeholder: '100', type: 'value-currency' },
    { id: 'investment', question: 'Set a suggested tip amount', placeholder: '20', type: 'number' }
  ];
  
  const handleModalNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowModal(false);
      
      // Create initial steps after completing modal setup for new trails
      if (!editingTrailId && steps.length === 0) {
        console.log('🆕 Creating initial steps after modal completion');
        const initialStepId = `step-${Date.now()}`;
        setSteps([
          { id: initialStepId, title: '', content: '', type: 'video', source: '', thumbnailUrl: '', isSaved: false, trail_id: '', step_index: 0, created_at: new Date().toISOString() },
          { id: 'reward', title: '', content: '', type: 'reward', source: '', thumbnailUrl: '', isSaved: false, trail_id: '', step_index: 0, created_at: new Date().toISOString() }
        ]);
        setEditingStepId(initialStepId);
      }
    }
  };

  const handleModalBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };
  
  const handleEditDetails = () => {
    setCurrentQuestion(0);
    setShowModal(true);
  }

  const handleModeToggle = () => {
    const newMode = !isOverviewMode;
    setIsOverviewMode(newMode);
    
    // Scroll to top when switching to overview mode for smooth experience
    if (newMode) {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  const addStep = useCallback((insertAtIndex: number, openForEditing = true, type: 'video' | 'reward' = 'video') => {
    const newStepId = `step-${Date.now()}`;

    const newStep: TrailStep = {
      id: newStepId,
      title: '',
      content: '',
      type,
      source: '',
      thumbnailUrl: '',
      isSaved: false,
      trail_id: '',
      step_index: 0,
      created_at: new Date().toISOString()
    };
    
    const newSteps = [...steps];
    newSteps.splice(insertAtIndex, 0, newStep);
    
    setSteps(newSteps);
    setEditingStepId(newStepId);
    setCurrentStepIndex(insertAtIndex);
  }, [steps]);

  const updateStep = useCallback((index: number, value: Partial<TrailStep>) => {
    setSteps(currentSteps => {
      const newSteps = [...currentSteps];
      if (newSteps[index]) {
        newSteps[index] = { ...newSteps[index], ...value };
      }
      return newSteps;
    });
  }, []);

  const navigateToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }, [steps.length]);

  const removeStep = useCallback((index: number) => {
    const stepToRemove = steps[index];
    if (stepToRemove.type === 'reward') {
      const rewardCount = steps.filter(step => step.type === 'reward').length;
      if (rewardCount <= 1) {
        // Here you might want to show a toast or some other user feedback
        console.log("Cannot delete the last reward step.");
        return;
      }
    }

    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);

    if (currentStepIndex >= newSteps.length && newSteps.length > 0) {
      setCurrentStepIndex(newSteps.length - 1);
    }
  }, [steps, currentStepIndex]);

  const moveStep = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= steps.length || toIndex >= steps.length) {
      return;
    }
    
    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    
    // Simple insertion at target position
    newSteps.splice(toIndex, 0, movedStep);
    
    setSteps(newSteps);
  }, [steps]);
  
  const renderModalQuestion = () => {
    const question = questions[currentQuestion];
    
    // Calculate which dots to show (max 3 visible at a time)
    const totalSteps = questions.length;
    let startIndex = Math.max(0, currentQuestion - 1);
    const endIndex = Math.min(totalSteps, startIndex + 3);
    
    // Adjust if we're near the end
    if (endIndex - startIndex < 3 && startIndex > 0) {
      startIndex = Math.max(0, endIndex - 3);
    }
    
    const visibleSteps = questions.slice(startIndex, endIndex);
    
    // Check if current step has a valid value
    const isCurrentStepValid = () => {
      switch (question.id) {
        case 'title':
          return trailTitle && trailTitle.trim() !== '';
        case 'description':
          return trailDescription && trailDescription.trim() !== '';
        case 'investment':
          return suggestedInvestment && suggestedInvestment > 0;
        case 'trailValue':
          return trailValue && trailValue > 0;
        default:
          return false;
      }
    };
    
    return (
      <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
        {/* Dot-to-dot progress indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            {visibleSteps.map((q, index) => {
              const actualIndex = startIndex + index;
              return (
                <div key={q.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-bold",
                      actualIndex === currentQuestion 
                        ? "bg-black text-white scale-125" 
                        : actualIndex < currentQuestion 
                          ? "bg-gray-400 text-white" 
                          : "bg-gray-600 text-white"
                    )}
                  >
                    {actualIndex + 1}
                  </div>
                  {index < visibleSteps.length - 1 && (
                    <div className={cn(
                      "w-12 h-0.5 mx-3 transition-all duration-300",
                      actualIndex < currentQuestion ? "bg-gray-400" : "bg-gray-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-left">
            {question.question}
          </h3>
                    {question.id === 'title' && (
            <Input
              value={trailTitle}
              onChange={(e) => setTrailTitle(e.target.value)}
              placeholder={question.placeholder}
              className="w-full text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
              onFocus={(e) => {
                // Select all text when focused for easy editing
                setTimeout(() => (e.target as HTMLInputElement).select(), 0);
              }}
              onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
            />
          )}
          {question.id === 'description' && (
            <Textarea
              value={trailDescription}
              onChange={(e) => setTrailDescription(e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              className="w-full text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
              onFocus={(e) => {
                // Select all text when focused for easy editing
                setTimeout(() => (e.target as HTMLTextAreaElement).select(), 0);
              }}
              onDoubleClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          )}
          {question.id === 'investment' && (
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 [&]:text-[1.125rem] [&]:md:text-[1.125rem] min-w-[1.5rem] text-right">{getCurrencySymbol(trailCurrency)}</span>
              <Input
                type="number"
                value={editingTrailId && suggestedInvestment > 0 ? suggestedInvestment : (suggestedInvestment === 0 ? '' : suggestedInvestment)}
                onChange={(e) => {
                  const newValue = Number(e.target.value) || 0;
                  setSuggestedInvestment(newValue);
                }}
                placeholder={question.placeholder}
                className="pl-12 text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
                onFocus={(e) => {
                  // Select all text when focused for easy editing
                  setTimeout(() => (e.target as HTMLInputElement).select(), 0);
                }}
                onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
          )}
          {question.id === 'trailValue' && (
            <div className="flex items-center gap-3 w-full">
              <Select value={trailCurrency} onValueChange={setTrailCurrency}>
                <SelectTrigger className="w-20 [&]:text-[1.125rem] [&]:md:text-[1.125rem]">
                  <SelectValue>
                    {trailCurrency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 [&]:text-[1.125rem] [&]:md:text-[1.125rem] min-w-[1.5rem] text-right">{getCurrencySymbol(trailCurrency)}</span>
                <Input
                  type="number"
                  value={editingTrailId && trailValue > 0 ? trailValue : (trailValue === 0 ? '' : trailValue)}
                  onChange={(e) => {
                    const newValue = Number(e.target.value) || 0;
                    setTrailValue(newValue);
                  }}
                  placeholder={question.placeholder}
                  className="pl-12 text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
                  onFocus={(e) => {
                    // Select all text when focused for easy editing
                    setTimeout(() => (e.target as HTMLInputElement).select(), 0);
                  }}
                  onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <Button variant="ghost" onClick={handleModalBack} className={cn(currentQuestion === 0 && "invisible")}>
            Back
          </Button>
          <Button 
            onClick={handleModalNext}
            disabled={!isCurrentStepValid()}
            className={cn(
              "transition-all duration-200",
              isCurrentStepValid() 
                ? "bg-black text-white hover:bg-black/90" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {currentQuestion === questions.length - 1 ? 'Start Building' : 'Next'}
          </Button>
        </div>
      </div>
    );
  };

  const rewardStepIndex = useMemo(() => steps.findIndex(step => step.type === 'reward'), [steps]);

  const handleAddStep = (index: number, type: 'video' | 'reward') => {
    addStep(index, true, type);
  }

  const handleRewardSave = () => {
    setPlayConfetti(true);
  };

  const handleSaveAsDraft = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (isSaving) {
      console.log('🚫 Save already in progress, preventing duplicate');
      return; // Prevent multiple saves
    }

    console.log('💾 Starting save process...');
    setIsSaving(true);

    try {
      // Create a consistent trail ID
      const trailId = editingTrailId || `trail-${Date.now()}`;
      console.log('🆔 Trail ID:', trailId, 'Editing existing:', !!editingTrailId);
      
      // Create trail object for draft
      const draftTrail = {
        id: trailId,
        title: trailTitle,
        description: trailDescription,
        status: 'draft' as const,
        createdAt: editingTrailId ? new Date().toISOString() : new Date().toISOString(),
        views: 0,
        earnings: 0,
        steps: steps,
        thumbnailUrl: (() => {
          const rewardStep = steps.find(step => step.type === 'reward');
          const thumbnailUrl = rewardStep?.thumbnailUrl;
          console.log('🖼️ Reward step found:', !!rewardStep, 'Thumbnail URL:', thumbnailUrl);
          return thumbnailUrl || undefined;
        })(),
        suggestedInvestment,
        trailValue,
        trailCurrency,
        creator_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_published: false
      };

      // Save to user's account
      console.log('💾 Saving draft trail:', {
        id: draftTrail.id,
        title: draftTrail.title,
        status: draftTrail.status,
        type: 'draft'
      });
      await saveUserTrail(draftTrail, 'draft');
      console.log('💾 Draft trail saved successfully');
      
      // Remove from saved trails since user is now the creator
      if (typeof window !== 'undefined' && user) {
        const savedTrails = JSON.parse(localStorage.getItem(`user_${user.id}_saved`) || '[]');
        const filteredSaved = savedTrails.filter((t: any) => t.id !== trailId);
        localStorage.setItem(`user_${user.id}_saved`, JSON.stringify(filteredSaved));
        if (savedTrails.length !== filteredSaved.length) {
          console.log('🗑️ Removed trail from saved section (became creator via draft save)');
        }
      }

      // Set the editingTrailId so future saves update the same draft
      if (!editingTrailId) {
        setEditingTrailId(trailId);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const validatePublishing = () => {
    // Check if there's at least one saved step and one saved reward
    const savedVideoSteps = steps.filter(step => 
      step.type === 'video' && 
      step.isSaved && 
      step.title.trim() !== '' && 
      step.source.trim() !== ''
    );
    const savedRewardSteps = steps.filter(step => 
      step.type === 'reward' && 
      step.isSaved && 
      step.title.trim() !== '' && 
      step.source.trim() !== ''
    );
    
    if (savedVideoSteps.length === 0 || savedRewardSteps.length === 0) {
      setShowPublishValidationDialog(true);
      return false;
    }
    
    // Check if any steps with titles are unsaved
    const unsavedSteps = steps.filter(step => 
      step.title.trim() !== '' && 
      !step.isSaved
    );
    if (unsavedSteps.length > 0) {
      setShowUnsavedStepsDialog(true);
      return false;
    }
    
    return true;
  };

  const canPublish = () => {
    // Check if there's at least one saved step and one saved reward
    const savedVideoSteps = steps.filter(step => 
      step.type === 'video' && 
      step.isSaved && 
      step.title.trim() !== '' && 
      step.source.trim() !== ''
    );
    const savedRewardSteps = steps.filter(step => 
      step.type === 'reward' && 
      step.isSaved && 
      step.title.trim() !== '' && 
      step.source.trim() !== ''
    );
    
    return savedVideoSteps.length > 0 && savedRewardSteps.length > 0;
  };

  const handlePublishTrail = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const trailId = editingTrailId || `trail-${Date.now()}`;

    // Create trail object for publishing
    const publishedTrail = {
      id: trailId,
      title: trailTitle,
      description: trailDescription,
      status: 'published' as const,
      createdAt: editingTrailId ? new Date().toISOString() : new Date().toISOString(),
      views: 0,
      earnings: 0,
      steps: steps,
      thumbnailUrl: steps.find(step => step.type === 'reward')?.thumbnailUrl || undefined,
              shareableLink: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/trail/${trailId}`,
      suggestedInvestment,
      trailValue,
      trailCurrency,
      creator_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_published: true
    };

    try {
      console.log('🚀 Publishing trail:', trailId);
      console.log('🔗 Shareable link:', publishedTrail.shareableLink);
      
      // Save to user's account as published
      await saveUserTrail(publishedTrail, 'published');
      console.log('✅ Trail saved as published');
      
      // Remove from saved trails since user is now the creator
      if (typeof window !== 'undefined' && user) {
        const savedTrails = JSON.parse(localStorage.getItem(`user_${user.id}_saved`) || '[]');
        const filteredSaved = savedTrails.filter((t: any) => t.id !== trailId);
        localStorage.setItem(`user_${user.id}_saved`, JSON.stringify(filteredSaved));
        if (savedTrails.length !== filteredSaved.length) {
          console.log('🗑️ Removed trail from saved section (became creator via publish)');
        }
      }
      
      // Remove from drafts if it exists there (this handles both editing existing drafts and new trails)
      await deleteUserTrail(trailId, 'draft');
      console.log('✅ Trail removed from drafts');

      // Clear the editing data from localStorage since we're done editing
      localStorage.removeItem('editingTrail');
      console.log('✅ Cleared editing data from localStorage');

      // Force a storage event to update other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: `user_${user?.id}_drafts`,
          newValue: localStorage.getItem(`user_${user?.id}_drafts`)
        }));
      }

      // Store the published trail temporarily for the confirmation page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('publishedTrail', JSON.stringify(publishedTrail));
      }
      
      // Always navigate to publish confirmation page, regardless of whether it's a draft or new trail
      navigate('/publish-confirmation');
    } catch (error) {
      console.error('Error publishing trail:', error);
      toast.error('Failed to publish trail. Please try again.');
    }
  };

  const handlePublishWithValidation = () => {
    if (!validatePublishing()) {
      return;
    }
    handlePublishTrail();
  };

  const handleModalClose = () => {
    // If we're editing an existing trail, just close the modal
    if (editingTrailId) {
      setShowModal(false);
    } else {
      // If creating a new trail and user closes before completion, go back to home
      navigate('/');
    }
  };

  const handleLoginSuccess = () => {
    // Retry the action that was interrupted by login
    if (showLoginModal) {
      setShowLoginModal(false);
      // The user can now try to save/publish again
    }
  };

  const checkSubscriptionBeforeAction = (action: () => void) => {
    console.log('🔒 Checking subscription before action...', {
      isAuthenticated,
      subscriptionLoading,
      subscriptionStatus,
      canCreate: canCreateTrails(),
      isSubscribed: subscriptionStatus?.isSubscribed,
      isTrialing: subscriptionStatus?.isTrialing,
      status: subscriptionStatus?.status
    });
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, showing login modal');
      setShowLoginModal(true);
      return;
    }

    // If subscription is still loading, wait a moment and try again
    if (subscriptionLoading) {
      console.log('⏳ Subscription still loading, waiting...');
      setTimeout(() => checkSubscriptionBeforeAction(action), 1000);
      return;
    }

    if (!canCreateTrails()) {
      console.log('❌ Cannot create trails, showing subscription modal', {
        isSubscribed: subscriptionStatus?.isSubscribed,
        isTrialing: subscriptionStatus?.isTrialing,
        status: subscriptionStatus?.status
      });
      setShowSubscriptionModal(true);
      return;
    }

    console.log('✅ Subscription check passed, executing action');
    action();
  };

  const handleSubscriptionSuccess = () => {
    setShowSubscriptionModal(false);
    // The user can now create trails
  };

  console.log('[Debug] CreatorView rendering with index:', currentStepIndex);

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
      <Dialog open={showModal} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md">
          {renderModalQuestion()}
        </DialogContent>
      </Dialog>
      
      {!showModal && (
        <div className="min-h-screen bg-white py-8 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <header className="text-left mb-8">
              <h1 className="text-4xl font-bold text-gray-900">{trailTitle}</h1>
              <p className="text-gray-600 mt-2">{trailDescription}</p>
              <div className="flex justify-start gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleEditDetails}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
                <Button variant="outline" size="sm" onClick={handleModeToggle}>
                  {isOverviewMode ? <Shrink className="h-4 w-4 mr-2" /> : <Expand className="h-4 w-4 mr-2" />}
                  {isOverviewMode ? 'Focus View' : 'Overview'}
                </Button>
              </div>
            </header>

            {isOverviewMode ? (
              <OverviewMode
                steps={steps}
                setSteps={setSteps}
                updateStep={updateStep}
                removeStep={removeStep}
                editingStepId={editingStepId}
                setEditingStepId={setEditingStepId}
                setCurrentStepIndex={setCurrentStepIndex}
                onRewardSave={handleRewardSave}
                handleAddStep={handleAddStep}
              />
            ) : (
              <FocusView
                steps={steps}
                currentStepIndex={currentStepIndex}
                setCurrentStepIndex={setCurrentStepIndex}
                updateStep={updateStep}
                removeStep={removeStep}
                editingStepId={editingStepId}
                setEditingStepId={setEditingStepId}
                onRewardSave={handleRewardSave}
                handleAddStep={handleAddStep}
              />
            )}
            
            <footer className="mt-8 flex justify-end gap-2">
              <Button 
                variant="outline" 
                className="bg-gray-100"
                onClick={() => checkSubscriptionBeforeAction(handleSaveAsDraft)}
                disabled={isSaving || subscriptionLoading}
              >
                {isSaving ? 'Saving...' : subscriptionLoading ? 'Loading...' : (editingTrailId ? 'Save Changes' : 'Save as Draft')}
              </Button>
              <Button 
                className={cn(
                  "text-white",
                  canPublish() 
                    ? "bg-black hover:bg-black/90" 
                    : "bg-gray-400 cursor-not-allowed"
                )}
                onClick={() => checkSubscriptionBeforeAction(handlePublishWithValidation)}
                disabled={!canPublish()}
              >
                Publish Trail
              </Button>
            </footer>
          </div>
        </div>
      )}

      {/* Publishing Requirements Dialog */}
      <Dialog open={showPublishValidationDialog} onOpenChange={setShowPublishValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Publish Trail</DialogTitle>
            <DialogDescription>
              You need at least one video step and one reward step saved before publishing your trail. 
              Make sure to fill in the content, add a URL, and click "Save Step" for each step you want to include.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowPublishValidationDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Steps Dialog */}
      <Dialog open={showUnsavedStepsDialog} onOpenChange={setShowUnsavedStepsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Your Steps Before Publishing</DialogTitle>
            <DialogDescription>
              You have unsaved steps in your trail. Please save all your steps by clicking "Save Step" before publishing, or publish anyway and lose your unsaved changes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowUnsavedStepsDialog(false)}>
              Save Steps First
            </Button>
            <Button 
              onClick={() => {
                setShowUnsavedStepsDialog(false);
                handlePublishTrail();
              }}
            >
              Publish Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        onSubscribe={startSubscription}
      />
    </>
  );
};

export default CreatorView; 