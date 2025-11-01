/**
 * Socket Listener Hook
 * Reusable hook for listening to socket events and triggering callbacks
 * Handles proper cleanup and dependency management
 */

import { useEffect } from "react";
import { Socket } from "socket.io-client";

interface UseSocketListenerOptions {
  eventName: string;
  onEvent: () => Promise<void> | void;
  enabled?: boolean;
}

/**
 * Hook to listen to socket events and trigger a callback
 * @param socket - Socket instance from useSocket hook
 * @param options - Configuration object with eventName, onEvent callback, and optional enabled flag
 *
 * @example
 * const { socket } = useSocket();
 * useSocketListener(socket, {
 *   eventName: "newMessageSignal",
 *   onEvent: async () => {
 *     await loadMessages();
 *   }
 * });
 */
export const useSocketListener = (
  socket: Socket | null,
  options: UseSocketListenerOptions
) => {
  const { eventName, onEvent, enabled = true } = options;

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    const handleEvent = async () => {
      console.log(`Socket event received: ${eventName}`);
      try {
        await onEvent();
      } catch (error) {
        console.error(`Error handling socket event ${eventName}:`, error);
      }
    };

    console.log(`Setting up ${eventName} listener on socket`, socket.id);
    socket.on(eventName, handleEvent);

    return () => {
      console.log(`Removing ${eventName} listener`);
      socket.off(eventName, handleEvent);
    };
  }, [socket, eventName, onEvent, enabled]);
};

export default useSocketListener;
