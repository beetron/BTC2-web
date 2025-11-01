import { Box, Loader, Paper, Stack, Text, Avatar, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { getProfileImageUrl } from "../utils/profileImageUtils";

interface Friend {
  _id: string;
  email: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

interface FriendWithImage extends Friend {
  profileImageUrl: string | null;
}

interface FriendListProps {
  onSelectFriend: (friendId: string) => void;
}

export const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const [friends, setFriends] = useState<FriendWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setIsLoading(true);
    try {
      const friendsData = await userService.getFriendList();
      console.log("Friends data:", friendsData);

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

      setFriends(friendsWithImages);
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
              </Paper>
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

export default FriendList;
