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
import { IconMessage } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { userService } from "../services/userService";
import { useSocketListener } from "../hooks/useSocketListener";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface Friend {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
  unreadCount?: number;
  updatedAt?: string;
}

interface FriendWithImage extends Friend {
  profileImageUrl: string | null;
}

interface FriendListProps {
  onSelectFriend: (friendId: string) => void;
  socket: Socket | null;
}

export const FriendList: React.FC<FriendListProps> = ({
  onSelectFriend,
  socket,
}) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFriends = useCallback(async () => {
    console.log("loadFriends called");
    setIsLoading(true);
    try {
      const friendsData = await userService.getFriendList();
      console.log("Friends data fetched:", friendsData);

      // Load profile images for all friends
      const friendsWithImages = await Promise.all(
        friendsData.map(async (friend) => {
          const profileImageUrl = await getProfileImageUrl(friend.profileImage);
          return {
            ...friend,
            profileImageUrl,
          };
        })
      );

      console.log(
        "Setting friends state with",
        friendsWithImages.length,
        "friends"
      );
      setFriends(friendsWithImages);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load friends";
      console.error("Error loading friends:", message);
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
    loadFriends();
  }, [loadFriends]);

  // Listen for new messages via socket
  useSocketListener(socket, {
    eventName: "newMessageSignal",
    onEvent: loadFriends,
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
                onClick={() => {
                  // Pass friend profile image via Router state
                  navigate(`/messages/${friend._id}`, {
                    state: { friendProfileImage: friend.profileImage },
                  });
                  onSelectFriend(friend._id);
                }}
                withBorder
              >
                <Group align="center" gap="sm" justify="space-between">
                  <Group align="center" gap="sm">
                    <Avatar
                      src={friend.profileImageUrl}
                      alt={`${friend.nickname}'s profile`}
                      size="lg"
                      radius="xl"
                      onError={(e) => {
                        console.error("Avatar load error for", friend.nickname);
                        // Remove src on error to show Mantine placeholder
                        const target = e.target as HTMLImageElement;
                        target.src = "";
                      }}
                    />
                    <Box>
                      <Text fw={500}>{friend.nickname}</Text>
                    </Box>
                  </Group>
                  {friend.unreadCount ? (
                    <Group gap="xs" align="center">
                      <IconMessage size={20} />
                      <Badge color="blue" variant="filled" size="lg">
                        {friend.unreadCount}
                      </Badge>
                    </Group>
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

export default FriendList;
