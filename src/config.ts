/**
 * Environment Configuration
 * Reads runtime configuration from window object (set by nginx from .env file)
 * Falls back to build-time VITE_API_URL if runtime config unavailable
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly MODE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
    };
  }
}

// Read from runtime config (injected by nginx), fall back to build-time env
const getApiUrl = (): string => {
  // Try to read from runtime config injected by nginx
  if (typeof window !== "undefined" && window.__ENV__?.VITE_API_URL) {
    return window.__ENV__.VITE_API_URL;
  }
  // Fall back to build-time environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default fallback
  return "http://localhost:3000";
};

export const CONFIG = {
  get isDevelopment(): boolean {
    return import.meta.env.MODE === "development";
  },
  get isProduction(): boolean {
    return import.meta.env.MODE === "production";
  },
  get apiUrl(): string {
    return getApiUrl();
  },
  get socketUrl(): string {
    return getApiUrl();
  },
};

export default CONFIG;
