/**
 * Conversation Service
 * Handles all conversation-related API calls (direct + group chats)
 * Backed by the /conversations endpoints introduced with the group chat update
 */

import axios from "axios";
import { apiClient, getCurrentSocketId } from "./apiClient";
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

/**
 * Preview of the message a reply quotes. The API reads it live, so it follows
 * edits and deletes of the original. unavailable means the original no
 * longer exists at all (history cleared, or removed by an admin).
 */
export interface ReplyPreview {
  _id: string;
  senderId: string | null;
  message: string | null;
  hasImages: boolean;
  /**
   * First photo of the quoted message, for a thumbnail. null when it has no
   * photos, is deleted, or its photos expired. Missing on replies cached
   * before API 2.1.0.
   */
  imageFile?: string | null;
  /** The quoted message's photos were removed by the API's image expiry job */
  imagesExpired?: boolean;
  deleted: boolean;
  unavailable: boolean;
}

export interface ConversationMessage {
  _id: string;
  senderId: string;
  receiverId?: string | null;
  conversationId?: string;
  /** null once the message is deleted for everyone */
  message: string | null;
  imageFiles?: string[];
  /**
   * Set once the API's image expiry job removed the photos. imageFiles keeps
   * the names (one placeholder each), but the files are gone.
   */
  imagesExpiredAt?: string | null;
  clientMessageId?: string | null;
  replyToId?: string | null;
  replyTo?: ReplyPreview;
  editedAt?: string | null;
  /** Set when the message was deleted for everyone (a tombstone) */
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MessagePage {
  messages: ConversationMessage[];
  nextCursor: string | null;
}

export interface MessageChangesPage {
  messages: ConversationMessage[];
  /** null when nothing changed; keep the previous position then */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendResult {
  success: boolean;
  messageId: string;
  /** The stored message, so it can be shown without refetching */
  message: ConversationMessage;
}

export interface SendOptions {
  /** Makes a retried send return the stored message instead of a duplicate */
  clientMessageId?: string;
  /** Quote reply: a live message in the same conversation */
  replyToId?: string;
}

/**
 * Lets the API skip only this tab's socket when it broadcasts our own
 * message, so the user's other tabs and devices still get the event.
 */
const socketIdHeader = (): Record<string, string> => {
  const socketId = getCurrentSocketId();
  return socketId ? { "X-Socket-Id": socketId } : {};
};

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
      // includeDeleted: messages deleted for everyone come back as
      // tombstones, shown as a "message deleted" placeholder
      const params: Record<string, string | number> = { includeDeleted: 1 };
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
   * Messages created, edited or deleted after a position, oldest change
   * first, tombstones included. Pass `since` (an ISO date) the first time
   * and the returned nextCursor after that.
   */
  async getMessageChanges(
    conversationId: string,
    position: { since?: string; cursor?: string },
  ): Promise<MessageChangesPage> {
    try {
      const params: Record<string, string> = position.cursor
        ? { cursor: position.cursor }
        : { since: position.since ?? new Date(0).toISOString() };

      const response = await this.api.get<MessageChangesPage>(
        `/conversations/${conversationId}/messages/changes`,
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
    options: SendOptions = {},
  ): Promise<SendResult> {
    try {
      const body: Record<string, string> = { message };
      if (options.clientMessageId) body.clientMessageId = options.clientMessageId;
      if (options.replyToId) body.replyToId = options.replyToId;

      const response = await this.api.post<SendResult>(
        `/conversations/${conversationId}/messages`,
        body,
        { headers: socketIdHeader() },
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Edit the text of one of your own messages
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    message: string,
  ): Promise<ConversationMessage> {
    try {
      const response = await this.api.patch<{
        success: boolean;
        message: ConversationMessage;
      }>(
        `/conversations/${conversationId}/messages/${messageId}`,
        { message },
        { headers: socketIdHeader() },
      );
      return response.data.message;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete one of your own messages for everyone. Returns the tombstone.
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<ConversationMessage> {
    try {
      const response = await this.api.delete<{
        success: boolean;
        message: ConversationMessage;
      }>(`/conversations/${conversationId}/messages/${messageId}`, {
        headers: socketIdHeader(),
      });
      return response.data.message;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload images into a conversation (one message holding every image)
   */
  async uploadImages(
    conversationId: string,
    files: File[],
    options: SendOptions = {},
  ): Promise<SendResult> {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No auth token available");
      }

      const formData = new FormData();
      // Text fields before the files, so they are parsed first
      if (options.clientMessageId) {
        formData.append("clientMessageId", options.clientMessageId);
      }
      if (options.replyToId) formData.append("replyToId", options.replyToId);
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
            ...socketIdHeader(),
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
