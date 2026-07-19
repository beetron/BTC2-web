/**
 * Chats Page (route: /friends)
 * Unified conversation list (direct + group) with entry points for
 * starting a new chat or creating a group.
 */

import { Box, Button, Container, Group, Stack, Text } from "@mantine/core";
import { IconMessagePlus, IconUsersPlus } from "@tabler/icons-react";
import { useState } from "react";
import { ConversationList } from "../components/ConversationList";
import { NewChatModal } from "../components/NewChatModal";
import { CreateGroupModal } from "../components/CreateGroupModal";
import { Header } from "../components/Header";
import { useSocket } from "../contexts/SocketContext";

export const FriendListPage: React.FC = () => {
  const { socket } = useSocket();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  return (
    <Box>
      <Header />
      <Container size="sm" h="calc(100vh - 70px)">
        <Stack h="100%" p="md" gap="md">
          <Group justify="space-between" align="center">
            <Text fw={700} size="lg">
              Chats
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconMessagePlus size={16} />}
                onClick={() => setNewChatOpen(true)}
              >
                New chat
              </Button>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconUsersPlus size={16} />}
                onClick={() => setCreateGroupOpen(true)}
              >
                New group
              </Button>
            </Group>
          </Group>
          <Box style={{ flex: 1, overflowY: "auto" }}>
            <ConversationList socket={socket} />
          </Box>
        </Stack>
      </Container>

      <NewChatModal opened={newChatOpen} onClose={() => setNewChatOpen(false)} />
      <CreateGroupModal
        opened={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
      />
    </Box>
  );
};

export default FriendListPage;
