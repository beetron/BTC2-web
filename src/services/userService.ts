/**
 * User Service
 * Handles all user-related API calls
 */

import axios from "axios";
import { apiClient } from "./apiClient";

interface FriendRequest {
  _id: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

interface Friend {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
  unreadCount?: number;
  updatedAt?: string;
}

class UserService {
  /**
   * Get profile image
   */
  async getProfileImage(filename: string): Promise<Blob> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.get(`/users/images/${filename}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get friend list
   */
  async getFriendList(): Promise<Friend[]> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.get<Friend[]>("/users/friendlist");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get friend requests
   */
  async getFriendRequests(): Promise<FriendRequest[]> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.get<FriendRequest[]>("/users/friendrequests");
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(uniqueId: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/addfriend/${uniqueId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(uniqueId: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/acceptfriend/${uniqueId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(uniqueId: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/rejectfriend/${uniqueId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(uniqueId: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/removefriend/${uniqueId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put("/users/changepassword", {
        currentPassword: oldPassword,
        password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update nickname
   */
  async updateNickname(nickname: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/updatenickname/${nickname}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update unique ID
   */
  async updateUniqueId(uniqueId: string): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put(`/users/updateuniqueid/${uniqueId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update profile image
   */
  async updateProfileImage(
    file: File
  ): Promise<{ message: string; profileImage: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const formData = new FormData();
      formData.append("profileImage", file);
      const response = await api.put("/users/updateprofileimage/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update email
   */
  async updateEmail(
    email: string,
    password: string
  ): Promise<{ message: string }> {
    try {
      const api = apiClient.getAxiosInstance();
      const response = await api.put("/users/updateemail", {
        email,
        password,
      });
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
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      return new Error(errorMessage);
    }
    return new Error("An unknown error occurred");
  }
}

export const userService = new UserService();
export default userService;
