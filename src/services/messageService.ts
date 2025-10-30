/**
 * Message Service
 * Handles all message-related API calls
 */

import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image?: string;
  createdAt: string;
  readAt?: string;
}

interface SendMessageRequest {
  message: string;
  senderId?: string;
}

class MessageService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Set authorization header for authenticated requests
   */
  private setAuthHeader(): void {
    const token = localStorage.getItem("token");
    if (token) {
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }

  /**
   * Send message to a user
   */
  async sendMessage(
    userId: string,
    data: SendMessageRequest
  ): Promise<{ success: boolean }> {
    try {
      this.setAuthHeader();
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
   */
  async getMessages(userId: string): Promise<Message[]> {
    try {
      this.setAuthHeader();
      const response = await this.api.get<Message[]>(`/messages/get/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete messages
   */
  async deleteMessages(userId: string): Promise<{ message: string }> {
    try {
      this.setAuthHeader();
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
