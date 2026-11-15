/**
 * Messages Page
 * Displays a direct or group conversation thread
 */

import {
  Box,
  Container,
  Stack,
  ActionIcon,
  Group,
  Text,
  Modal,
  Button,
  Center,
  Loader,
} from "@mantine/core";
import { IconArrowLeft, IconTrash, IconSettings } from "@tabler/icons-react";
import { useParams, useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { Header } from "../components/Header";
import {
  MessageList,
  MemberDisplay,
  MessageListHandle,
} from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { GroupManageModal } from "../components/GroupManageModal";
import { useSocket } from "../contexts/SocketContext";
import { useCallback, useState, useEffect, useRef } from "react";
import { messageService } from "../services/messageService";
import { messageCacheService } from "../services/messageCacheService";
import {
  conversationService,
  ConversationDetail,
  ConversationMessage,
} from "../services/conversationService";
import { useSocketListener } from "../hooks/useSocketListener";
import { getProfileImageUrl } from "../utils/profileImageUtils";

export const MessagesPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, MemberDisplay>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<MessageListHandle>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  // Reply and edit are exclusive: starting one ends the other
  const [replyTarget, setReplyTarget] = useState<ConversationMessage | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<ConversationMessage | null>(
    null,
  );
  const currentUserId = localStorage.getItem("userId") || "";

  useEffect(() => {
    setReplyTarget(null);
    setEditTarget(null);
  }, [conversationId]);

  // Load conversation detail (name, type, members) and resolve avatars
  const loadDetail = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await conversationService.getConversation(conversationId);
      setDetail(data);

      const entries = await Promise.all(
        data.members.map(async (member) => [
          member.userId,
          {
            nickname: member.nickname,
            profileImageUrl: member.profileImage
              ? await getProfileImageUrl(member.profileImage)
              : null,
          } as MemberDisplay,
        ]),
      );
      setMemberMap(Object.fromEntries(entries));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load conversation";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
      navigate("/friends");
    }
  }, [conversationId, navigate]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Group renamed / avatar changed
  useSocketListener(socket, {
    eventName: "conversation:updated",
    onEvent: async (payload?: { conversationId?: string }) => {
      if (!payload?.conversationId || payload.conversationId === conversationId) {
        await loadDetail();
      }
    },
  });

  // Membership changes: refresh members; leave the thread if we were removed
  useSocketListener(socket, {
    eventName: "conversation:memberAdded",
    onEvent: async (payload?: { conversationId?: string }) => {
      if (!payload?.conversationId || payload.conversationId === conversationId) {
        await loadDetail();
      }
    },
  });
  useSocketListener(socket, {
    eventName: "conversation:memberRemoved",
    onEvent: async (payload?: { conversationId?: string; userId?: string }) => {
      if (payload?.conversationId !== conversationId) return;
      if (payload?.userId === currentUserId) {
        notifications.show({
          title: "Removed from group",
          message: "You were removed from this group",
          color: "orange",
        });
        navigate("/friends");
      } else {
        await loadDetail();
      }
    },
  });

  // Show our own new or edited message straight from the API response
  const handleMessageStored = useCallback((message: ConversationMessage) => {
    messageListRef.current?.upsertMessage(message);
  }, []);

  const handleReply = useCallback((message: ConversationMessage) => {
    setEditTarget(null);
    setReplyTarget(message);
  }, []);

  const handleEdit = useCallback((message: ConversationMessage) => {
    setReplyTarget(null);
    setEditTarget(message);
  }, []);

  const handleMessageDeleted = useCallback((messageId: string) => {
    setReplyTarget((current) => (current?._id === messageId ? null : current));
    setEditTarget((current) => (current?._id === messageId ? null : current));
  }, []);

  const senderName = (senderId: string) =>
    senderId === currentUserId
      ? "yourself"
      : memberMap[senderId]?.nickname || "Former member";

  // Scroll message list to bottom when input resizes - only if user is at bottom
  const handleInputResize = useCallback(() => {
    if (scrollContainerRef.current && isScrolledToBottom) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [isScrolledToBottom]);

  const handleBack = () => {
    navigate("/friends");
  };

  const handleDeleteHistory = async () => {
    setIsDeleting(true);
    try {
      // Get the latest message ID from cache
      const cachedMessages = await messageCacheService.getCachedMessages(
        conversationId!,
      );

      if (cachedMessages.length === 0) {
        notifications.show({
          title: "Error",
          message: "No messages to delete",
          color: "red",
        });
        return;
      }

      // Get the latest message ID (last message in the list)
      const latestMessageId = cachedMessages[cachedMessages.length - 1]._id;

      // Delete using the latest message ID
      await messageService.deleteMessages(latestMessageId);
      await messageCacheService.clearConversationCache(conversationId!);
      setMessageCount(0);
      setReplyTarget(null);
      setEditTarget(null);
      setIsDeleteModalOpen(false);
      setRefreshKey((prev) => prev + 1);
      notifications.show({
        title: "Success",
        message: "Conversation history deleted",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete history";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Validate page access in useEffect
  useEffect(() => {
    if (!conversationId) {
      navigate("/friends");
    }
  }, [conversationId, navigate]);

  if (!detail) {
    return (
      <Box>
        <Header />
        <Center h="calc(100vh - 70px)">
          <Loader />
        </Center>
      </Box>
    );
  }

  const isGroup = detail.type === "group";
  const title = detail.name || (isGroup ? "Group chat" : "Chat");

  return (
    <Box>
      <Header />
      <Container size="sm" h="calc(100vh - 70px)">
        <Stack h="100%" p="md" gap="md">
          {/* Header with back button, title, and actions */}
          <Group justify="space-between" align="center">
            <ActionIcon
              variant="light"
              onClick={handleBack}
              title="Back to chats"
              size="lg"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box style={{ textAlign: "center" }}>
              <Text fw={700} size="lg">
                {title}
              </Text>
              {isGroup && (
                <Text size="xs" c="dimmed">
                  {detail.members.length} members
                </Text>
              )}
            </Box>
            <Group gap="xs">
              {isGroup && (
                <ActionIcon
                  variant="light"
                  onClick={() => setIsManageModalOpen(true)}
                  title="Group settings"
                  size="lg"
                >
                  <IconSettings size={20} />
                </ActionIcon>
              )}
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete conversation history"
                disabled={messageCount === 0}
                size="lg"
              >
                <IconTrash size={20} />
              </ActionIcon>
            </Group>
          </Group>

          {/* Messages List - Flex to fill available space */}
          <MessageList
            ref={scrollContainerRef}
            key={refreshKey}
            conversationId={conversationId!}
            conversationType={detail.type}
            memberMap={memberMap}
            socket={socket}
            handleRef={messageListRef}
            onReply={handleReply}
            onEdit={handleEdit}
            onMessageDeleted={handleMessageDeleted}
            onScrollStateChange={setIsScrolledToBottom}
            onMessageCountChange={setMessageCount}
          />

          {/* Message Input - Stays at bottom */}
          <MessageInput
            conversationId={conversationId!}
            replyTo={
              replyTarget
                ? {
                    message: replyTarget,
                    senderName: senderName(replyTarget.senderId),
                  }
                : null
            }
            editing={editTarget}
            onCancelReply={() => setReplyTarget(null)}
            onCancelEdit={() => setEditTarget(null)}
            onMessageSent={handleMessageStored}
            onMessageEdited={handleMessageStored}
            onInputResize={handleInputResize}
          />
        </Stack>
      </Container>

      {/* Group Management Modal */}
      {isGroup && (
        <GroupManageModal
          opened={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          detail={detail}
          currentUserId={currentUserId}
          onChanged={loadDetail}
          onLeft={() => navigate("/friends")}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Conversation History"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete all messages in this conversation?
            {isGroup && " This only clears your own view of the history."}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteHistory}
              loading={isDeleting}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default MessagesPage;
