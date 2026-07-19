/**
 * New Chat Modal
 * Pick a friend -> POST /conversations/direct -> open the thread
 */

import {
  Avatar,
  Box,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { conversationService } from "../services/conversationService";
import { userService } from "../services/userService";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface FriendOption {
  _id: string;
  nickname: string;
  profileImageUrl: string | null;
}

interface NewChatModalProps {
  opened: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  opened,
  onClose,
}) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;

    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const data = await userService.getFriendList();
        const withImages = await Promise.all(
          data.map(async (friend) => ({
            _id: friend._id,
            nickname: friend.nickname,
            profileImageUrl: await getProfileImageUrl(friend.profileImage),
          })),
        );
        setFriends(withImages);
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFriends();
  }, [opened]);

  const handleSelect = async (friendId: string) => {
    if (openingId) return;
    setOpeningId(friendId);
    try {
      const conversation = await conversationService.createDirect(friendId);
      onClose();
      navigate(`/messages/${conversation.conversationId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open chat";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New Chat" centered>
      {isLoading ? (
        <Box style={{ display: "flex", justifyContent: "center" }} py="md">
          <Loader size="sm" />
        </Box>
      ) : friends.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="md">
          No friends yet. Add friends to start chatting!
        </Text>
      ) : (
        <Stack gap="xs" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {friends.map((friend) => (
            <Paper
              key={friend._id}
              p="xs"
              radius="md"
              withBorder
              style={{
                cursor: "pointer",
                opacity: openingId && openingId !== friend._id ? 0.5 : 1,
              }}
              onClick={() => handleSelect(friend._id)}
            >
              <Group gap="sm" align="center" justify="space-between">
                <Group gap="sm" align="center">
                  <Avatar
                    src={friend.profileImageUrl}
                    alt={friend.nickname}
                    size="md"
                    radius="xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "";
                    }}
                  />
                  <Text size="sm" fw={500}>
                    {friend.nickname}
                  </Text>
                </Group>
                {openingId === friend._id && <Loader size="xs" />}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Modal>
  );
};

export default NewChatModal;
