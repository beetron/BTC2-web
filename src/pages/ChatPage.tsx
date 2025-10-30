/**
 * Chat Page
 */

import { Box, Container, Grid, Stack, Text, Center } from "@mantine/core";
import { useState } from "react";
import { Header } from "../components/Header";
import { MessageList } from "../components/MessageList.tsx";
import { FriendList } from "../components/FriendList.tsx";
import { MessageInput } from "../components/MessageInput.tsx";

export const ChatPage: React.FC = () => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  return (
    <Box>
      <Header />
      <Container fluid h="calc(100vh - 70px)">
        <Grid h="100%" gutter="sm">
          {/* Sidebar - Friend List */}
          <Grid.Col span={{ base: 12, md: 3 }} h="100%">
            <Stack h="100%" p="md" gap="md">
              <Text fw={700} size="lg">
                Friends
              </Text>
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
    </Box>
  );
};

export default ChatPage;
