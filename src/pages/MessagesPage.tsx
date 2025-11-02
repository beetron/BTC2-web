/**
 * Messages Page
 * Displays conversation with a selected friend
 */

import { Box, Container, Stack, ActionIcon, Group, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Header } from "../components/Header";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { useCallback, useState, useEffect, useRef } from "react";

interface LocationState {
  friendProfileImage?: string;
}

export const MessagesPage: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const { userProfileImage } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Extract friend profile image from Router state
  const friendProfileImage = (location.state as LocationState)
    ?.friendProfileImage;

  // Check if we have valid data to render
  const hasValidData = !!(friendId && friendProfileImage);

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

  // Validate page access in useEffect
  useEffect(() => {
    if (!friendId || !friendProfileImage) {
      navigate("/friends");
    }
  }, [friendId, friendProfileImage, navigate]);

  // Don't render if not valid
  if (!hasValidData) {
    return null;
  }

  return (
    <Box>
      <Header />
      <Container size="sm" h="calc(100vh - 70px)">
        <Stack h="100%" p="md" gap="md">
          {/* Header with back button */}
          <Group justify="space-between" align="center">
            <ActionIcon
              variant="light"
              onClick={handleBack}
              title="Back to friends"
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <Text fw={700} size="lg">
              Messages
            </Text>
            <Box style={{ width: 40 }} />
          </Group>

          {/* Messages List - Flex to fill available space */}
          <MessageList
            ref={scrollContainerRef}
            key={refreshKey}
            friendId={friendId!}
            socket={socket}
            userProfileImage={userProfileImage}
            friendProfileImage={friendProfileImage!}
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
    </Box>
  );
};

export default MessagesPage;
