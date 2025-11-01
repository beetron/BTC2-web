/**
 * User Service
 * Handles all user-related API calls
 */

import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config";

// interface User {
//   _id: string;
//   email: string;
//   nickname: string;
//   uniqueId: string;
//   profileImage?: string;
// }

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
}

interface UserDetails {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

class UserService {
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
   * Get profile image
   */
  async getProfileImage(filename: string): Promise<Blob> {
    try {
      this.setAuthHeader();
      const response = await this.api.get(`/users/images/${filename}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string): Promise<UserDetails> {
    try {
      this.setAuthHeader();
      const response = await this.api.get<UserDetails>(`/users/${userId}`);
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
      this.setAuthHeader();
      const response = await this.api.get<Friend[]>("/users/friendlist");
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
      this.setAuthHeader();
      const response = await this.api.get<FriendRequest[]>(
        "/users/friendrequests"
      );
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/addfriend/${uniqueId}`);
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/acceptfriend/${uniqueId}`);
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/rejectfriend/${uniqueId}`);
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/removefriend/${uniqueId}`);
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
      this.setAuthHeader();
      const response = await this.api.put("/users/changepassword", {
        oldPassword,
        newPassword,
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/updatenickname/${nickname}`);
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
      this.setAuthHeader();
      const response = await this.api.put(`/users/updateuniqueid/${uniqueId}`);
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
  ): Promise<{ message: string; filename: string }> {
    try {
      this.setAuthHeader();
      const formData = new FormData();
      formData.append("profileImage", file);
      const response = await this.api.put(
        "/users/updateprofileimage/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
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
      this.setAuthHeader();
      const response = await this.api.put("/users/updateemail", {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Register FCM token
   */
  async registerFcmToken(fcmToken: string): Promise<{ message: string }> {
    try {
      this.setAuthHeader();
      const response = await this.api.put("/users/fcm/register", { fcmToken });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete FCM token
   */
  async deleteFcmToken(): Promise<{ message: string }> {
    try {
      this.setAuthHeader();
      const response = await this.api.delete("/users/fcm/token");
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

export const userService = new UserService();
export default userService;
