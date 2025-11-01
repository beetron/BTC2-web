import {
  Box,
  Loader,
  Paper,
  Stack,
  Text,
  Center,
  Avatar,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { messageService } from "../services/messageService";
import { userService } from "../services/userService";
import { getProfileImageUrl } from "../utils/profileImageUtils";

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

interface UserProfile {
  _id: string;
  nickname: string;
  profileImage?: string;
  profileImageUrl?: string;
}

interface MessageListProps {
  friendId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ friendId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const currentUserId = localStorage.getItem("userId") || "";

  useEffect(() => {
    loadMessages();
  }, [friendId]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Fetch messages
      const data = await messageService.getMessages(friendId);
      setMessages(data);

      // Fetch user profiles
      const [currentUserData, friendData] = await Promise.all([
        userService.getUserById(currentUserId),
        userService.getUserById(friendId),
      ]);

      console.log("Current user data:", currentUserData);
      console.log("Friend data:", friendData);

      // Load profile images
      const [currentUserImageUrl, friendImageUrl] = await Promise.all([
        getProfileImageUrl(currentUserData.profileImage),
        getProfileImageUrl(friendData.profileImage),
      ]);

      setCurrentUserProfile({
        _id: currentUserData._id,
        nickname: currentUserData.nickname,
        profileImage: currentUserData.profileImage,
        profileImageUrl: currentUserImageUrl || undefined,
      });

      setFriendProfile({
        _id: friendData._id,
        nickname: friendData.nickname,
        profileImage: friendData.profileImage,
        profileImageUrl: friendImageUrl || undefined,
      });
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
        messages.map((msg) => {
          const isCurrentUser = msg.senderId === currentUserId;
          const profile = isCurrentUser ? currentUserProfile : friendProfile;
          const profileImageUrl = profile?.profileImageUrl || undefined;

          return (
            <Group
              key={msg._id}
              align="flex-start"
              justify={isCurrentUser ? "flex-end" : "flex-start"}
              gap="xs"
            >
              {!isCurrentUser && (
                <Avatar
                  src={profileImageUrl}
                  alt={`${profile?.nickname || "User"}'s profile`}
                  size="sm"
                  radius="xl"
                  onError={(e) => {
                    console.error("Avatar load error for", profile?.nickname);
                    // Remove src on error to show Mantine placeholder
                    const target = e.target as HTMLImageElement;
                    target.src = "";
                  }}
                />
              )}
              <Paper
                p="sm"
                radius="md"
                style={{
                  maxWidth: "70%",
                  backgroundColor: isCurrentUser ? "#387FDF" : "#DEE2E6",
                }}
              >
                <Stack gap={0}>
                  <Text size="sm" c={isCurrentUser ? "white" : "black"}>
                    {msg.message}
                  </Text>
                  <Text
                    size="xs"
                    c={isCurrentUser ? "rgba(255,255,255,0.7)" : "gray"}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Paper>
              {isCurrentUser && (
                <Avatar
                  src={profileImageUrl}
                  alt={`${profile?.nickname || "User"}'s profile`}
                  size="sm"
                  radius="xl"
                  onError={(e) => {
                    console.error("Avatar load error for", profile?.nickname);
                    // Remove src on error to show Mantine placeholder
                    const target = e.target as HTMLImageElement;
                    target.src = "";
                  }}
                />
              )}
            </Group>
          );
        })
      )}
    </Box>
  );
};

export default MessageList;
