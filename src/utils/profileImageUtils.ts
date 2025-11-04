/**
 * Profile Image Utilities
 * Handles profile image URL generation and related utilities
 */

import { apiClient } from "../services/apiClient";

/**
 * Cache for profile image data URLs to avoid repeated API calls
 * Organized by userId to separate caches per user
 */
const profileImageCaches = new Map<string, Map<string, string>>();

/**
 * Get or create profile image cache for specific user
 */
const getUserProfileImageCache = (userId: string): Map<string, string> => {
  if (!profileImageCaches.has(userId)) {
    profileImageCaches.set(userId, new Map<string, string>());
  }
  return profileImageCaches.get(userId)!;
};

/**
 * Clear profile image cache for specific user
 */
export const clearProfileImageCache = (userId?: string) => {
  if (userId) {
    profileImageCaches.delete(userId);
    console.log(`✓ Cleared profile image cache for user ${userId}`);
  } else {
    // Clear all profile image caches if no userId provided
    profileImageCaches.clear();
    console.log("✓ Cleared all profile image caches");
  }
};

/**
 * Fetch profile image as data URL (authenticated)
 * @param profileImage - The profile image filename (e.g., "filename.jpg")
 * @returns Promise that resolves to a data URL or null
 */
export const getProfileImageUrl = async (
  profileImage?: string | null
): Promise<string | null> => {
  // Return null for undefined, null, or empty string
  if (!profileImage || profileImage.trim() === "") {
    console.log("No profile image provided");
    return null;
  }

  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("No user ID available for profile image caching");
  }

  const imageCache = getUserProfileImageCache(userId);

  // Check cache first
  if (imageCache.has(profileImage)) {
    return imageCache.get(profileImage) || null;
  }

  try {
    const api = apiClient.getAxiosInstance();
    const response = await api.get(`/users/uploads/images/${profileImage}`, {
      responseType: "blob",
    });

    // Convert blob to data URL
    const blob = response.data;
    const reader = new FileReader();

    return new Promise((resolve) => {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        imageCache.set(profileImage, dataUrl);
        console.log("Profile image loaded successfully:", profileImage);
        resolve(dataUrl);
      };
      reader.onerror = () => {
        console.error("Failed to read image blob:", profileImage);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to fetch profile image:", profileImage, error);
    return null;
  }
};
