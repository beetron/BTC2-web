/**
 * Conversation Service
 * Handles all conversation-related API calls (direct + group chats)
 * Backed by the /conversations endpoints introduced with the group chat update
 */

import axios from "axios";
import { apiClient } from "./apiClient";
import { CONFIG } from "../config";

export interface ConversationSummary {
  conversationId: string;
  type: "direct" | "group";
  name: string | null;
  avatar: string | null;
  partnerId: string | null;
  memberCount: number;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationMember {
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  nickname: string | null;
  profileImage: string | null;
  uniqueId: string | null;
}

export interface ConversationDetail {
  conversationId: string;
  type: "direct" | "group";
  name: string | null;
  avatar: string | null;
  partnerId: string | null;
  createdBy: string;
  lastMessageAt: string;
  members: ConversationMember[];
}

export interface ConversationMessage {
  _id: string;
  senderId: string;
  receiverId?: string | null;
  conversationId?: string;
  message: string;
  imageFiles?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface MessagePage {
  messages: ConversationMessage[];
  nextCursor: string | null;
}

class ConversationService {
  private api = apiClient.getAxiosInstance();

  /**
   * List all conversations (direct + group) for the current user
   */
  async listConversations(): Promise<ConversationSummary[]> {
    try {
      const response = await this.api.get<ConversationSummary[]>("/conversations");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get full detail (including member profiles) for one conversation
   */
  async getConversation(conversationId: string): Promise<ConversationDetail> {
    try {
      const response = await this.api.get<ConversationDetail>(
        `/conversations/${conversationId}`,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find or create the direct conversation with another user
   */
  async createDirect(userId: string): Promise<ConversationDetail> {
    try {
      const response = await this.api.post<ConversationDetail>(
        "/conversations/direct",
        { userId },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a group conversation
   */
  async createGroup(
    name: string,
    memberIds: string[],
  ): Promise<{ _id: string }> {
    try {
      const response = await this.api.post<{ _id: string }>(
        "/conversations/group",
        { name, memberIds },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Cursor-paginated message history (newest page first; pass the previous
   * page's nextCursor to page further back in time)
   */
  async getMessages(
    conversationId: string,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<MessagePage> {
    try {
      const params: Record<string, string | number> = {};
      if (options.cursor) params.cursor = options.cursor;
      if (options.limit) params.limit = options.limit;

      const response = await this.api.get<MessagePage>(
        `/conversations/${conversationId}/messages`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a text message into a conversation
   */
  async sendMessage(
    conversationId: string,
    message: string,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      const response = await this.api.post<{
        success: boolean;
        messageId: string;
      }>(`/conversations/${conversationId}/messages`, { message });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload images into a conversation
   */
  async uploadImages(
    conversationId: string,
    files: File[],
  ): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No auth token available");
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("messageImages", file);
      });

      // Use fetch directly so the browser sets the multipart Content-Type
      const response = await fetch(
        `${CONFIG.apiUrl}/conversations/${conversationId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Upload failed with status ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Add members to a group
   */
  async addMembers(
    conversationId: string,
    memberIds: string[],
  ): Promise<void> {
    try {
      await this.api.put(`/conversations/${conversationId}/members`, {
        memberIds,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove a member from a group (pass your own userId to leave)
   */
  async removeMember(conversationId: string, userId: string): Promise<void> {
    try {
      await this.api.delete(
        `/conversations/${conversationId}/members/${userId}`,
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Rename a group / update its avatar (owner or admin only)
   */
  async updateGroup(
    conversationId: string,
    updates: { name?: string; avatar?: string },
  ): Promise<void> {
    try {
      await this.api.put(`/conversations/${conversationId}`, updates);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors (backend returns { error } payloads)
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      return new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message,
      );
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error("An unknown error occurred");
  }
}

export const conversationService = new ConversationService();
export default conversationService;
