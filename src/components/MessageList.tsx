/**
 * Message List Component
 */

import { Box, Loader, Paper, Stack, Text, Center } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { messageService } from "../services/messageService";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  image?: string;
  createdAt: string;
  updatedAt?: string;
  readAt?: string;
}

interface MessageListProps {
  friendId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ friendId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserId = localStorage.getItem("userId") || "";

  useEffect(() => {
    loadMessages();
  }, [friendId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await messageService.getMessages(friendId);
      setMessages(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load messages";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Loader />
      </Center>
    );
  }

  return (
    <Box
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {messages.length === 0 ? (
        <Center h="400px">
          <Text c="dimmed">No messages yet. Start the conversation!</Text>
        </Center>
      ) : (
        messages.map((msg) => (
          <Paper
            key={msg._id}
            p="sm"
            radius="md"
            style={{
              alignSelf:
                msg.senderId === currentUserId ? "flex-end" : "flex-start",
              maxWidth: "70%",
              backgroundColor:
                msg.senderId === currentUserId ? "#387FDF" : "#DEE2E6",
            }}
          >
            <Stack gap={0}>
              <Text
                size="sm"
                c={msg.senderId === currentUserId ? "white" : "black"}
              >
                {msg.message}
              </Text>
              <Text
                size="xs"
                c={
                  msg.senderId === currentUserId
                    ? "rgba(255,255,255,0.7)"
                    : "gray"
                }
              >
                {new Date(msg.createdAt).toLocaleTimeString()}
              </Text>
            </Stack>
          </Paper>
        ))
      )}
    </Box>
  );
};

export default MessageList;
