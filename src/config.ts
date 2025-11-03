/**
 * Environment Configuration
 * Uses VITE_API_URL from .env file
 * In Kubernetes, .env is injected via ConfigMap
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly MODE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const API_BASE_URL = (): string => API_URL;

export const CONFIG = {
  get isDevelopment(): boolean {
    return import.meta.env.MODE === "development";
  },
  get isProduction(): boolean {
    return import.meta.env.MODE === "production";
  },
  get apiUrl(): string {
    return API_URL;
  },
  get socketUrl(): string {
    return API_URL;
  },
};

export default CONFIG;
