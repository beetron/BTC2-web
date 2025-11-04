/**
 * Auth Service
 * Handles all authentication-related API calls
 */

import axios from "axios";
import { apiClient } from "./apiClient";

interface SignupRequest {
  username: string;
  password: string;
  email: string;
  uniqueId: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  message: string;
  token: string;
  userId?: string;
  _id?: string;
  nickname: string;
  uniqueId: string;
  email: string;
  profileImage?: string;
}

interface ForgotUsernameRequest {
  email: string;
}

interface ForgotPasswordRequest {
  username: string;
  email: string;
}

class AuthService {
  private api = apiClient.getAxiosInstance();

  /**
   * Sign up a new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>("/auth/signup", data);
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        const userId = response.data.userId || response.data._id;
        if (userId) {
          localStorage.setItem("userId", userId);
        }
        if (response.data.profileImage) {
          localStorage.setItem("userProfileImage", response.data.profileImage);
        }
        if (response.data.nickname) {
          localStorage.setItem("nickname", response.data.nickname);
        }
        if (response.data.uniqueId) {
          localStorage.setItem("uniqueId", response.data.uniqueId);
        }
        if (response.data.email) {
          localStorage.setItem("email", response.data.email);
        }
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>("/auth/login", data);
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        const userId = response.data.userId || response.data._id;
        if (userId) {
          localStorage.setItem("userId", userId);
        }
        if (response.data.profileImage) {
          localStorage.setItem("userProfileImage", response.data.profileImage);
        }
        if (response.data.nickname) {
          localStorage.setItem("nickname", response.data.nickname);
        }
        if (response.data.uniqueId) {
          localStorage.setItem("uniqueId", response.data.uniqueId);
        }
        if (response.data.email) {
          localStorage.setItem("email", response.data.email);
        }
      }
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        await this.api.post("/auth/logout");
      }
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userProfileImage");
      localStorage.removeItem("nickname");
      localStorage.removeItem("uniqueId");
      localStorage.removeItem("email");
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userProfileImage");
      localStorage.removeItem("nickname");
      localStorage.removeItem("uniqueId");
      localStorage.removeItem("email");
      throw this.handleError(error);
    }
  }

  /**
   * Forgot username - request username reset
   */
  async forgotUsername(
    data: ForgotUsernameRequest
  ): Promise<{ message: string }> {
    try {
      const response = await this.api.post("/auth/forgotusername", data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Forgot password - request password reset
   */
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<{ message: string }> {
    try {
      const response = await this.api.post("/auth/forgotpassword", data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID not found");
    }
    try {
      await this.api.delete(`/auth/deleteaccount/${userId}`);
      // After successful deletion, logout to clear local storage
      await this.logout();
    } catch (error) {
      throw this.handleError(error);
    }
  }
  getToken(): string | null {
    return localStorage.getItem("token");
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    return localStorage.getItem("userId");
  }

  /**
   * Get stored user profile image
   */
  getUserProfileImage(): string | null {
    return localStorage.getItem("userProfileImage");
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      // First, try to get server message
      const serverMessage =
        error.response?.data?.message || error.response?.data?.error;

      if (serverMessage) {
        return new Error(serverMessage);
      }

      // Fallback to generic messages based on status code
      if (error.response?.status === 400) {
        return new Error("Bad request");
      }
      if (error.response?.status === 401) {
        return new Error("Unauthorized");
      }
      if (error.response?.status === 404) {
        return new Error("Not found");
      }
      if (error.response?.status === 500) {
        return new Error("Server error");
      }

      // Handle network/connection errors
      if (!error.response) {
        return new Error("Connection failed");
      }

      // Use axios default error message as final fallback
      return new Error(error.message);
    }
    return new Error("An unknown error occurred");
  }
}

export const authService = new AuthService();
export default authService;
