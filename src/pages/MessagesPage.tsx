/**
 * Messages Page
 * Displays conversation with a selected friend
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
} from "@mantine/core";
import { IconArrowLeft, IconTrash } from "@tabler/icons-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { Header } from "../components/Header";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { useCallback, useState, useEffect, useRef } from "react";
import { messageService } from "../services/messageService";
import { messageCacheService } from "../services/messageCacheService";

interface LocationState {
  friendProfileImage?: string;
}

export const MessagesPage: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const { userProfileImage: authUserProfileImage } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [userProfileImage, setUserProfileImage] =
    useState(authUserProfileImage);
  const [messageCount, setMessageCount] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const friendProfileImage =
    (location.state as LocationState)?.friendProfileImage || null;

  // Refresh user profile image from localStorage on page load
  useEffect(() => {
    const storedProfileImage = localStorage.getItem("userProfileImage");
    if (storedProfileImage) {
      setUserProfileImage(storedProfileImage);
    }
  }, []);

  // Update message count for disable state
  useEffect(() => {
    const updateMessageCount = async () => {
      const cached = await messageCacheService.getCachedMessages(friendId!);
      setMessageCount(cached.length);
    };
    updateMessageCount();
  }, [friendId, refreshKey]);

  // All hooks must be called unconditionally
  const handleMessageSent = useCallback(async () => {
    // Trigger a refresh of the message list
    setRefreshKey((prev) => prev + 1);
  }, []);

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
        friendId!
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
      await messageCacheService.clearConversationCache(friendId!);
      setMessageCount(0);
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
    if (!friendId) {
      navigate("/friends");
    }
  }, [friendId, navigate]);

  return (
    <Box>
      <Header />
      <Container size="sm" h="calc(100vh - 70px)">
        <Stack h="100%" p="md" gap="md">
          {/* Header with back button and delete button */}
          <Group justify="space-between" align="center">
            <ActionIcon
              variant="light"
              onClick={handleBack}
              title="Back to friends"
              size="lg"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text fw={700} size="lg">
              Messages
            </Text>
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

          {/* Messages List - Flex to fill available space */}
          <MessageList
            ref={scrollContainerRef}
            key={refreshKey}
            friendId={friendId!}
            socket={socket}
            userProfileImage={userProfileImage}
            friendProfileImage={friendProfileImage ?? undefined}
            onScrollStateChange={setIsScrolledToBottom}
          />

          {/* Message Input - Stays at bottom */}
          <MessageInput
            friendId={friendId!}
            onMessageSent={handleMessageSent}
            onInputResize={handleInputResize}
          />
        </Stack>
      </Container>

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
