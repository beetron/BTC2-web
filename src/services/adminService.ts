/**
 * Admin Service
 * Calls the /admin endpoints. Only the account in the API's ADMIN_USER_ID
 * gets real responses; everyone else gets a 404.
 */

import axios from "axios";
import { apiClient } from "./apiClient";

export interface AdminUserSummary {
  _id: string;
  username: string;
  uniqueId: string;
  nickname: string;
  email: string;
  profileImage?: string;
  createdAt: string;
  isAdmin: boolean;
}

export interface AdminUserDetail extends AdminUserSummary {
  updatedAt: string;
  friendCount: number;
  deviceCount: number;
  messagesSent: number;
  groupCount: number;
  activeSessions: number;
}

export interface AdminUserPage {
  users: AdminUserSummary[];
  nextCursor: string | null;
}

/** Only the fields being changed; a blank password is never sent */
export interface AdminUserUpdate {
  username?: string;
  email?: string;
  uniqueId?: string;
  password?: string;
}

export interface AdminUserUpdateResult {
  user: AdminUserSummary;
  changed: string[];
}

/** username and password are required; blank optional fields use the API defaults */
export interface AdminNewUser {
  username: string;
  password: string;
  email?: string;
  uniqueId?: string;
  nickname?: string;
}

class AdminService {
  async createUser(newUser: AdminNewUser): Promise<AdminUserSummary> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.post<{ user: AdminUserSummary }>(
        "/admin/users",
        newUser,
      );
      return response.data.user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listUsers(
    params: { q?: string; cursor?: string | null; limit?: number } = {},
  ): Promise<AdminUserPage> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.get<AdminUserPage>("/admin/users", {
        params: {
          q: params.q || undefined,
          cursor: params.cursor || undefined,
          limit: params.limit,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUser(id: string): Promise<AdminUserDetail> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.get<AdminUserDetail>(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(
    id: string,
    changes: AdminUserUpdate,
  ): Promise<AdminUserUpdateResult> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.patch<AdminUserUpdateResult>(
        `/admin/users/${id}`,
        changes,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUserMessages(
    id: string,
  ): Promise<{ deletedCount: number; conversationCount: number }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.delete(`/admin/users/${id}/messages`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(id: string): Promise<{ deletedMessages: number }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.delete(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      return new Error(errorMessage);
    }
    return new Error("An unknown error occurred");
  }
}

export const adminService = new AdminService();
export default adminService;
