/**
 * Image Loader Utility
 * Loads images with authentication headers by converting to data URLs
 */

import { authService } from "../services/authService";

const imageCache = new Map<string, string>();

/**
 * Load image from URL with auth headers and return data URL
 * @param imageUrl - Full image URL
 * @returns Promise<string> - Data URL for the image
 */
export const loadImageWithAuth = async (imageUrl: string): Promise<string> => {
  // Check cache first
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl)!;
  }

  try {
    const token = authService.getToken();
    if (!token) {
      throw new Error("No auth token available");
    }

    const authHeader = `Bearer ${token}`;

    const response = await fetch(imageUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      const errorMsg = `Failed to load image: ${response.status}`;
      throw new Error(errorMsg);
    }

    const blob = await response.blob();

    // Convert blob to data URL (more persistent than blob URL)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    // Cache the data URL
    imageCache.set(imageUrl, dataUrl);

    return dataUrl;
  } catch (error) {
    console.error("Error loading image:", error);
    throw error;
  }
};

/**
 * Clear image cache (call on logout)
 */
export const clearImageCache = () => {
  imageCache.clear();
};
