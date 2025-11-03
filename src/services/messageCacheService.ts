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
  friendId?: string;
}

const DB_NAME = "BTC2ChatCache";
const DB_VERSION = 2;
const MESSAGES_STORE = "messages";
const METADATA_STORE = "metadata";

class MessageCacheService {
  private db: IDBDatabase | null = null;

  async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

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
        messagesStore.createIndex("friendId", "friendId", { unique: false });
        messagesStore.createIndex("createdAt", "createdAt", { unique: false });
        console.log("✓ Created messages object store");

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: "key" });
          console.log("✓ Created metadata object store");
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    return this.db!;
  }

  async cacheMessages(
    friendId: string,
    messages: CachedMessage[]
  ): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(
      [MESSAGES_STORE, METADATA_STORE],
      "readwrite"
    );
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    let newMessagesCount = 0;

    for (const message of messages) {
      const existingMessage = await new Promise<CachedMessage | undefined>(
        (resolve) => {
          const request = messagesStore.get(message._id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(undefined);
        }
      );

      if (!existingMessage) {
        const cachedMessage: CachedMessage = {
          ...message,
          friendId,
          cachedAt: message.cachedAt ?? Date.now(),
        };

        await new Promise<void>((resolve) => {
          const request = messagesStore.add(cachedMessage);
          request.onsuccess = () => {
            newMessagesCount++;
            resolve();
          };
          request.onerror = () => resolve();
        });
      }
    }

    await new Promise<void>((resolve) => {
      const request = metadataStore.put({
        key: `lastSync_${friendId}`,
        value: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });

    if (newMessagesCount > 0) {
      console.log(
        `✓ Cached ${newMessagesCount} new messages for friend ${friendId}`
      );
    }
  }

  async getCachedMessages(friendId: string): Promise<CachedMessage[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], "readonly");
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const index = messagesStore.index("friendId");

    try {
      const messages = await new Promise<CachedMessage[]>((resolve) => {
        const request = index.getAll(friendId);
        request.onsuccess = () => {
          const results = (request.result || []) as CachedMessage[];
          results.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
    friendId: string,
    apiMessages: CachedMessage[]
  ): Promise<CachedMessage[]> {
    const cachedMessages = await this.getCachedMessages(friendId);
    const cachedIds = new Set(cachedMessages.map((m) => m._id));

    const newMessages = apiMessages.filter((msg) => !cachedIds.has(msg._id));

    console.log(
      `→ Found ${newMessages.length} new messages for friend ${friendId}`
    );
    return newMessages;
  }

  async getMergedMessages(
    friendId: string,
    apiMessages: CachedMessage[]
  ): Promise<CachedMessage[]> {
    const newMessages = await this.getDeltaMessages(friendId, apiMessages);

    if (newMessages.length > 0) {
      await this.cacheMessages(friendId, newMessages);
    }

    return this.getCachedMessages(friendId);
  }

  async clearConversationCache(friendId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], "readwrite");
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const index = messagesStore.index("friendId");

    try {
      const keysToDelete = await new Promise<string[]>((resolve) => {
        const request = index.getAllKeys(friendId);
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

      console.log(`✓ Cleared cache for friend ${friendId}`);
    } catch (error) {
      console.error("Error clearing conversation cache:", error);
    }
  }

  async clearAllCache(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(
      [MESSAGES_STORE, METADATA_STORE],
      "readwrite"
    );

    try {
      for (const storeName of [MESSAGES_STORE, METADATA_STORE]) {
        const store = transaction.objectStore(storeName);
        await new Promise<void>((resolve) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        });
      }

      console.log("✓ Cleared all cache");
    } catch (error) {
      console.error("Error clearing all cache:", error);
    }
  }

  async getCacheStats(): Promise<{
    totalMessages: number;
    conversationCount: number;
  }> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], "readonly");

    try {
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
