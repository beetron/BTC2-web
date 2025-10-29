/**
 * Environment Configuration
 * Determines API URL based on NODE_ENV
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL_DEV?: string;
    readonly VITE_API_URL_PROD?: string;
    readonly MODE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_URL_DEV = import.meta.env.VITE_API_URL_DEV || "http://localhost:3000";
const API_URL_PROD = import.meta.env.VITE_API_URL_PROD;

// Determine environment
const isDevelopment =
  import.meta.env.MODE === "development" ||
  process.env.NODE_ENV === "development";

// Get the appropriate API URL
export const API_BASE_URL = isDevelopment ? API_URL_DEV : API_URL_PROD;

export const CONFIG = {
  isDevelopment,
  isProduction: !isDevelopment,
  apiUrl: API_BASE_URL,
  socketUrl: API_BASE_URL,
};

export default CONFIG;
