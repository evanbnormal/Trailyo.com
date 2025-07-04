import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Check, Gift, ChevronLeft, ChevronRight } from "lucide-react";

interface TrailProgressProps {
  totalSteps: number;
  currentStep: number;
  windowStart: number;
  windowEnd: number;
  completedSteps?: Set<number>;
  onStepClick: (stepIndex: number) => void;
  onWindowChange: (newStart: number) => void;
}

const TrailProgress: React.FC<TrailProgressProps> = ({
  totalSteps,
  currentStep,
  windowStart,
  windowEnd,
  completedSteps = new Set(),
  onStepClick,
  onWindowChange,
}) => {
  const visibleSteps = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  const isStepCompleted = (index: number) => completedSteps.has(index);

  return (
    <div className="w-full flex justify-center items-center mb-10 h-16">
      {/* Left arrow if there are steps before the window */}
      {windowStart > 0 && (
        <button
          onClick={() => onWindowChange(windowStart - 1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4"
          aria-label="Previous steps"
        >
          <ChevronLeft className="w-6 h-6 text-gray-500" />
        </button>
      )}
      <div className="flex items-center gap-4">
        {visibleSteps.map((index, i) => (
          <React.Fragment key={index}>
            <button
              onClick={() => onStepClick(index)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative",
                index !== totalSteps - 1 && "bg-black border-2 border-black",
                currentStep === index && (index !== totalSteps - 1 ? "ring-2 ring-black scale-110" : "scale-125"),
                // Only apply opacity to non-reward dots
                index !== totalSteps - 1 && currentStep > index && "opacity-80",
                index !== totalSteps - 1 && currentStep < index && "opacity-60",
              )}
              aria-label={`Go to step ${index + 1}`}
            >
              {index === totalSteps - 1 ? (
                <div className={
                  "w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg"
                }>
                  <Gift className={cn(
                    "text-white",
                    "w-6 h-6"
                  )} />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {isStepCompleted(index) ? (
                    <motion.div
                      key={`tick-${index}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        duration: 0.5, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                      }}
                      className="w-8 h-8 flex items-center justify-center"
                    >
                      <Check className="text-white w-6 h-6 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key={`number-${index}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-white text-xl font-bold"
                    >
                      {index + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              )}
            </button>
            {/* Line between dots, except after last */}
            {i < visibleSteps.length - 1 && (
              <div className="h-1 w-28 bg-gray-300 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Right arrow if there are steps after the window */}
      {windowEnd < totalSteps - 1 && (
        <button
          onClick={() => onWindowChange(windowStart + 1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors ml-4"
          aria-label="Next steps"
        >
          <ChevronRight className="w-6 h-6 text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default TrailProgress;
