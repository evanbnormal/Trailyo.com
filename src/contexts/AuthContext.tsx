import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { Trail } from "@/lib/data";

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean | { status: 'unconfirmed_user', name?: string }>;
  signup: (email: string, password: string, name: string) => Promise<boolean | 'unconfirmed_user'>;
  logout: (redirectCallback?: () => void) => void;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  getUserTrails: () => Promise<{ drafts: Trail[]; published: Trail[] }>;
  saveUserTrail: (trail: Trail, type: 'draft' | 'published') => Promise<void>;
  deleteUserTrail: (trailId: string, type: 'draft' | 'published') => Promise<void>;
  permanentlyDeleteTrail: (trailId: string) => Promise<void>;
  removeTrailFromAllSavedTrails: (trailId: string) => void;
  removeTrailFromCurrentUserSavedTrails: (trailId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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

// Utility function to recursively convert blob URLs in trail data
const convertBlobUrlsInTrail = async (trail: any): Promise<any> => {
  const convertedTrail = { ...trail };
  
  // Convert trail thumbnail if it's a blob URL
  if (convertedTrail.thumbnailUrl && isBlobUrl(convertedTrail.thumbnailUrl)) {
    try {
      convertedTrail.thumbnailUrl = await convertBlobUrlToBase64(convertedTrail.thumbnailUrl);
    } catch (error) {
      console.error('Failed to convert trail thumbnail:', error);
    }
  }
  
  // Convert step thumbnails if they're blob URLs
  if (convertedTrail.steps && Array.isArray(convertedTrail.steps)) {
    for (let i = 0; i < convertedTrail.steps.length; i++) {
      const step = convertedTrail.steps[i];
      if (step.thumbnailUrl && isBlobUrl(step.thumbnailUrl)) {
        try {
          convertedTrail.steps[i] = {
            ...step,
            thumbnailUrl: await convertBlobUrlToBase64(step.thumbnailUrl)
          };
        } catch (error) {
          console.error('Failed to convert step thumbnail:', error);
        }
      }
    }
  }
  
  return convertedTrail;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing user session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First try to get the current session from Supabase
        const response = await fetch('/api/auth');
        const data = await response.json();
        
        if (data.user) {
          // Transform the user data to match the expected interface
          const userData: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || 'User',
            avatar: undefined,
            createdAt: new Date().toISOString(),
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('currentUser', JSON.stringify(userData));
        } else {
          // Fallback to localStorage if no active Supabase session
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              setUser(userData);
              setIsAuthenticated(true);
            } catch (error) {
              console.error('Error parsing saved user:', error);
              localStorage.removeItem('currentUser');
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Fallback to localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('currentUser');
          }
        }
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean | { status: 'unconfirmed_user', name?: string }> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Login failed');
        return false;
      }

      if (data.status === 'unconfirmed_user') {
        toast.info('Confirmation email resent. Please check your inbox.');
        return { status: 'unconfirmed_user', name: data.name };
      }

      // Transform the user data to match the expected interface
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || 'User',
        avatar: undefined,
        createdAt: new Date().toISOString(),
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean | 'unconfirmed_user'> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Signup failed');
        return false;
      }

      if (data.status === 'unconfirmed_user') {
        toast.info('Confirmation email resent. Please check your inbox.');
        return 'unconfirmed_user';
      }

      // Don't log the user in immediately after signup - they need to confirm their email
      // Just return success so the frontend can show the email confirmation modal
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
      return false;
    }
  };

  const logout = async (redirectCallback?: () => void) => {
    try {
      // Clear Supabase session
      await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout',
        }),
      });
    } catch (error) {
      console.error('Error logging out from Supabase:', error);
    }
    
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('currentUser');
    toast.success('Logged out successfully');
    if (redirectCallback) {
      redirectCallback();
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<boolean> => {
    try {
      // This would need to be implemented in the API
      toast.error('Password reset not implemented yet');
      return false;
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Password reset failed. Please try again.');
      return false;
    }
  };

  const getUserTrails = async (): Promise<{ drafts: Trail[]; published: Trail[] }> => {
    if (!user) return { drafts: [], published: [] };

    try {
      // First try to fetch from database
      console.log('🔍 Fetching trails from database...');
      const response = await fetch('/api/trails');
      if (response.ok) {
        const allTrails = await response.json();
        console.log('📊 Database fetch result:', {
          totalTrails: allTrails.length,
          userId: user.id,
          allTrailsPreview: allTrails.map((t: any) => ({ 
            id: t.id, 
            title: t.title, 
            creatorId: t.creatorId,
            status: t.status,
            hasSteps: !!t.steps,
            stepsCount: t.steps?.length || 0,
            stepsPreview: t.steps?.map((s: any) => ({ id: s.id, title: s.title, type: s.type })) || []
          }))
        });
        
        // Filter trails by user
        const userTrails = allTrails.filter((trail: any) => 
          trail.creatorId === user.id || trail.creator_id === user.id
        );
        
        console.log('👤 Filtered user trails:', {
          userTrailsCount: userTrails.length,
          userTrails: userTrails.map((t: any) => ({ 
            id: t.id, 
            title: t.title, 
            status: t.status 
          }))
        });
        
        // Separate drafts and published by status field
        const drafts = userTrails.filter((trail: any) => 
          trail.status === 'draft' || !trail.status
        );
        const published = userTrails.filter((trail: any) => 
          trail.status === 'published'
        );
        
        console.log('📂 Trail categorization:', {
          drafts: drafts.length,
          published: published.length
        });
        
        // If database has trails for this user, return them
        if (userTrails.length > 0) {
          return { drafts, published };
        }
        
        console.log('📱 Database empty for user, falling back to localStorage...');
      } else {
        console.log('❌ Database fetch failed:', response.status);
      }
      
      // Fallback to localStorage if API fails or database is empty
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
      const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
      
      console.log('📱 localStorage fallback result:', {
        draftsCount: drafts.length,
        publishedCount: published.length,
        draftTitles: drafts.map((t: any) => t.title),
        publishedTitles: published.map((t: any) => t.title)
      });
      
      return { drafts, published };
    } catch (error) {
      console.error('Error getting user trails:', error);
      
      // Final fallback to localStorage
      try {
        const draftKey = `user_${user.id}_drafts`;
        const publishedKey = `user_${user.id}_published`;
        
        const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
        const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
        
        return { drafts, published };
      } catch {
        return { drafts: [], published: [] };
      }
    }
  };

  const saveUserTrail = async (trail: Trail, type: 'draft' | 'published'): Promise<void> => {
    if (!user) return;
    
    console.log('🔄 AuthContext.saveUserTrail called with:', trail.id, 'type:', type);

    try {
      // Check if this trail is being changed from published to draft
      const existingPublishedKey = `user_${user.id}_published`;
      const existingPublished = JSON.parse(localStorage.getItem(existingPublishedKey) || '[]');
      const wasPublished = existingPublished.some((t: any) => t.id === trail.id);
      
      console.log(`🔍 Trail ${trail.id} status check:`, {
        wasPublished,
        type,
        existingPublishedCount: existingPublished.length,
        existingPublishedIds: existingPublished.map((t: any) => t.id)
      });
      
      if (wasPublished && type === 'draft') {
        console.log(`🚨 Trail ${trail.id} is being changed from published to draft - creating new trail instead`);
        // Generate a new trail ID for the draft version
        const newTrailId = `trail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        trail.id = newTrailId;
        console.log(`🆕 New trail ID generated: ${newTrailId}`);
        
        // Don't remove from saved trails - let existing users keep their progress
        toast.info('New draft version created. Existing users can continue with the original version.');
      }

      // Convert blob URLs before saving
      const convertedTrail = await convertBlobUrlsInTrail(trail);
      
      // Save to API with proper user ID and required fields
      const trailWithUserId = {
        ...convertedTrail,
        creator_id: user.id,
        creatorId: user.id,
        updatedAt: new Date().toISOString(),
        createdAt: convertedTrail.createdAt || new Date().toISOString()
      };
      
      const response = await fetch('/api/trails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trail: trailWithUserId,
          type,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API trail save failed:', response.status, errorText);
        console.error('❌ Trail data being sent:', JSON.stringify(trailWithUserId, null, 2));
        throw new Error(`Trail save failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Trail saved to database successfully:', result);

      // Also save to localStorage as backup after successful database save
      const localStorageDraftKey = `user_${user.id}_drafts`;
      const localStoragePublishedKey = `user_${user.id}_published`;
      
      if (type === 'draft') {
        const drafts = JSON.parse(localStorage.getItem(localStorageDraftKey) || '[]');
        const existingIndex = drafts.findIndex((t: any) => t.id === trail.id);
        if (existingIndex >= 0) {
          drafts[existingIndex] = convertedTrail;
        } else {
          drafts.push(convertedTrail);
        }
        localStorage.setItem(localStorageDraftKey, JSON.stringify(drafts));
      } else {
        const published = JSON.parse(localStorage.getItem(localStoragePublishedKey) || '[]');
        const existingIndex = published.findIndex((t: any) => t.id === trail.id);
        if (existingIndex >= 0) {
          published[existingIndex] = convertedTrail;
        } else {
          published.push(convertedTrail);
        }
        localStorage.setItem(localStoragePublishedKey, JSON.stringify(published));
      }

              toast.success(`Trail ${type === 'draft' ? 'saved' : 'published'} to database successfully!`);
    } catch (error) {
      console.error('❌ Database save failed, falling back to localStorage:', error);
      
      // Fallback: Save to localStorage only when database fails
      const fallbackDraftKey = `user_${user.id}_drafts`;
      const fallbackPublishedKey = `user_${user.id}_published`;
      
      try {
        if (type === 'draft') {
          const drafts = JSON.parse(localStorage.getItem(fallbackDraftKey) || '[]');
          const existingIndex = drafts.findIndex((t: any) => t.id === trail.id);
          if (existingIndex >= 0) {
            drafts[existingIndex] = trail;
          } else {
            drafts.push(trail);
          }
          localStorage.setItem(fallbackDraftKey, JSON.stringify(drafts));
        } else {
          const published = JSON.parse(localStorage.getItem(fallbackPublishedKey) || '[]');
          const existingIndex = published.findIndex((t: any) => t.id === trail.id);
          if (existingIndex >= 0) {
            published[existingIndex] = trail;
          } else {
            published.push(trail);
          }
          localStorage.setItem(fallbackPublishedKey, JSON.stringify(published));
        }
        
        toast.warning(`Trail saved locally only (database connection failed). Data may be lost on server restart.`);
      } catch (localError) {
        console.error('❌ Even localStorage save failed:', localError);
        toast.error('Failed to save trail anywhere. Please try again.');
      }
    }
  };

  const deleteUserTrail = async (trailId: string, type: 'draft' | 'published'): Promise<void> => {
    if (!user) return;

    console.log(`🗑️ Starting deletion of trail ${trailId} from ${type} collection`);

    try {
      // Only delete from localStorage, not from database
      // This allows us to remove drafts without deleting published trails
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      if (type === 'draft') {
        const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
        console.log(`📋 Found ${drafts.length} drafts before deletion`);
        const filteredDrafts = drafts.filter((t: any) => t.id !== trailId);
        console.log(`📋 Found ${filteredDrafts.length} drafts after filtering out ${trailId}`);
        localStorage.setItem(draftKey, JSON.stringify(filteredDrafts));
        console.log(`✅ Updated localStorage with filtered drafts`);
      } else {
        const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
        const filteredPublished = published.filter((t: any) => t.id !== trailId);
        localStorage.setItem(publishedKey, JSON.stringify(filteredPublished));
        
        // Only delete from database if it's a published trail being permanently deleted
        await fetch(`/api/trails?trailId=${trailId}`, {
          method: 'DELETE',
        });
      }

      console.log(`🗑️ Trail ${trailId} successfully removed from ${type} collection`);
    } catch (error) {
      console.error('Error deleting trail:', error);
      toast.error('Failed to delete trail. Please try again.');
    }
  };

  const permanentlyDeleteTrail = async (trailId: string): Promise<void> => {
    if (!user) return;

    try {
      // Delete from database
      await fetch(`/api/trails?trailId=${trailId}`, {
        method: 'DELETE',
      });

      // Remove from both localStorage collections
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
      const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
      
      const filteredDrafts = drafts.filter((t: any) => t.id !== trailId);
      const filteredPublished = published.filter((t: any) => t.id !== trailId);
      
      localStorage.setItem(draftKey, JSON.stringify(filteredDrafts));
      localStorage.setItem(publishedKey, JSON.stringify(filteredPublished));

      console.log(`🗑️ Trail ${trailId} permanently deleted from database and localStorage`);
      toast.success('Trail permanently deleted!');
    } catch (error) {
      console.error('Error permanently deleting trail:', error);
      toast.error('Failed to delete trail. Please try again.');
    }
  };

  const removeTrailFromAllSavedTrails = (trailId: string): void => {
    console.log(`🚨 Removing trail ${trailId} from all users' saved trails`);
    
    // Get all localStorage keys that contain saved trails
    const allKeys = Object.keys(localStorage);
    const savedTrailKeys = allKeys.filter(key => key.includes('_saved'));
    
    let removedCount = 0;
    
    savedTrailKeys.forEach(key => {
      try {
        const savedTrails = JSON.parse(localStorage.getItem(key) || '[]');
        const originalLength = savedTrails.length;
        const filteredTrails = savedTrails.filter((trail: any) => trail.id !== trailId);
        
        if (filteredTrails.length < originalLength) {
          localStorage.setItem(key, JSON.stringify(filteredTrails));
          removedCount++;
          console.log(`✅ Removed trail ${trailId} from ${key}`);
        }
      } catch (error) {
        console.error(`❌ Error removing trail from ${key}:`, error);
      }
    });
    
    console.log(`🚨 Removed trail ${trailId} from ${removedCount} users' saved trails`);
    
    if (removedCount > 0) {
      toast.info(`Trail removed from ${removedCount} users' saved trails`);
    }
  };

  const removeTrailFromCurrentUserSavedTrails = (trailId: string): void => {
    if (!user) return;
    
    console.log(`🧹 Removing trail ${trailId} from current user's saved trails`);
    
    const savedKey = `user_${user.id}_saved`;
    try {
      const savedTrails = JSON.parse(localStorage.getItem(savedKey) || '[]');
      const originalLength = savedTrails.length;
      const filteredTrails = savedTrails.filter((trail: any) => trail.id !== trailId);
      
      if (filteredTrails.length < originalLength) {
        localStorage.setItem(savedKey, JSON.stringify(filteredTrails));
        console.log(`✅ Removed trail ${trailId} from current user's saved trails`);
        toast.success(`Trail removed from your saved trails`);
      } else {
        console.log(`ℹ️ Trail ${trailId} not found in current user's saved trails`);
      }
    } catch (error) {
      console.error(`❌ Error removing trail from current user's saved trails:`, error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    signup,
    logout,
    resetPassword,
    getUserTrails,
    saveUserTrail,
    deleteUserTrail,
    permanentlyDeleteTrail,
    removeTrailFromAllSavedTrails,
    removeTrailFromCurrentUserSavedTrails,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 