/**
 * Socket Service
 * Manages socket.io connection to the backend API
 * Handles real-time communication and event listeners
 */

import { Socket, io } from "socket.io-client";
import { CONFIG } from "../config";
import { authService } from "./authService";
import { authEventEmitter, attemptTokenRefresh } from "./apiClient";

interface EventListener {
  event: string;
  callback: (...args: any[]) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: EventListener[] = [];
  private connectionChangeCallbacks: ((connected: boolean) => void)[] = [];

  /**
   * Initialize socket connection
   * Called when user is authenticated
   */
  initialize(userId: string): Socket {
    if (this.socket?.connected) {
      console.log("Socket already connected, returning existing socket");
      return this.socket;
    }

    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log(
        "Creating socket connection with userId:",
        userId,
        "token:",
        token.substring(0, 20) + "..."
      );

      // Extract base URL (scheme + domain) from CONFIG.socketUrl
      const socketUrlObj = new URL(CONFIG.socketUrl);
      const socketBaseUrl = `${socketUrlObj.protocol}//${socketUrlObj.host}`;

      // Identity comes solely from the JWT in the auth payload -- the legacy
      // userId query param is no longer sent, matching the API's upcoming
      // SOCKET_REQUIRE_AUTH=true enforcement.
      this.socket = io(socketBaseUrl, {
        path: CONFIG.isDevelopment ? "/socket.io" : "/btc-api/socket.io",
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
      });

      console.log("Socket initialized with userId:", userId);

      return this.socket;
    } catch (error) {
      console.error("Failed to initialize socket:", error);
      throw error;
    }
  }

  /**
   * Setup all socket event listeners
   * Should be called after initialization
   */
  setupEvents(): void {
    if (!this.socket) {
      console.warn("Socket not initialized");
      return;
    }

    // Connection events
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.notifyConnectionChange(true);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.notifyConnectionChange(false);
    });

    this.socket.on("connect_error", async (error) => {
      console.error("Socket connection error:", error);
      // The server rejects the handshake with "Unauthorized" when
      // SOCKET_REQUIRE_AUTH is enabled and the access token is
      // missing/expired. Try a silent refresh before giving up -- on
      // success, just update the auth payload; socket.io's own
      // reconnection loop will pick up the new token on its next
      // automatic attempt. Only log out if refresh also fails.
      if (error?.message === "Unauthorized") {
        console.warn("Socket handshake unauthorized - attempting token refresh");
        const refreshed = await attemptTokenRefresh();
        if (refreshed && this.socket) {
          this.socket.auth = { token: authService.getToken() };
          console.log("Token refreshed - socket will retry with new token");
        } else {
          console.warn("Token refresh failed - logging out");
          this.disconnect();
          authEventEmitter.emit();
        }
      }
    });

    this.socket.on("reconnect_attempt", () => {
      console.log("Socket reconnecting...");
    });

    // Custom events
    this.attachListeners();
  }

  /**
   * Attach all registered listeners to socket
   */
  private attachListeners(): void {
    if (!this.socket) return;

    this.listeners.forEach(({ event, callback }) => {
      this.socket?.on(event, callback);
    });
  }

  /**
   * Add event listener and return unsubscribe function
   */
  addListener(event: string, callback: (...args: any[]) => void): () => void {
    // Store in listeners array
    this.listeners.push({ event, callback });

    // If socket already exists, attach immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        (l) => !(l.event === event && l.callback === callback)
      );
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket) {
      console.warn("Socket not connected, cannot emit:", event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Notify all connection change subscribers
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionChangeCallbacks.forEach((callback) => {
      callback(connected);
    });
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeCallbacks.push(callback);

    return () => {
      this.connectionChangeCallbacks = this.connectionChangeCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners = [];
      this.connectionChangeCallbacks = [];
      console.log("Socket disconnected and cleared");
    }
  }

  /**
   * Reconnect socket
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
export default socketService;
