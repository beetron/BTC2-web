/**
 * Auth Context
 * Provides authentication state and methods throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    nickname: string,
    uniqueId: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  forgotUsername: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
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

  useEffect(() => {
    // Check if user is already authenticated
    const token = authService.getToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.login({ username, password });
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    nickname: string,
    uniqueId: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.signup({ email, password, nickname, uniqueId });
      setIsAuthenticated(true);
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
      setIsAuthenticated(false);
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

  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      await authService.forgotPassword({ email });
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
