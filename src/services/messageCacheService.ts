/**
 * Message Cache Service
 * Manages IndexedDB caching for chat messages
 * Simple delta sync: only new messages are cached and returned
 */

interface CachedMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  image?: string;
  imageFiles?: string[];
  createdAt: string;
  updatedAt?: string;
  readAt?: string;
  cachedAt?: number;
  conversationId?: string;
}

const DB_NAME_PREFIX = "BTC2ChatCache";
// v3: messages are keyed by conversationId (was friendId before the group
// chat update). The version bump recreates the store, purging stale
// friend-keyed entries.
const DB_VERSION = 3;
const MESSAGES_STORE = "messages";
const METADATA_STORE = "metadata";

class MessageCacheService {
  private db: IDBDatabase | null = null;
  private currentUserId: string | null = null;

  /**
   * Get user-specific database name
   */
  private getUserDBName(userId: string): string {
    return `${DB_NAME_PREFIX}_${userId}`;
  }

  /**
   * Set current user and close existing DB if user changed
   */
  setCurrentUser(userId: string | null): void {
    if (this.currentUserId !== userId) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.currentUserId = userId;
    }
  }

  /**
   * Clear cache for a specific user (when they log out)
   */
  async clearUserCache(userId: string): Promise<void> {
    const dbName = this.getUserDBName(userId);

    // Close current connection if it's for this user
    if (this.currentUserId === userId && this.db) {
      this.db.close();
      this.db = null;
      this.currentUserId = null;
    }

    // Delete the user's database
    return new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);

      deleteRequest.onsuccess = () => {
        console.log(`✓ Cleared all cache for user ${userId}`);
        resolve();
      };

      deleteRequest.onerror = () => {
        console.error(
          `Failed to clear cache for user ${userId}:`,
          deleteRequest.error,
        );
        reject(deleteRequest.error);
      };
    });
  }

  async initializeDB(userId?: string): Promise<void> {
    if (!userId) {
      const storedUserId = localStorage.getItem("userId");
      if (!storedUserId) {
        throw new Error("No user ID available for cache initialization");
      }
      userId = storedUserId;
    }

    this.setCurrentUser(userId);
    const dbName = this.getUserDBName(userId);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✓ Message cache initialized");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (db.objectStoreNames.contains(MESSAGES_STORE)) {
          db.deleteObjectStore(MESSAGES_STORE);
        }
        const messagesStore = db.createObjectStore(MESSAGES_STORE, {
          keyPath: "_id",
        });
        messagesStore.createIndex("conversationId", "conversationId", { unique: false });
        messagesStore.createIndex("createdAt", "createdAt", { unique: false });
        console.log("✓ Created messages object store");

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: "key" });
          console.log("✓ Created metadata object store");
        }
      };
    });
  }

  private async ensureDB(userId?: string): Promise<IDBDatabase> {
    if (!userId) {
      const storedUserId = localStorage.getItem("userId");
      if (!storedUserId) {
        throw new Error("No user ID available for database operations");
      }
      userId = storedUserId;
    }

    if (!this.db || this.currentUserId !== userId) {
      await this.initializeDB(userId);
    }
    return this.db!;
  }

  async cacheMessages(
    conversationId: string,
    messages: CachedMessage[],
  ): Promise<void> {
    if (messages.length === 0) return;

    const db = await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [MESSAGES_STORE, METADATA_STORE],
        "readwrite",
      );
      const messagesStore = transaction.objectStore(MESSAGES_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      // Fire all puts in one transaction without awaiting each individually.
      // Using put (upsert) eliminates the per-message existence check.
      for (const message of messages) {
        messagesStore.put({
          ...message,
          conversationId,
          cachedAt: message.cachedAt ?? Date.now(),
        });
      }

      metadataStore.put({ key: `lastSync_${conversationId}`, value: Date.now() });

      transaction.oncomplete = () => {
        console.log(
          `✓ Cached ${messages.length} messages for conversation ${conversationId}`,
        );
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async getCachedMessages(conversationId: string): Promise<CachedMessage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], "readonly");
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const index = messagesStore.index("conversationId");

    try {
      const messages = await new Promise<CachedMessage[]>((resolve) => {
        const request = index.getAll(conversationId);
        request.onsuccess = () => {
          const results = (request.result || []) as CachedMessage[];
          results.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          resolve(results);
        };
        request.onerror = () => resolve([]);
      });

      return messages;
    } catch (error) {
      console.error("Error retrieving cached messages:", error);
      return [];
    }
  }

  async getDeltaMessages(
    conversationId: string,
    apiMessages: CachedMessage[],
  ): Promise<CachedMessage[]> {
    const cachedMessages = await this.getCachedMessages(conversationId);
    const cachedIds = new Set(cachedMessages.map((m) => m._id));

    const newMessages = apiMessages.filter((msg) => !cachedIds.has(msg._id));

    console.log(
      `→ Found ${newMessages.length} new messages for conversation ${conversationId}`,
    );
    return newMessages;
  }

  async getMergedMessages(
    conversationId: string,
    apiMessages: CachedMessage[],
  ): Promise<CachedMessage[]> {
    const newMessages = await this.getDeltaMessages(conversationId, apiMessages);

    if (newMessages.length > 0) {
      await this.cacheMessages(conversationId, newMessages);
    }

    return this.getCachedMessages(conversationId);
  }

  async clearConversationCache(conversationId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], "readwrite");
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const index = messagesStore.index("conversationId");

    try {
      const keysToDelete = await new Promise<string[]>((resolve) => {
        const request = index.getAllKeys(conversationId);
        request.onsuccess = () => resolve((request.result || []) as string[]);
        request.onerror = () => resolve([]);
      });

      for (const key of keysToDelete) {
        await new Promise<void>((resolve) => {
          const request = messagesStore.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        });
      }

      console.log(`✓ Cleared cache for conversation ${conversationId}`);
    } catch (error) {
      console.error("Error clearing conversation cache:", error);
    }
  }

  async clearAllCache(): Promise<void> {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.warn("No user ID available for cache clearing");
      return;
    }

    await this.clearUserCache(userId);
  }

  async getCacheStats(): Promise<{
    totalMessages: number;
    conversationCount: number;
  }> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([MESSAGES_STORE], "readonly");

      const messagesCount = await new Promise<number>((resolve) => {
        const request = transaction.objectStore(MESSAGES_STORE).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      return {
        totalMessages: messagesCount,
        conversationCount: 0,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { totalMessages: 0, conversationCount: 0 };
    }
  }
}

export const messageCacheService = new MessageCacheService();
export default messageCacheService;
