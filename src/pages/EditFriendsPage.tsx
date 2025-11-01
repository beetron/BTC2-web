/**
 * Edit Friends Page
 */

import {
  Container,
  Stack,
  Text,
  Group,
  Button,
  TextInput,
  Paper,
  Avatar,
  Badge,
  Loader,
  Center,
  ActionIcon,
  Tabs,
  Card,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconUserPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { userService } from "../services/userService";
import { notifications } from "@mantine/notifications";
import { Header } from "../components/Header";

interface Friend {
  _id: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

interface PendingRequest {
  _id: string;
  nickname: string;
  uniqueId: string;
  profileImage?: string;
}

export const EditFriendsPage: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<PendingRequest[]>([]);
  const [friendList, setFriendList] = useState<Friend[]>([]);
  const [searchId, setSearchId] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadFriendRequests();
    loadFriendList();
  }, []);

  const loadFriendRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await userService.getFriendRequests();
      setFriendRequests(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load friend requests";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadFriendList = async () => {
    setLoadingFriends(true);
    try {
      const data = await userService.getFriendList();
      setFriendList(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load friends";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleAcceptRequest = async (uniqueId: string) => {
    setProcessingId(uniqueId);
    try {
      await userService.acceptFriendRequest(uniqueId);
      setFriendRequests(
        friendRequests.filter((req) => req.uniqueId !== uniqueId)
      );
      await loadFriendList();
      notifications.show({
        title: "Success",
        message: "Friend request accepted",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept request";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (uniqueId: string) => {
    setProcessingId(uniqueId);
    try {
      await userService.rejectFriendRequest(uniqueId);
      setFriendRequests(
        friendRequests.filter((req) => req.uniqueId !== uniqueId)
      );
      notifications.show({
        title: "Success",
        message: "Friend request denied",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reject request";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFriend = async (uniqueId: string) => {
    setProcessingId(uniqueId);
    try {
      await userService.removeFriend(uniqueId);
      setFriendList(
        friendList.filter((friend) => friend.uniqueId !== uniqueId)
      );
      notifications.show({
        title: "Success",
        message: "Friend removed",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove friend";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddFriend = async () => {
    if (!searchId.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter a unique ID",
        color: "red",
      });
      return;
    }

    setAddingFriend(true);
    try {
      await userService.sendFriendRequest(searchId);
      setSearchId("");
      notifications.show({
        title: "Success",
        message: "Friend request sent",
        color: "green",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send friend request";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setAddingFriend(false);
    }
  };

  return (
    <>
      <Header />
      <Container size="sm" py="xl">
        <Tabs defaultValue="requests" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="requests" leftSection={<IconUserPlus size={16} />}>
              Pending Requests
              {friendRequests.length > 0 && (
                <Badge ml="xs" size="sm" color="red">
                  {friendRequests.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="friends" leftSection={<IconCheck size={16} />}>
              Friends
              {friendList.length > 0 && (
                <Badge ml="xs" size="sm" color="blue">
                  {friendList.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="add" leftSection={<IconUserPlus size={16} />}>
              Add Friend
            </Tabs.Tab>
          </Tabs.List>

          {/* Pending Friend Requests Tab */}
          <Tabs.Panel value="requests" pt="xl">
            {loadingRequests ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : friendRequests.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No pending friend requests</Text>
              </Center>
            ) : (
              <Stack gap="md">
                {friendRequests.map((request) => (
                  <Paper key={request._id} p="md" radius="md" withBorder>
                    <Group justify="space-between">
                      <Group>
                        <Avatar
                          src={request.profileImage}
                          size="lg"
                          radius="md"
                          color="blue"
                        >
                          {request.nickname.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={500}>{request.nickname}</Text>
                          <Text size="sm" c="dimmed">
                            @{request.uniqueId}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <ActionIcon
                          variant="filled"
                          color="green"
                          onClick={() => handleAcceptRequest(request.uniqueId)}
                          loading={processingId === request.uniqueId}
                        >
                          <IconCheck size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="filled"
                          color="red"
                          onClick={() => handleRejectRequest(request.uniqueId)}
                          loading={processingId === request.uniqueId}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          {/* Friends List Tab */}
          <Tabs.Panel value="friends" pt="xl">
            {loadingFriends ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : friendList.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No friends yet</Text>
              </Center>
            ) : (
              <Stack gap="md">
                {friendList.map((friend) => (
                  <Paper key={friend._id} p="md" radius="md" withBorder>
                    <Group justify="space-between">
                      <Group>
                        <Avatar
                          src={friend.profileImage}
                          size="lg"
                          radius="md"
                          color="blue"
                        >
                          {friend.nickname.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={500}>{friend.nickname}</Text>
                          <Text size="sm" c="dimmed">
                            @{friend.uniqueId}
                          </Text>
                        </div>
                      </Group>
                      <ActionIcon
                        variant="filled"
                        color="red"
                        onClick={() => handleRemoveFriend(friend.uniqueId)}
                        loading={processingId === friend.uniqueId}
                        title="Remove friend"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          {/* Add Friend Tab */}
          <Tabs.Panel value="add" pt="xl">
            <Card withBorder radius="md" p="lg" maw={500} mx="auto">
              <Stack gap="md">
                <Text fw={500} size="lg">
                  Add a Friend
                </Text>
                <Text size="sm" c="dimmed">
                  Enter the unique ID of the friend you want to add
                </Text>
                <TextInput
                  placeholder="Enter unique ID"
                  leftSection={<IconSearch size={16} />}
                  value={searchId}
                  onChange={(e) => setSearchId(e.currentTarget.value)}
                  disabled={addingFriend}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddFriend();
                    }
                  }}
                />
                <Button
                  fullWidth
                  onClick={handleAddFriend}
                  loading={addingFriend}
                  leftSection={<IconUserPlus size={16} />}
                >
                  Send Friend Request
                </Button>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Container>
    </>
  );
};

export default EditFriendsPage;
