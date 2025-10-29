/**
 * Chat Page
 */

import {
  Box,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Center,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconLogout, IconSettings } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MessageList } from "../components/MessageList.tsx";
import { FriendList } from "../components/FriendList.tsx";
import { MessageInput } from "../components/MessageInput.tsx";

export const ChatPage: React.FC = () => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      notifications.show({
        title: "Success",
        message: "Logged out successfully",
        color: "green",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  return (
    <Container fluid h="100vh">
      <Grid h="100%" gutter="sm">
        {/* Sidebar - Friend List */}
        <Grid.Col span={{ base: 12, md: 3 }} h="100%">
          <Stack h="100%" p="md" gap="md">
            <Group justify="space-between">
              <Title order={3}>Friends</Title>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  onClick={() => navigate("/profile")}
                  leftSection={<IconSettings size={14} />}
                >
                  Profile
                </Button>
                <Button
                  size="xs"
                  color="red"
                  onClick={handleLogout}
                  leftSection={<IconLogout size={14} />}
                >
                  Logout
                </Button>
              </Group>
            </Group>
            <Box style={{ flex: 1, overflowY: "auto" }}>
              <FriendList onSelectFriend={setSelectedFriendId} />
            </Box>
          </Stack>
        </Grid.Col>

        {/* Main Chat Area */}
        <Grid.Col span={{ base: 12, md: 9 }} h="100%">
          {selectedFriendId ? (
            <Stack h="100%" p="md" gap="md">
              <MessageList friendId={selectedFriendId} />
              <MessageInput friendId={selectedFriendId} />
            </Stack>
          ) : (
            <Center h="100%">
              <Stack gap="md">
                <Text size="lg" c="dimmed">
                  Select a friend to start chatting
                </Text>
              </Stack>
            </Center>
          )}
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default ChatPage;
