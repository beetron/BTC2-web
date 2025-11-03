/**
 * useMessageCache Hook
 * Manages message caching initialization and online/offline status
 */

import { useEffect, useCallback, useRef } from "react";
import { messageCacheService } from "../services/messageCacheService";

interface UseMessageCacheOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export const useMessageCache = (options?: UseMessageCacheOptions) => {
  const initializationRef = useRef(false);
  const isOnlineRef = useRef(navigator.onLine);

  // Initialize cache on first mount
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initCache = async () => {
      try {
        await messageCacheService.initializeDB();
        console.log("Message cache initialized");

        // Log cache stats
        const stats = await messageCacheService.getCacheStats();
        console.log("Cache stats:", stats);
      } catch (error) {
        console.error("Failed to initialize message cache:", error);
      }
    };

    initCache();
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Application is back online");
      isOnlineRef.current = true;
      options?.onOnline?.();
    };

    const handleOffline = () => {
      console.log("Application is now offline");
      isOnlineRef.current = false;
      options?.onOffline?.();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [options]);

  const isOnline = useCallback(() => {
    return isOnlineRef.current && navigator.onLine;
  }, []);

  const getCacheStats = useCallback(async () => {
    return messageCacheService.getCacheStats();
  }, []);

  const clearCache = useCallback(async (friendId?: string) => {
    if (friendId) {
      await messageCacheService.clearConversationCache(friendId);
      console.log(`Cleared cache for friend: ${friendId}`);
    } else {
      await messageCacheService.clearAllCache();
      console.log("Cleared all cache");
    }
  }, []);

  return {
    isOnline,
    getCacheStats,
    clearCache,
  };
};

export default useMessageCache;
