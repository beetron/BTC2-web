/**
 * Friend List Component
 */

import { Box, Button, Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUserCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";

interface Friend {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

interface FriendRequest {
  _id: string;
  senderId: string;
  senderNickname: string;
  senderUniqueId: string;
  status: string;
  createdAt: string;
}

interface FriendListProps {
  onSelectFriend: (friendId: string) => void;
}

export const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        userService.getFriendList(),
        userService.getFriendRequests(),
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
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

  const handleAcceptRequest = async (uniqueId: string) => {
    try {
      await userService.acceptFriendRequest(uniqueId);
      notifications.show({
        title: "Success",
        message: "Friend request accepted",
        color: "green",
      });
      await loadFriends();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept request";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const handleRejectRequest = async (uniqueId: string) => {
    try {
      await userService.rejectFriendRequest(uniqueId);
      notifications.show({
        title: "Success",
        message: "Friend request rejected",
        color: "green",
      });
      await loadFriends();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reject request";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
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
      <Group>
        <Button
          variant={activeTab === "friends" ? "filled" : "default"}
          onClick={() => setActiveTab("friends")}
          fullWidth
        >
          Friends
        </Button>
        <Button
          variant={activeTab === "requests" ? "filled" : "default"}
          onClick={() => setActiveTab("requests")}
          fullWidth
        >
          Requests ({friendRequests.length})
        </Button>
      </Group>

      <Box style={{ maxHeight: "600px", overflowY: "auto" }}>
        {activeTab === "friends" ? (
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
                  <Group justify="space-between">
                    <Box>
                      <Text fw={500}>{friend.nickname}</Text>
                      <Text size="xs" c="dimmed">
                        @{friend.uniqueId}
                      </Text>
                    </Box>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        ) : (
          <Stack gap="xs">
            {friendRequests.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center">
                No pending requests
              </Text>
            ) : (
              friendRequests.map((request) => (
                <Paper key={request._id} p="sm" radius="md" withBorder>
                  <Stack gap="xs">
                    <Box>
                      <Text fw={500}>{request.senderNickname}</Text>
                      <Text size="xs" c="dimmed">
                        @{request.senderUniqueId}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        onClick={() =>
                          handleAcceptRequest(request.senderUniqueId)
                        }
                        leftSection={<IconUserCheck size={14} />}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="default"
                        onClick={() =>
                          handleRejectRequest(request.senderUniqueId)
                        }
                        leftSection={<IconX size={14} />}
                      >
                        Reject
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
};

export default FriendList;
