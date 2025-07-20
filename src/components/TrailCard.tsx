import { Card } from '@/components/ui/card';
import { Trash2, Gift } from 'lucide-react';

export const SavedTrailCard: React.FC<{ trail: any; onClick?: () => void; onDelete?: () => void }> = ({ trail, onClick, onDelete }) => {
  // Calculate progress percentage if available
  const totalSteps = trail?.steps?.length || 1;
  const progressStepIndex = trail?.progressStepIndex ?? 0;
  const completedSteps = trail?.completedSteps?.length || 0;
  
  // Use completed steps for more accurate progress
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={onClick}>
      <div className="flex flex-col h-full">
        {/* Thumbnail */}
        {trail.thumbnailUrl && (
          <img 
            src={trail.thumbnailUrl} 
            alt={trail.title}
            className="w-full aspect-video object-cover"
          />
        )}
        <div className="pl-5 pr-6 pt-3 pb-6 flex flex-col gap-2 flex-1">
          <h3 className="text-xl font-bold text-gray-900 truncate">{trail.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{trail.description}</p>
          <div className="flex justify-between items-end mt-4 w-full">
            {/* Delete button bottom left */}
            <button 
              className="p-2 rounded text-gray-400 hover:text-red-500 transition-colors"
              onClick={e => { e.stopPropagation(); if (onDelete) onDelete(); }}
              title="Delete saved trail"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {/* Progress icon */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeDasharray={`${progress * 1.13}, 113`}
                    strokeLinecap="round"
                  />
                </svg>
                <Gift className="absolute inset-0 m-auto w-4 h-4 text-yellow-500" />
              </div>
              <button 
                className="bg-black text-white px-4 py-2 rounded font-semibold text-sm hover:bg-black/90 active:scale-95 transition-transform"
                onClick={e => { e.stopPropagation(); if (onClick) onClick(); }}
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 