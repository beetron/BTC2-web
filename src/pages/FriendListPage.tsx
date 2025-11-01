/**
 * Friend List Page
 */

import { Box, Container, Stack, Text } from "@mantine/core";
import { FriendList } from "../components/FriendList.tsx";
import { Header } from "../components/Header";

export const FriendListPage: React.FC = () => {
  const handleSelectFriend = (friendId: string) => {
    // Messages will be shown later
    console.log("Selected friend:", friendId);
  };

  return (
    <Box>
      <Header />
      <Container size="sm" h="calc(100vh - 70px)">
        <Stack h="100%" p="md" gap="md">
          <Text fw={700} size="lg">
            Friends
          </Text>
          <Box style={{ flex: 1, overflowY: "auto" }}>
            <FriendList onSelectFriend={handleSelectFriend} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default FriendListPage;
