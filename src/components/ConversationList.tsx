/**
 * Conversation List Component
 * Unified chat list (direct + group conversations), replaces the old
 * friend-list-as-chat-list. Data comes from GET /conversations.
 */

import {
  Box,
  Loader,
  Paper,
  Stack,
  Text,
  Avatar,
  Group,
  Badge,
} from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import {
  conversationService,
  ConversationSummary,
} from "../services/conversationService";
import { useSocketListener } from "../hooks/useSocketListener";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface ConversationWithImage extends ConversationSummary {
  avatarUrl: string | null;
}

interface ConversationListProps {
  socket: Socket | null;
}

const formatLastActivity = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);

  return `${hours}:${minutes} (${month}/${day}/'${year})`;
};

export const ConversationList: React.FC<ConversationListProps> = ({
  socket,
}) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithImage[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const data = await conversationService.listConversations();

      const withImages = await Promise.all(
        data.map(async (conversation) => ({
          ...conversation,
          avatarUrl: conversation.avatar
            ? await getProfileImageUrl(conversation.avatar)
            : null,
        })),
      );

      setConversations(withImages);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load chats";
      console.error("Error loading conversations:", message);
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh the list on any conversation activity
  useSocketListener(socket, {
    eventName: "conversation:message",
    onEvent: loadConversations,
  });
  useSocketListener(socket, {
    eventName: "conversation:updated",
    onEvent: loadConversations,
  });
  useSocketListener(socket, {
    eventName: "conversation:memberAdded",
    onEvent: loadConversations,
  });
  useSocketListener(socket, {
    eventName: "conversation:memberRemoved",
    onEvent: loadConversations,
  });
  // Legacy signal still emitted for direct messages from older clients
  useSocketListener(socket, {
    eventName: "newMessageSignal",
    onEvent: loadConversations,
  });

  if (isLoading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <Box style={{ maxHeight: "600px", overflowY: "auto" }}>
        <Stack gap="xs">
          {conversations.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center">
              No chats yet. Start a chat or create a group!
            </Text>
          ) : (
            conversations.map((conversation) => (
              <Paper
                key={conversation.conversationId}
                p="sm"
                radius="md"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  navigate(`/messages/${conversation.conversationId}`)
                }
                withBorder
              >
                <Group align="center" gap="sm" justify="space-between">
                  <Group align="center" gap="sm">
                    <Avatar
                      src={conversation.avatarUrl}
                      alt={conversation.name || "Chat"}
                      size="lg"
                      radius="xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    >
                      {conversation.type === "group" ? (
                        <IconUsers size={24} />
                      ) : undefined}
                    </Avatar>
                    <Box>
                      <Group gap={6} align="center">
                        <Text fw={500}>
                          {conversation.name ||
                            (conversation.type === "group"
                              ? "Group chat"
                              : "Chat")}
                        </Text>
                        {conversation.type === "group" && (
                          <Text size="xs" c="dimmed">
                            ({conversation.memberCount})
                          </Text>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {formatLastActivity(conversation.lastMessageAt)}
                      </Text>
                    </Box>
                  </Group>
                  {conversation.unreadCount ? (
                    <Badge color="blue" variant="filled" size="lg">
                      {conversation.unreadCount}
                    </Badge>
                  ) : null}
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default ConversationList;
