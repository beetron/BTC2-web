/**
 * Socket Listener Hook
 * Reusable hook for listening to socket events and triggering callbacks
 * Handles proper cleanup and dependency management
 */

import { useEffect } from "react";
import { Socket } from "socket.io-client";

// Socket.IO payloads are untyped JSON, so each caller declares the
// parameter types its handler expects
interface UseSocketListenerOptions<TArgs extends unknown[]> {
  eventName: string;
  onEvent: (...args: TArgs) => Promise<void> | void;
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
 *   eventName: "conversation:updated",
 *   onEvent: async () => {
 *     await loadMessages();
 *   }
 * });
 */
export const useSocketListener = <TArgs extends unknown[]>(
  socket: Socket | null,
  options: UseSocketListenerOptions<TArgs>
) => {
  const { eventName, onEvent, enabled = true } = options;

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    const handleEvent = async (...args: TArgs) => {
      console.log(`Socket event received: ${eventName}`);
      try {
        await onEvent(...args);
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
