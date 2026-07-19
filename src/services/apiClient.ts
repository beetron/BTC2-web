/**
 * Shared API Client
 * Centralized axios instance used by all services
 * Implements singleton pattern to ensure only one instance exists
 * Uses lazy initialization to allow config.json to load first
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
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

// Requests to these endpoints must never trigger a refresh-and-retry --
// a 401 from /auth/refresh IS the "refresh failed" signal, not something
// to recover from by refreshing again.
const AUTH_FLOW_PATHS = ["/auth/refresh", "/auth/login", "/auth/signup"];

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("userProfileImage");
  localStorage.removeItem("nickname");
  localStorage.removeItem("uniqueId");
  localStorage.removeItem("email");
};

// Dedupes concurrent refresh attempts -- if several requests 401 at once
// (multiple components fetching in parallel), they all await the same
// in-flight refresh instead of each firing their own /auth/refresh call.
// This only dedupes *within* a tab -- it's a fresh module instance per tab,
// so it can't stop two tabs from racing each other. See the recheck below.
let refreshPromise: Promise<boolean> | null = null;

// Refresh tokens rotate on every use (one-time use), so if two tabs both
// hold the same stale access token and both fire a request around the same
// moment, they race to refresh with the *same* refresh token. Only one
// wins; the loser's refresh call 401s. How long to wait before concluding
// the session is genuinely dead, giving the winning tab's response time to
// land and write the new token to localStorage first.
const REFRESH_RACE_RECHECK_DELAY_MS = 300;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempt to exchange the stored refresh token for a new access token
 * (rotating the refresh token in the process). Returns true if a valid
 * access token is available afterward -- either because this call's own
 * refresh succeeded, or because a sibling tab's concurrent refresh won the
 * race and left a fresh token behind. Used by both the axios interceptor
 * below and the socket reconnect path.
 */
export const attemptTokenRefresh = (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshTokenAtStart = localStorage.getItem("refreshToken");
    if (!refreshTokenAtStart) return false;

    try {
      // Bare axios call (not the shared `api` instance) so this request
      // never passes through the response interceptor below and can't
      // recursively trigger another refresh attempt.
      const response = await axios.post(`${CONFIG.apiUrl}/auth/refresh`, {
        refreshToken: refreshTokenAtStart,
      });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      return true;
    } catch (error) {
      // Our own refresh call failed -- but if a sibling tab concurrently
      // rotated the same refresh token and won, localStorage will hold a
      // *different*, valid token (possibly a moment after this catch runs,
      // since both tabs' responses arrive independently). Recheck before
      // giving up, so a lost race is treated as "use the winner's token"
      // instead of "log out" -- which would otherwise wipe out the winning
      // tab's freshly-issued, perfectly valid session.
      await wait(REFRESH_RACE_RECHECK_DELAY_MS);
      const currentRefreshToken = localStorage.getItem("refreshToken");
      if (currentRefreshToken && currentRefreshToken !== refreshTokenAtStart) {
        console.warn(
          "Refresh token was rotated by another tab -- using its token instead of logging out"
        );
        return true;
      }

      console.error("Token refresh failed:", error);
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

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
      async (error) => {
        const status = error.response?.status;
        const config = error.config as
          | (InternalAxiosRequestConfig & { _retry?: boolean })
          | undefined;

        const isAuthFlowRequest = AUTH_FLOW_PATHS.some((path) =>
          config?.url?.includes(path)
        );

        // A 401 on any regular request means the access token expired --
        // try a silent refresh-and-retry before giving up on the session.
        if (status === 401 && config && !config._retry && !isAuthFlowRequest) {
          config._retry = true;
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            const token = localStorage.getItem("token");
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return this.api.request(config);
          }
        }

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

          clearAuthStorage();

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
