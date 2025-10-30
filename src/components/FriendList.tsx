/**
 * Friend List Component
 */

import { Box, Loader, Paper, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";

interface Friend {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

interface FriendListProps {
  onSelectFriend: (friendId: string) => void;
}

export const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const friendsData = await userService.getFriendList();
      setFriends(friendsData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load friends";
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
      <Box style={{ display: "flex", justifyContent: "center" }}>
        <Loader />
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <Box style={{ maxHeight: "600px", overflowY: "auto" }}>
        <Stack gap="xs">
          {friends.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center">
              No friends yet
            </Text>
          ) : (
            friends.map((friend) => (
              <Paper
                key={friend._id}
                p="sm"
                radius="md"
                style={{ cursor: "pointer" }}
                onClick={() => onSelectFriend(friend._id)}
                withBorder
              >
                <Box>
                  <Text fw={500}>{friend.nickname}</Text>
                  <Text size="xs" c="dimmed">
                    @{friend.uniqueId}
                  </Text>
                </Box>
              </Paper>
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default FriendList;
