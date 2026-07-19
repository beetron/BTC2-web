/**
 * Auth Context
 * Provides authentication state and methods throughout the application.
 *
 * This is the single source of truth for the current user's profile
 * (username/nickname/uniqueId/email/profileImage) during a session.
 * localStorage still caches these fields so the UI can paint instantly on
 * load, but it's just a hint -- GET /users/me is always fetched on mount
 * to correct any stale values, and every update flows back through here
 * instead of components writing to localStorage directly.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { authEventEmitter } from "../services/apiClient";
import { clearImageCache } from "../utils/imageLoader";
import { clearProfileImageCache } from "../utils/profileImageUtils";
import { clearProfileImageCacheForUser } from "../hooks/useProfileImageCache";
import { messageCacheService } from "../services/messageCacheService";

interface Profile {
  username: string | null;
  nickname: string | null;
  uniqueId: string | null;
  email: string | null;
  userProfileImage: string | null;
}

interface AuthContextType extends Profile {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (
    username: string,
    password: string,
    email: string,
    uniqueId: string,
  ) => Promise<any>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  forgotUsername: (email: string) => Promise<void>;
  forgotPassword: (username: string, email: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  updateUniqueId: (uniqueId: string) => Promise<void>;
  updateEmail: (email: string, currentPassword: string) => Promise<void>;
  updateProfileImage: (file: File) => Promise<string>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const emptyProfile: Profile = {
  username: null,
  nickname: null,
  uniqueId: null,
  email: null,
  userProfileImage: null,
};

// Instant-paint hint from localStorage -- always superseded by the
// GET /users/me fetch on mount, never treated as authoritative
const readCachedProfile = (): Profile => ({
  username: localStorage.getItem("username"),
  nickname: localStorage.getItem("nickname"),
  uniqueId: localStorage.getItem("uniqueId"),
  email: localStorage.getItem("email"),
  userProfileImage: localStorage.getItem("userProfileImage"),
});

const writeCachedProfile = (profile: Partial<Profile>) => {
  if (profile.username !== undefined && profile.username !== null)
    localStorage.setItem("username", profile.username);
  if (profile.nickname !== undefined && profile.nickname !== null)
    localStorage.setItem("nickname", profile.nickname);
  if (profile.uniqueId !== undefined && profile.uniqueId !== null)
    localStorage.setItem("uniqueId", profile.uniqueId);
  if (profile.email !== undefined && profile.email !== null)
    localStorage.setItem("email", profile.email);
  if (profile.userProfileImage !== undefined && profile.userProfileImage !== null)
    localStorage.setItem("userProfileImage", profile.userProfileImage);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);

  useEffect(() => {
    const token = authService.getToken();
    const storedUserId = authService.getUserId();

    setIsAuthenticated(!!token);
    setUserId(storedUserId);
    setProfile(readCachedProfile());
    setIsLoading(false);

    // Correct any stale cached profile fields with a fresh fetch
    if (token) {
      userService
        .getCurrentUser()
        .then((current) => {
          const fresh: Profile = {
            username: current.username,
            nickname: current.nickname,
            uniqueId: current.uniqueId,
            email: current.email,
            userProfileImage: current.profileImage || null,
          };
          setProfile(fresh);
          writeCachedProfile(fresh);
        })
        .catch((err) => {
          // A failed fetch here doesn't necessarily mean the session is
          // dead (e.g. transient network error) -- apiClient's interceptor
          // already handles token-expiry logout via authEventEmitter, so
          // just log it and keep the cached hint on screen.
          console.error("Failed to refresh current user profile:", err);
        });
    }

    // Subscribe to auth expiration events (401/403 responses)
    const unsubscribe = authEventEmitter.subscribe(() => {
      console.log("Authentication token expired, logging out...");

      const currentUserId = localStorage.getItem("userId");

      setIsAuthenticated(false);
      setUserId(null);
      setProfile(emptyProfile);
      setError("Your session has expired. Please login again.");

      if (currentUserId) {
        messageCacheService.clearUserCache(currentUserId).catch(() => {});
        clearImageCache(currentUserId);
        clearProfileImageCache(currentUserId);
        clearProfileImageCacheForUser(currentUserId);
      } else {
        clearImageCache();
        clearProfileImageCache();
      }
    });

    return () => unsubscribe();
  }, []);

  const clearUserCaches = (previousUserId: string | null) => {
    if (!previousUserId) return;
    messageCacheService.clearUserCache(previousUserId).catch(() => {});
    clearImageCache(previousUserId);
    clearProfileImageCache(previousUserId);
    clearProfileImageCacheForUser(previousUserId);
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const previousUserId = localStorage.getItem("userId");

    try {
      const response = (await authService.login({ username, password })) as any;
      const newUserId = response.userId || response._id;

      if (previousUserId && previousUserId !== newUserId) {
        console.log(
          `User changed from ${previousUserId} to ${newUserId}, clearing caches`,
        );
        await messageCacheService.clearUserCache(previousUserId);
        clearImageCache(previousUserId);
        clearProfileImageCache(previousUserId);
        clearProfileImageCacheForUser(previousUserId);
      }

      setIsAuthenticated(true);
      setUserId(newUserId || null);
      setProfile({
        username: response.username || null,
        nickname: response.nickname || null,
        uniqueId: response.uniqueId || null,
        email: response.email || null,
        userProfileImage: response.profileImage || null,
      });
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
    uniqueId: string,
  ) => {
    setIsLoading(true);
    setError(null);

    const previousUserId = localStorage.getItem("userId");

    try {
      const response = (await authService.signup({
        username,
        email,
        password,
        uniqueId,
      })) as any;
      const newUserId = response.userId || response._id;

      if (previousUserId && previousUserId !== newUserId) {
        console.log(
          `User changed from ${previousUserId} to ${newUserId}, clearing caches`,
        );
        await messageCacheService.clearUserCache(previousUserId);
        clearImageCache(previousUserId);
        clearProfileImageCache(previousUserId);
        clearProfileImageCacheForUser(previousUserId);
      }

      setIsAuthenticated(true);
      setUserId(newUserId || null);
      setProfile({
        username: response.username || null,
        nickname: response.nickname || null,
        uniqueId: response.uniqueId || null,
        email: response.email || null,
        userProfileImage: response.profileImage || null,
      });
      return response; // Return the response so SignupPage can access success message
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const currentUserId = userId || localStorage.getItem("userId");

    authService.logout();

    setIsAuthenticated(false);
    setUserId(null);
    setProfile(emptyProfile);

    clearUserCaches(currentUserId);
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

    const currentUserId = userId || localStorage.getItem("userId");

    try {
      await authService.deleteAccount();

      setIsAuthenticated(false);
      setUserId(null);
      setProfile(emptyProfile);

      clearUserCaches(currentUserId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Account deletion failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateNickname = async (nickname: string) => {
    await userService.updateNickname(nickname);
    setProfile((prev) => ({ ...prev, nickname }));
    writeCachedProfile({ nickname });
  };

  const updateUniqueId = async (uniqueId: string) => {
    await userService.updateUniqueId(uniqueId);
    setProfile((prev) => ({ ...prev, uniqueId }));
    writeCachedProfile({ uniqueId });
  };

  const updateEmail = async (email: string, currentPassword: string) => {
    await userService.updateEmail(email, currentPassword);
    setProfile((prev) => ({ ...prev, email }));
    writeCachedProfile({ email });
  };

  const updateProfileImage = async (file: File): Promise<string> => {
    const response = await userService.updateProfileImage(file);
    setProfile((prev) => ({ ...prev, userProfileImage: response.profileImage }));
    writeCachedProfile({ userProfileImage: response.profileImage });
    return response.profileImage;
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        ...profile,
        login,
        signup,
        logout,
        deleteAccount,
        forgotUsername,
        forgotPassword,
        updateNickname,
        updateUniqueId,
        updateEmail,
        updateProfileImage,
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
