/**
 * Shared API Client
 * Centralized axios instance used by all services
 * Implements singleton pattern to ensure only one instance exists
 * Uses lazy initialization to allow config.json to load first
 */

import axios, { AxiosInstance } from "axios";
import { CONFIG } from "../config";

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
