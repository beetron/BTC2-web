/**
 * Message Service
 * Handles all message-related API calls with caching support
 */

import axios from "axios";
import { apiClient } from "./apiClient";
import { messageCacheService } from "./messageCacheService";
import { API_BASE_URL } from "../config";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  image?: string;
  imageFiles?: string[];
  createdAt: string;
  updatedAt?: string;
  readAt?: string;
}

interface SendMessageRequest {
  message: string;
  senderId?: string;
}

class MessageService {
  private api = apiClient.getAxiosInstance();

  /**
   * Send message to a user
   */
  async sendMessage(
    userId: string,
    data: SendMessageRequest
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.api.post<{ success: boolean }>(
        `/messages/send/${userId}`,
        {
          message: data.message,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get conversation history with a user
   * Uses caching for improved performance on repeated loads
   */
  async getMessages(userId: string): Promise<Message[]> {
    try {
      const response = await this.api.get<Message[]>(`/messages/get/${userId}`);
      const apiMessages = response.data;

      // Cache all messages and return merged result
      const cachedMessages = await messageCacheService.getMergedMessages(
        userId,
        apiMessages
      );
      return cachedMessages;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get messages with cache-first strategy
   * Returns cached messages immediately, fetches new ones in background
   */
  async getMessagesDelta(userId: string): Promise<Message[]> {
    // Return cached messages immediately for instant UI
    const cached = await messageCacheService.getCachedMessages(userId);

    // Fetch new messages in background (fire and forget)
    this.syncNewMessagesInBackground(userId).catch((error) => {
      console.error("Background sync error:", error);
    });

    return cached;
  }

  /**
   * Sync new messages in background without blocking
   * Updates cache and triggers UI update if new messages found
   */
  private async syncNewMessagesInBackground(userId: string): Promise<void> {
    try {
      const response = await this.api.get<Message[]>(`/messages/get/${userId}`);
      const apiMessages = response.data;

      // Get only new messages
      const newMessages = await messageCacheService.getDeltaMessages(
        userId,
        apiMessages
      );

      // Cache new messages silently
      if (newMessages.length > 0) {
        await messageCacheService.cacheMessages(userId, newMessages);
        console.log(
          `✓ Synced ${newMessages.length} new messages in background`
        );
      }
    } catch (error) {
      console.error("Failed to sync messages in background:", error);
    }
  }

  /**
   * Upload message images
   */
  async uploadImages(
    recipientId: string,
    files: File[]
  ): Promise<{ success: boolean; imageFiles?: string[] }> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No auth token available");
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("messageImages", file);
      });

      // Use fetch directly to ensure proper FormData handling
      // This bypasses axios's default JSON Content-Type header
      const response = await fetch(
        `${API_BASE_URL}/messages/upload/${recipientId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type - let browser handle it with FormData
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed with status ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete messages
   */
  async deleteMessages(userId: string): Promise<{ message: string }> {
    try {
      const response = await this.api.delete(`/messages/delete/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      return new Error(error.response?.data?.message || error.message);
    }
    return new Error("An unknown error occurred");
  }
}

export const messageService = new MessageService();
export default messageService;
