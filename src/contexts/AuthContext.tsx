import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: (redirectCallback?: () => void) => void;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  getUserTrails: () => Promise<{ drafts: any[]; published: any[] }>;
  saveUserTrail: (trail: any, type: 'draft' | 'published') => Promise<void>;
  deleteUserTrail: (trailId: string, type: 'draft' | 'published') => Promise<void>;
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

  const login = async (email: string, password: string): Promise<boolean> => {
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

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
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

      // Transform the user data to match the expected interface
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || name,
        avatar: undefined,
        createdAt: new Date().toISOString(),
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      toast.success('Check your email for a confirmation link!');
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

  const getUserTrails = async (): Promise<{ drafts: any[]; published: any[] }> => {
    if (!user) return { drafts: [], published: [] };

    try {
      // For now, we'll use localStorage as fallback
      // In a real app, you'd fetch from the API with user ID
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
      const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
      
      return { drafts, published };
    } catch (error) {
      console.error('Error getting user trails:', error);
      return { drafts: [], published: [] };
    }
  };

  const saveUserTrail = async (trail: any, type: 'draft' | 'published'): Promise<void> => {
    if (!user) return;

    try {
      // Convert blob URLs before saving
      const convertedTrail = await convertBlobUrlsInTrail(trail);
      
      // Save to API
      await fetch('/api/trails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trail: convertedTrail,
          type,
        }),
      });

      // Also save to localStorage as backup
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      if (type === 'draft') {
        const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
        const existingIndex = drafts.findIndex((t: any) => t.id === trail.id);
        if (existingIndex >= 0) {
          drafts[existingIndex] = convertedTrail;
        } else {
          drafts.push(convertedTrail);
        }
        localStorage.setItem(draftKey, JSON.stringify(drafts));
      } else {
        const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
        const existingIndex = published.findIndex((t: any) => t.id === trail.id);
        if (existingIndex >= 0) {
          published[existingIndex] = convertedTrail;
        } else {
          published.push(convertedTrail);
        }
        localStorage.setItem(publishedKey, JSON.stringify(published));
      }

      toast.success(`Trail ${type === 'draft' ? 'saved' : 'published'} successfully!`);
    } catch (error) {
      console.error('Error saving trail:', error);
      toast.error('Failed to save trail. Please try again.');
    }
  };

  const deleteUserTrail = async (trailId: string, type: 'draft' | 'published'): Promise<void> => {
    if (!user) return;

    try {
      // Delete from API
      await fetch(`/api/trails?trailId=${trailId}`, {
        method: 'DELETE',
      });

      // Also delete from localStorage
      const draftKey = `user_${user.id}_drafts`;
      const publishedKey = `user_${user.id}_published`;
      
      if (type === 'draft') {
        const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
        const filteredDrafts = drafts.filter((t: any) => t.id !== trailId);
        localStorage.setItem(draftKey, JSON.stringify(filteredDrafts));
      } else {
        const published = JSON.parse(localStorage.getItem(publishedKey) || '[]');
        const filteredPublished = published.filter((t: any) => t.id !== trailId);
        localStorage.setItem(publishedKey, JSON.stringify(filteredPublished));
      }

      toast.success('Trail deleted successfully!');
    } catch (error) {
      console.error('Error deleting trail:', error);
      toast.error('Failed to delete trail. Please try again.');
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 