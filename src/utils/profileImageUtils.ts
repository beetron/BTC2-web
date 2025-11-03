/**
 * Profile Image Utilities
 * Handles profile image URL generation and related utilities
 */

import { apiClient } from "../services/apiClient";

/**
 * Cache for profile image data URLs to avoid repeated API calls
 */
const imageCache = new Map<string, string>();

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
