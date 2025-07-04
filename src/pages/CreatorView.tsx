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

interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'reward';
  source: string;
  thumbnailUrl?: string;
  isSaved?: boolean;
}

// Use process.env for Next.js public env variables
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_BASE_URL || 'http://localhost:3001';

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
        <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center p-4">
          <img src="/Asset 10newest.png" alt="Default thumbnail" className="w-full h-full object-contain" />
        </div>
      );

      if (isValidUrl(debouncedUrl) && !getYouTubeVideoId(debouncedUrl) && !thumbnailUrl) {
        const fetchPromise = async () => {
          const response = await fetch(`${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(debouncedUrl)}`);
          if (!response.ok) throw new Error('Proxy fetch failed');
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) {
            throw new Error('Fetched content is not an image');
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
          return base64Url;
        };

        const loadingToast = toast.loading('Fetching website thumbnail...');
        fetchPromise()
          .then((base64Url) => {
            if (!isCancelled) {
              onThumbnailUpdate(base64Url);
            }
            toast.dismiss(loadingToast);
            toast.success('Thumbnail fetched!', { duration: 2000 });
          })
          .catch((err) => {
            if (!isCancelled) {
              console.error("Failed to fetch preview:", err);
              setPreview(fallbackUi);
            }
            toast.dismiss(loadingToast);
            // Only show one error toast at a time
            if (!errorToastId.current) {
              errorToastId.current = String(toast.error('Could not fetch thumbnail.', { duration: 2000 }));
            }
          });
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
  }, [debouncedUrl, thumbnailUrl, onThumbnailUpdate]);

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
      {isLoading ? <p className="text-gray-500">Loading Preview...</p> : preview}
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
      {step.source && (
        <ContentPreview 
          url={step.source} 
          thumbnailUrl={step.thumbnailUrl}
          onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
          className="my-0" 
        />
      )}
      <div>
          <label className="text-base sm:text-lg lg:text-xl font-semibold text-black">Content URL</label>
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
            placeholder="Enter Content URL"
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
      window.open(step.source, '_blank', 'noopener,noreferrer');
    } else {
      toast.error("Invalid or missing reward URL.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-0 flex flex-col min-h-[300px]">
      <div className="flex-grow">
        {step.type === 'reward' ? (
          <div className="text-center pt-0 pb-2 flex flex-col justify-center items-center">
              {step.source && (
                <ContentPreview 
                  url={step.source} 
                  className="mb-4 w-full" 
                  thumbnailUrl={step.thumbnailUrl}
                  onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
                />
              )}
              <p className="text-base sm:text-lg mb-8" style={{ color: '#D4AF37' }}>{step.content}</p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block mt-2"
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
            {step.source && (
              <ContentPreview 
                url={step.source} 
                thumbnailUrl={step.thumbnailUrl}
                onThumbnailUpdate={(newUrl) => updateStep(index, { thumbnailUrl: newUrl })}
              />
            )}
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
  let end = Math.min(steps.length, start + MAX_DOTS);

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
  const { isAuthenticated, saveUserTrail, deleteUserTrail } = useAuth();

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

  useEffect(() => {
    // Check if we're editing an existing trail
    const editingTrailData = localStorage.getItem('editingTrail');
    if (editingTrailData) {
      try {
        const trail = JSON.parse(editingTrailData);
        setTrailTitle(trail.title);
        setTrailDescription(trail.description);
        setSuggestedInvestment(trail.suggestedInvestment || 0);
        setTrailValue(trail.trailValue || 0);
        setTrailCurrency(trail.trailCurrency || 'USD');
        setSteps(trail.steps || []);
        setEditingTrailId(trail.id);
        
        // Clear the editing data from localStorage
        localStorage.removeItem('editingTrail');
        
        // Don't show modal when editing existing trail
        setShowModal(false);
        
        // If there are steps, set the first one as current
        if (trail.steps && trail.steps.length > 0) {
          setCurrentStepIndex(0);
          setEditingStepId(trail.steps[0].id);
        }
      } catch (error) {
        console.error('Error loading trail data:', error);
      }
    } else {
      // Start with one step and a reward if none exist
      if (steps.length === 0 && !showModal) {
        const initialStepId = `step-${Date.now()}`;
        setSteps([
          { id: initialStepId, title: '', content: '', type: 'video', source: '', thumbnailUrl: '', isSaved: false },
          { id: 'reward', title: '', content: '', type: 'reward', source: '', thumbnailUrl: '', isSaved: false }
        ]);
        setEditingStepId(initialStepId);
      }
    }
  }, [steps.length, showModal]);

  // Scroll to top when switching to overview mode
  useEffect(() => {
    if (isOverviewMode) {
      // Small delay to ensure the mode switch animation starts first
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    let endIndex = Math.min(totalSteps, startIndex + 3);
    
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
                      "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                      actualIndex === currentQuestion 
                        ? "bg-black text-white scale-125" 
                        : actualIndex < currentQuestion 
                          ? "bg-gray-400 text-white" 
                          : "bg-gray-200 text-gray-500"
                    )}
                  />
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
           />
          )}
          {question.id === 'description' && (
            <Textarea
              value={trailDescription}
              onChange={(e) => setTrailDescription(e.target.value)}
              placeholder={question.placeholder}
              rows={4}
              className="w-full text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
            />
          )}
          {question.id === 'investment' && (
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 [&]:text-[1.125rem] [&]:md:text-[1.125rem] min-w-[1.5rem] text-right">{getCurrencySymbol(trailCurrency)}</span>
              <Input
                type="number"
                value={suggestedInvestment === 0 ? '' : suggestedInvestment}
                onChange={(e) => setSuggestedInvestment(Number(e.target.value) || 0)}
                placeholder={question.placeholder}
                className="pl-12 text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
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
                  value={trailValue === 0 ? '' : trailValue}
                  onChange={(e) => setTrailValue(Number(e.target.value) || 0)}
                  placeholder={question.placeholder}
                  className="pl-12 text-left [&]:text-[1.125rem] [&]:md:text-[1.125rem]"
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

    // Create trail object for draft
    const draftTrail = {
      id: editingTrailId || `trail-${Date.now()}`,
      title: trailTitle,
      description: trailDescription,
      status: 'draft' as const,
      createdAt: editingTrailId ? new Date().toISOString() : new Date().toISOString(),
      views: 0,
      earnings: 0,
      steps: steps,
      thumbnailUrl: steps.find(step => step.type === 'reward')?.thumbnailUrl || undefined,
      suggestedInvestment,
      trailValue,
      trailCurrency
    };

    try {
    // Save to user's account
      await saveUserTrail(draftTrail, 'draft');

    // Always stay in creator view and save in background
    if (editingTrailId) {
      toast.success('Changes saved!');
    } else {
      toast.success('Trail saved as draft!');
      // Set the editingTrailId so future saves update the same draft
      setEditingTrailId(draftTrail.id);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
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
      shareableLink: `${window.location.origin}/trail/${trailId}`,
      suggestedInvestment,
      trailValue,
      trailCurrency
    };

    try {
      // Save to user's account as published
      await saveUserTrail(publishedTrail, 'published');
      
      // Remove from drafts if it exists there (this handles both editing existing drafts and new trails)
      deleteUserTrail(trailId, 'draft');

    // Always navigate to publish confirmation page, regardless of whether it's a draft or new trail
    toast.success('Trail published successfully!');
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

  console.log('[Debug] CreatorView rendering with index:', currentStepIndex);

  return (
    <>
      {playConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.3}
          friction={0.99}
          wind={0.05}
          opacity={0.8}
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
                onClick={handleSaveAsDraft}
              >
                {editingTrailId ? 'Save Changes' : 'Save as Draft'}
              </Button>
              <Button 
                className={cn(
                  "text-white",
                  canPublish() 
                    ? "bg-black hover:bg-black/90" 
                    : "bg-gray-400 cursor-not-allowed"
                )}
                onClick={handlePublishWithValidation}
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
    </>
  );
};

export default CreatorView; 