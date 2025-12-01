/**
 * Shared API Client
 * Centralized axios instance used by all services
 * Implements singleton pattern to ensure only one instance exists
 * Uses lazy initialization to allow config.json to load first
 */

import axios, { AxiosInstance } from "axios";
import { CONFIG } from "../config";

// Event emitter for authentication events
class AuthEventEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(): void {
    this.listeners.forEach((callback) => callback());
  }
}

export const authEventEmitter = new AuthEventEmitter();

class ApiClient {
  private static instance: ApiClient;
  private api: AxiosInstance;

  private constructor() {
    // Use CONFIG.apiUrl getter which reads from runtimeConfig
    // This ensures the config is loaded before axios is created
    this.api = axios.create({
      baseURL: CONFIG.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to set auth header on every request
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth expiration and critical errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;

        // Handle authentication errors (401, 403) or critical server errors (500)
        // 500 errors indicate something critical went wrong, likely auth-related
        const isAuthError = status === 401 || status === 403;
        const isCriticalError = status === 500;

        if (isAuthError || isCriticalError) {
          console.log(
            `[API Client] ${
              isCriticalError
                ? "Critical server error (500)"
                : "Authentication error"
            } detected, logging out user`
          );

          // Clear auth data
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("username");
          localStorage.removeItem("userProfileImage");
          localStorage.removeItem("nickname");
          localStorage.removeItem("uniqueId");
          localStorage.removeItem("email");

          // Emit event to notify AuthContext
          authEventEmitter.emit();
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance
   * Lazy-loads on first use to ensure config is initialized
   */
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Get axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

export const apiClient = ApiClient.getInstance();
export default apiClient;
