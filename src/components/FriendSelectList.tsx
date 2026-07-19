/**
 * Friend Select List Component
 * Checkbox list of the current user's friends, used when creating a group
 * or adding members to an existing one.
 */

import {
  Avatar,
  Box,
  Checkbox,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { getProfileImageUrl } from "../utils/profileImageUtils";

export interface SelectableFriend {
  _id: string;
  nickname: string;
  uniqueId: string;
  profileImageUrl: string | null;
}

interface FriendSelectListProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  /** Friends to hide (e.g. users already in the group) */
  excludeIds?: string[];
  /** Single-select mode: clicking a friend replaces the selection */
  emptyMessage?: string;
}

export const FriendSelectList: React.FC<FriendSelectListProps> = ({
  selectedIds,
  onChange,
  excludeIds = [],
  emptyMessage = "No friends available",
}) => {
  const [friends, setFriends] = useState<SelectableFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await userService.getFriendList();
        const withImages = await Promise.all(
          data.map(async (friend) => ({
            _id: friend._id,
            nickname: friend.nickname,
            uniqueId: friend.uniqueId,
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
  }, []);

  const toggle = (friendId: string) => {
    if (selectedIds.includes(friendId)) {
      onChange(selectedIds.filter((id) => id !== friendId));
    } else {
      onChange([...selectedIds, friendId]);
    }
  };

  const visibleFriends = friends.filter(
    (friend) => !excludeIds.includes(friend._id),
  );

  if (isLoading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center" }} py="md">
        <Loader size="sm" />
      </Box>
    );
  }

  if (visibleFriends.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="md">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Stack gap="xs" style={{ maxHeight: "300px", overflowY: "auto" }}>
      {visibleFriends.map((friend) => (
        <Paper
          key={friend._id}
          p="xs"
          radius="md"
          withBorder
          style={{ cursor: "pointer" }}
          onClick={() => toggle(friend._id)}
        >
          <Group gap="sm" align="center">
            <Checkbox
              checked={selectedIds.includes(friend._id)}
              onChange={() => toggle(friend._id)}
              onClick={(e) => e.stopPropagation()}
            />
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
        </Paper>
      ))}
    </Stack>
  );
};

export default FriendSelectList;
