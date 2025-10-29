/**
 * Auth Service
 * Handles all authentication-related API calls
 */

import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config";

interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  uniqueId: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  message: string;
  token: string;
  userId: string;
  nickname: string;
  uniqueId: string;
  email: string;
}

interface ForgotUsernameRequest {
  email: string;
}

interface ForgotPasswordRequest {
  email: string;
}

class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>("/auth/signup", data);
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userId", response.data.userId);
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
        localStorage.setItem("userId", response.data.userId);
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
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
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
      const response = await this.api.get("/auth/forgotusername", {
        params: data,
      });
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
      const response = await this.api.get("/auth/forgotpassword", {
        params: data,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get stored token
   */
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
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Set authorization header
   */
  setAuthHeader(): void {
    const token = this.getToken();
    if (token) {
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data?.message || error.message);
    }
    return new Error("An unknown error occurred");
  }

  /**
   * Get API instance for other services
   */
  getApiInstance(): AxiosInstance {
    this.setAuthHeader();
    return this.api;
  }
}

export const authService = new AuthService();
export default authService;
