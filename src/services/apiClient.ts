/**
 * Shared API Client
 * Centralized axios instance used by all services
 * Implements singleton pattern to ensure only one instance exists
 */

import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config";

class ApiClient {
  private static instance: ApiClient;
  private api: AxiosInstance;

  private constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
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
