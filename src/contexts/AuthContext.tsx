/**
 * Auth Context
 * Provides authentication state and methods throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { clearImageCache } from "../utils/imageLoader";

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
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = (await authService.login({ username, password })) as any;
      const userId = response.userId || response._id;
      setIsAuthenticated(true);
      setUserId(userId || null);
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
    try {
      const response = (await authService.signup({
        username,
        email,
        password,
        uniqueId,
      })) as any;
      const userId = response.userId || response._id;
      setIsAuthenticated(true);
      setUserId(userId || null);
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
    try {
      await authService.logout();
      clearImageCache();
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
