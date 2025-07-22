'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Edit, 
  Eye, 
  Trash2, 
  Plus, 
  TrendingUp, 
  Clock, 
  Users, 
  Archive, 
  BarChart3, 
  Image as ImageIcon,
  Share2,
  Copy,
  FileText,
  Crown,
  Gift
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { SavedTrailCard } from '@/components/TrailCard';

interface TrailStep {
  id: string;
  title: string;
  content: string;
  type: 'video' | 'reward';
  source: string;
  thumbnailUrl?: string;
  isSaved?: boolean;
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
}

const Profile: React.FC = () => {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [trailToArchive, setTrailToArchive] = useState<Trail | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trailToDelete, setTrailToDelete] = useState<Trail | null>(null);
  const [showSharingDialog, setShowSharingDialog] = useState(false);
  const [currentTrail, setCurrentTrail] = useState<Trail | null>(null);
  const [showThumbnailDialog, setShowThumbnailDialog] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const navigate = useNavigate();
  const { user, getUserTrails, saveUserTrail, deleteUserTrail } = useAuth();
  const { subscriptionStatus, canCreateTrails, loadSubscriptionStatus } = useSubscription();

  // Force refresh subscription status when profile loads
  useEffect(() => {
    if (user?.id) {
      loadSubscriptionStatus();
    }
  }, [user?.id, loadSubscriptionStatus]);

  // Load trails from user's account on component mount
  useEffect(() => {
    const loadTrails = async () => {
      if (!user) {
        setTrails([]);
        return;
      }

      const { drafts, published } = await getUserTrails();
      
      // Combine and sort all trails by creation date
      const allTrails = [...drafts, ...published].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setTrails(allTrails);
    };

    loadTrails();

    // Add focus event listener to reload trails when user returns to this page
    const handleFocus = () => {
      loadTrails();
    };

    // Add storage event listener to detect when trail data changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('_drafts') || e.key.includes('_published'))) {
        loadTrails();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, getUserTrails]);

  const publishedTrails = trails.filter(trail => (trail as any).status === 'published' || (trail as any).is_published);
  const draftTrails = trails.filter(trail => (trail as any).status === 'draft' || !(trail as any).is_published);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleArchiveTrail = (trail: Trail) => {
    setTrailToArchive(trail);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    if (trailToArchive) {
      try {
        // Remove from published trails first
        deleteUserTrail(trailToArchive.id, 'published');

        // Add to draft trails with updated status
        const updatedDraft = { 
          ...trailToArchive, 
          status: 'draft' as const, 
          is_published: false,
          shareableLink: undefined 
        };
        await saveUserTrail(updatedDraft, 'draft');

        // Force reload trails by triggering the useEffect
        const { drafts, published } = await getUserTrails();
        const allTrails = [...drafts, ...published].sort((a, b) => 
          new Date((b as any).createdAt || (b as any).created_at).getTime() - new Date((a as any).createdAt || (a as any).created_at).getTime()
        );
        setTrails(allTrails as any);

        toast.success('Trail moved to drafts');
      } catch (error) {
        console.error('Error archiving trail:', error);
        toast.error('Failed to archive trail. Please try again.');
      }
    }
    setShowArchiveDialog(false);
    setTrailToArchive(null);
  };

  const handleDeleteTrail = (trail: Trail) => {
    setTrailToDelete(trail);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (trailToDelete) {
      // Remove from appropriate storage
      deleteUserTrail(trailToDelete.id, trailToDelete.status);

      // Update local state
      setTrails(prev => prev.filter(trail => trail.id !== trailToDelete.id));
      toast.success('Trail deleted');
    }
    setShowDeleteDialog(false);
    setTrailToDelete(null);
  };

  const handleEditTrail = (trail: Trail) => {
    // Save trail data to localStorage for CreatorView to load
    localStorage.setItem('editingTrail', JSON.stringify(trail));
    navigate('/creator');
  };

  const handleViewAnalytics = (trail: Trail) => {
    // Navigate to analytics page
    navigate(`/trail-analytics/${trail.id}`);
  };

  const handleChangeThumbnail = (trail: Trail) => {
    setSelectedTrail(trail);
    setShowThumbnailDialog(true);
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTrail) return;

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
        
        try {
          // Update trail in user's account
          const updatedTrail = { ...selectedTrail, thumbnailUrl: base64Url };
          await saveUserTrail(updatedTrail, selectedTrail.status);

          // Update local state
          setTrails(prev => prev.map(trail => 
            trail.id === selectedTrail.id ? { ...trail, thumbnailUrl: base64Url } : trail
          ));

          toast.success('Thumbnail updated!');
          setShowThumbnailDialog(false);
          setSelectedTrail(null);
        } catch (error) {
          console.error('Error updating thumbnail:', error);
          toast.error('Failed to update thumbnail. Please try again.');
        }
      } else {
        toast.error("Incorrect Aspect Ratio", { description: "Please upload an image with a 16:9 aspect ratio." });
      }
    };
  };

  const handleShareTrail = (trail: Trail) => {
    setCurrentTrail(trail);
    setShowSharingDialog(true);
  };

  const copyShareLink = () => {
    if (currentTrail?.shareableLink) {
      navigator.clipboard.writeText(currentTrail.shareableLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const getTrailThumbnail = (trail: Trail) => {
    // Use custom thumbnail if set, otherwise use reward step's thumbnail
    if (trail.thumbnailUrl) {
      return trail.thumbnailUrl;
    }

    // Find the reward step and use its thumbnail
    const rewardStep = trail.steps.find(step => step.type === 'reward' && step.thumbnailUrl);
    return rewardStep?.thumbnailUrl || '/placeholder.svg';
  };

  const getCurrencySymbol = (code: string) => {
    const currencies = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'CNY': '¥'
    };
    return currencies[code as keyof typeof currencies] || '$';
  };

  const TrailCard: React.FC<{ trail: Trail; isPublished?: boolean; isSavedView?: boolean; onClick?: () => void }> = ({ trail, isPublished = false, isSavedView = false, onClick }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
    <div className="relative">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        {getTrailThumbnail(trail) ? (
          <img 
            src={getTrailThumbnail(trail)} 
            alt={trail.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {/* Top left buttons */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isSavedView && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                handleChangeThumbnail(trail);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Top right buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isPublished ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                handleArchiveTrail(trail);
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          ) : (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Draft
            </Badge>
          )}
        </div>
      </div>
      {/* Content */}
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {trail.title}
            </h3>
            {isPublished && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (trail.shareableLink) {
                    navigator.clipboard.writeText(trail.shareableLink);
                    toast.success('Link copied to clipboard!');
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {trail.description.length > 110 
              ? `${trail.description.substring(0, 110)}...` 
              : trail.description}
          </p>
          {/* Buttons below description, aligned right */}
          <div className="flex justify-end gap-2 mt-2">
            {isPublished && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewAnalytics(trail);
                }}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="h-8 px-2 bg-red-500 hover:bg-red-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTrail(trail);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  </Card>
);

  // Fetch all user trails and filter for those with active: true
  const [savedTrails, setSavedTrails] = useState<Trail[]>([]);

  useEffect(() => {
    const loadSavedTrails = async () => {
      if (!user) {
        setSavedTrails([]);
        return;
      }
      
      try {
        // Load saved trails from localStorage
        const savedTrailsData = localStorage.getItem(`user_${user.id}_saved`);
        if (savedTrailsData) {
          const parsedTrails = JSON.parse(savedTrailsData);
          // Filter for trails with active: true (trails user is actively learning)
          const activeTrails = parsedTrails.filter((trail: any) => trail.active === true);
          setSavedTrails(activeTrails);
        } else {
          setSavedTrails([]);
        }
      } catch (error) {
        console.error('Error loading saved trails:', error);
        setSavedTrails([]);
      }
    };

    loadSavedTrails();

    // Add storage event listener to detect when saved trails change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes('_saved')) {
        loadSavedTrails();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
        {/* Profile Header - Centered */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">
              {user ? user.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{user?.name || 'User'}</h1>
          <p className="text-gray-600 mb-6">
            {canCreateTrails() ? (
              <>
                <Crown className="inline-block h-4 w-4 mr-1 text-amber-500" />
                <span className="text-amber-600 font-medium">Creator</span>
                {subscriptionStatus.isTrialing && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full ml-2">
                    Trial
                  </span>
                )}
              </>
            ) : (
              <>
                <Gift className="inline-block h-4 w-4 mr-1 text-gray-400" />
                Free Tier
              </>
            )}
          </p>
          
          {/* Trial Days Remaining */}
          {subscriptionStatus.isTrialing && subscriptionStatus.trialEnd && (
            <p className="text-sm text-blue-600 mb-6">
              {(() => {
                const now = Math.floor(Date.now() / 1000);
                const daysLeft = Math.ceil((subscriptionStatus.trialEnd - now) / (24 * 60 * 60));
                return `${daysLeft} days left in trial`;
              })()}
            </p>
          )}
          
          {/* Create New Trail Button */}
          <Link to="/creator">
            <Button className="bg-black text-white hover:bg-black/90">
              <Plus className="h-4 w-4 mr-2" />
              Create New Trail
            </Button>
          </Link>
        </div>

        {/* Trails Tabs */}
        <Tabs defaultValue="saved" className="flex flex-col items-center">
          <TabsList className="mx-auto inline-flex px-2 py-1 bg-white rounded-xl shadow-sm mt-6 gap-3">
            <TabsTrigger value="published" className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:rounded-md data-[state=active]:px-4 data-[state=active]:py-1.5">Published</TabsTrigger>
            <TabsTrigger value="drafts" className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:rounded-md data-[state=active]:px-4 data-[state=active]:py-1.5">Drafts</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:rounded-md data-[state=active]:px-4 data-[state=active]:py-1.5">Saved</TabsTrigger>
          </TabsList>
          <TabsContent value="saved">
            <div className="mt-6">
              {savedTrails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-gray-500 text-lg font-medium">No saved trails</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                  {savedTrails.map((trail: Trail) => (
                    <SavedTrailCard key={trail.id} trail={trail} onClick={() => window.open(trail.shareableLink || `/learner/${trail.id}`, '_self')} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="drafts">
            <div className="mt-6">
              {draftTrails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-gray-500 text-lg font-medium">No draft trails</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                  {draftTrails.map((trail) => (
                    <div key={trail.id} className="relative group cursor-pointer" onClick={() => handleEditTrail(trail)}>
                      <TrailCard trail={trail} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="published">
            <div className="mt-6">
              {publishedTrails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="text-gray-500 text-lg font-medium">No published trails</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                  {publishedTrails.map((trail) => (
                    <div key={trail.id} className="relative group cursor-pointer">
                      <TrailCard trail={trail} isPublished={true} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="mx-auto w-auto flex flex-col items-center justify-center text-center">
          <DialogHeader>
            <DialogTitle>Draft Trail</DialogTitle>
            <DialogDescription>
              Are you sure you want to draft this trail? Your shareable link will no longer be available.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmArchive}>
              Draft Trail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sharing Dialog */}
      <Dialog open={showSharingDialog} onOpenChange={setShowSharingDialog}>
        <DialogContent className="mx-auto w-auto flex flex-col items-center justify-center text-center">
          <DialogHeader>
            <DialogTitle>Share Your Trail</DialogTitle>
            <DialogDescription>
              Share this link with others to let them access your trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={currentTrail?.shareableLink || ''}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-sm"
              />
              <Button size="sm" onClick={copyShareLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowSharingDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnail Upload Dialog */}
      <Dialog open={showThumbnailDialog} onOpenChange={setShowThumbnailDialog}>
        <DialogContent className="mx-auto w-auto flex flex-col items-center justify-center text-center">
          <DialogHeader>
            <DialogTitle>Change Trail Thumbnail</DialogTitle>
            <DialogDescription>
              Upload a new thumbnail image for your trail. Must be under 2MB with 16:9 aspect ratio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
                id="thumbnail-upload"
              />
              <label htmlFor="thumbnail-upload" className="cursor-pointer">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload thumbnail</p>
                <p className="text-xs text-gray-500 mt-1">Max 2MB, 16:9 aspect ratio</p>
              </label>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowThumbnailDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="mx-auto w-auto flex flex-col items-center justify-center text-center">
          <DialogHeader>
            <DialogTitle>Delete Trail</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{trailToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Trail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile; 