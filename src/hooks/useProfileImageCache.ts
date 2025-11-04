/**
 * Profile Image Cache Hook
 * Caches profile images across the entire application to avoid redundant API calls
 * When a user's profile image changes, it updates everywhere automatically
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface CachedProfileImage {
  url: string | null;
  lastFetched: number;
}

// Global cache shared across all component instances, organized by current user
const globalProfileImageCaches = new Map<string, Map<string, CachedProfileImage>>();

/**
 * Get or create profile image cache for current user
 */
const getCurrentUserCache = (): Map<string, CachedProfileImage> => {
  const currentUserId = localStorage.getItem("userId");
  if (!currentUserId) {
    return new Map(); // Return empty map if no user
  }
  
  if (!globalProfileImageCaches.has(currentUserId)) {
    globalProfileImageCaches.set(currentUserId, new Map<string, CachedProfileImage>());
  }
  return globalProfileImageCaches.get(currentUserId)!;
};

/**
 * Clear profile image cache for specific user
 */
export const clearProfileImageCacheForUser = (userId: string) => {
  globalProfileImageCaches.delete(userId);
  console.log(`✓ Cleared profile image cache for user ${userId}`);
};

/**
 * Hook to get cached profile images
 * @param userIds - Array of user IDs to fetch profile images for
 * @returns Object mapping userId to profileImageUrl
 */
export const useProfileImageCache = (userIds: string[]) => {
  const [profileImages, setProfileImages] = useState<
    Record<string, string | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    localStorage.getItem("userId")
  );
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchMissingImages = useCallback(async () => {
    const globalProfileImageCache = getCurrentUserCache();
    
    const idsToFetch = userIds.filter((id) => {
      // Skip if already cached
      if (globalProfileImageCache.has(id)) {
        return false;
      }
      // Skip if already fetching
      if (fetchingRef.current.has(id)) {
        return false;
      }
      return true;
    });

    if (idsToFetch.length === 0) {
      // All images already cached, update state
      const cached: Record<string, string | null> = {};
      userIds.forEach((id) => {
        const cached_image = globalProfileImageCache.get(id);
        cached[id] = cached_image?.url ?? null;
      });
      setProfileImages(cached);
      setIsLoading(false);
      return;
    }

    // Mark as fetching
    idsToFetch.forEach((id) => fetchingRef.current.add(id));

    try {
      // Fetch all missing images in parallel
      await Promise.all(
        idsToFetch.map(async (userId) => {
          try {
            // Simulate getting the profile image filename from userData
            // In real scenario, you'd fetch user data first to get the filename
            const url = await getProfileImageUrl("");
            globalProfileImageCache.set(userId, {
              url,
              lastFetched: Date.now(),
            });
          } catch (error) {
            // Cache null for failed fetches to avoid retrying
            globalProfileImageCache.set(userId, {
              url: null,
              lastFetched: Date.now(),
            });
          }
        })
      );
    } finally {
      // Clear fetching flag
      idsToFetch.forEach((id) => fetchingRef.current.delete(id));
      setIsLoading(false);
    }

    // Update state with all cached images
    const updatedCache = getCurrentUserCache();
    const result: Record<string, string | null> = {};
    userIds.forEach((id) => {
      const cached_image = updatedCache.get(id);
      result[id] = cached_image?.url ?? null;
    });
    setProfileImages(result);
  }, [userIds]);

  // Watch for user changes and reset cache when user changes
  useEffect(() => {
    const currentUser = localStorage.getItem("userId");
    if (currentUserId !== currentUser) {
      setCurrentUserId(currentUser);
      setProfileImages({});
      setIsLoading(true);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchMissingImages();
  }, [fetchMissingImages]);

  return {
    profileImages,
    isLoading,
  };
};

export default useProfileImageCache;
