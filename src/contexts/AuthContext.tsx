/**
 * Auth Context
 * Provides authentication state and methods throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { authEventEmitter } from "../services/apiClient";
import { clearImageCache } from "../utils/imageLoader";
import { clearProfileImageCache } from "../utils/profileImageUtils";
import { clearProfileImageCacheForUser } from "../hooks/useProfileImageCache";
import { messageCacheService } from "../services/messageCacheService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userProfileImage: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (
    username: string,
    password: string,
    email: string,
    uniqueId: string
  ) => Promise<any>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  forgotUsername: (email: string) => Promise<void>;
  forgotPassword: (username: string, email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const token = authService.getToken();
    const storedUserId = authService.getUserId();
    const storedProfileImage = authService.getUserProfileImage();
    setIsAuthenticated(!!token);
    setUserId(storedUserId);
    setUserProfileImage(storedProfileImage);
    setIsLoading(false);

    // Subscribe to auth expiration events (401/403 responses)
    const unsubscribe = authEventEmitter.subscribe(async () => {
      console.log("Authentication token expired, logging out...");
      
      // Get current user ID from localStorage (don't use state variable due to closure)
      const currentUserId = localStorage.getItem("userId");
      
      // Clear all user-specific caches
      if (currentUserId) {
        await messageCacheService.clearUserCache(currentUserId);
        clearImageCache(currentUserId);
        clearProfileImageCache(currentUserId);
        clearProfileImageCacheForUser(currentUserId);
      } else {
        // Fallback: clear all caches if no user ID
        clearImageCache();
        clearProfileImageCache();
      }
      
      // Update auth state
      setIsAuthenticated(false);
      setUserId(null);
      setUserProfileImage(null);
      setError("Your session has expired. Please login again.");
    });

    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    // Get previous user ID to detect user changes
    const previousUserId = localStorage.getItem("userId");
    
    try {
      const response = (await authService.login({ username, password })) as any;
      const newUserId = response.userId || response._id;
      
      // If user changed, clear previous user's cache
      if (previousUserId && previousUserId !== newUserId) {
        console.log(`User changed from ${previousUserId} to ${newUserId}, clearing caches`);
        await messageCacheService.clearUserCache(previousUserId);
        clearImageCache(previousUserId);
        clearProfileImageCache(previousUserId);
        clearProfileImageCacheForUser(previousUserId);
      }
      
      setIsAuthenticated(true);
      setUserId(newUserId || null);
      setUserProfileImage(response.profileImage || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    username: string,
    password: string,
    email: string,
    uniqueId: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    // Get previous user ID to detect user changes
    const previousUserId = localStorage.getItem("userId");
    
    try {
      const response = (await authService.signup({
        username,
        email,
        password,
        uniqueId,
      })) as any;
      const newUserId = response.userId || response._id;
      
      // If user changed, clear previous user's cache
      if (previousUserId && previousUserId !== newUserId) {
        console.log(`User changed from ${previousUserId} to ${newUserId}, clearing caches`);
        await messageCacheService.clearUserCache(previousUserId);
        clearImageCache(previousUserId);
        clearProfileImageCache(previousUserId);
        clearProfileImageCacheForUser(previousUserId);
      }
      
      setIsAuthenticated(true);
      setUserId(newUserId || null);
      setUserProfileImage(response.profileImage || null);
      return response; // Return the response so SignupPage can access success message
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    // Get current user ID before logout
    const currentUserId = userId || localStorage.getItem("userId");
    
    try {
      await authService.logout();
      
      // Clear all user-specific caches
      if (currentUserId) {
        await messageCacheService.clearUserCache(currentUserId);
        clearImageCache(currentUserId);
        clearProfileImageCache(currentUserId);
        clearProfileImageCacheForUser(currentUserId);
      } else {
        // Fallback: clear all caches if no user ID
        clearImageCache();
        clearProfileImageCache();
      }
      
      setIsAuthenticated(false);
      setUserId(null);
      setUserProfileImage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotUsername = async (email: string) => {
    setError(null);
    try {
      await authService.forgotUsername({ email });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      throw err;
    }
  };

  const forgotPassword = async (username: string, email: string) => {
    setError(null);
    try {
      await authService.forgotPassword({ username, email });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      throw err;
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    // Get current user ID before deletion
    const currentUserId = userId || localStorage.getItem("userId");
    
    try {
      await authService.deleteAccount();
      
      // Clear all user-specific caches (deleteAccount already calls logout)
      if (currentUserId) {
        await messageCacheService.clearUserCache(currentUserId);
        clearImageCache(currentUserId);
        clearProfileImageCache(currentUserId);
        clearProfileImageCacheForUser(currentUserId);
      } else {
        // Fallback: clear all caches if no user ID
        clearImageCache();
        clearProfileImageCache();
      }
      
      setIsAuthenticated(false);
      setUserId(null);
      setUserProfileImage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Account deletion failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        userProfileImage,
        login,
        signup,
        logout,
        deleteAccount,
        forgotUsername,
        forgotPassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
