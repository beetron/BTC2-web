/**
 * Socket Context
 * Provides real-time socket connection to the backend throughout the application
 * Automatically manages connection lifecycle based on authentication state
 */

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
  FC,
  useRef,
} from "react";
import { Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import socketService from "../services/socketService";

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextProps | undefined>(undefined);

export const SocketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isInitializing = useRef(false);
  const cleanupInProgress = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (cleanupInProgress.current) return;
    if (!socketRef.current) return;

    try {
      cleanupInProgress.current = true;
      console.log("Cleaning up socket connection");

      socketService.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    } catch (error) {
      console.error("Error during socket cleanup:", error);
    } finally {
      cleanupInProgress.current = false;
    }
  }, []);

  // Initialize socket
  const initializeSocket = useCallback(() => {
    if (!isAuthenticated || isInitializing.current) {
      return;
    }

    try {
      isInitializing.current = true;

      // Get userId from authService
      const userId = require("../services/authService").authService.getUserId();
      if (!userId) {
        console.warn("No userId available for socket initialization");
        return;
      }

      const newSocket = socketService.initialize(userId);
      socketService.setupEvents();

      setSocket(newSocket);
      setIsConnected(newSocket.connected);

      console.log("Socket initialized successfully");
    } catch (error) {
      console.error("Socket initialization error:", error);
    } finally {
      isInitializing.current = false;
    }
  }, [isAuthenticated]);

  // Reconnect socket
  const reconnect = useCallback(() => {
    if (!isAuthenticated) return;

    if (socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    if (socket) {
      socketService.reconnect();
    } else {
      initializeSocket();
    }
  }, [socket, initializeSocket, isAuthenticated]);

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      initializeSocket();
    } else {
      cleanup();
    }

    return () => {
      // Cleanup is handled separately to avoid double cleanup
    };
  }, [isAuthenticated, initializeSocket, cleanup]);

  // Listen for connection state changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = socketService.onConnectionChange(
      (connected: boolean) => {
        console.log("Socket connection changed:", connected);
        setIsConnected(connected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  const contextValue: SocketContextProps = {
    socket,
    isConnected,
    reconnect,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export default SocketContext;
