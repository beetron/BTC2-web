/**
 * Message Service
 * Legacy /messages endpoints still in use after the conversations migration.
 * Sending/fetching messages now lives in conversationService.
 */

import axios from "axios";
import { apiClient } from "./apiClient";

class MessageService {
  private api = apiClient.getAxiosInstance();

  /**
   * Delete (clear) conversation history up to a specific message ID
   * Uses the latest loaded message ID to prevent timing issues with unread messages
   */
  async deleteMessages(messageId: string): Promise<{ message: string }> {
    try {
      const response = await this.api.delete(`/messages/delete/${messageId}`);
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
      return new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message,
      );
    }
    return new Error("An unknown error occurred");
  }
}

export const messageService = new MessageService();
export default messageService;
