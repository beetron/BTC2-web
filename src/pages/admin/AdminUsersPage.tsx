/**
 * Admin: user list
 * Searchable, paginated list of every user. Selecting one opens the
 * manage page.
 */

import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconAlertCircle, IconChevronRight, IconSearch, IconUserPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { adminService, AdminUserSummary } from "../../services/adminService";
import { notifications } from "@mantine/notifications";
import { AddUserModal } from "./AddUserModal";

const PAGE_SIZE = 50;

const formatJoined = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query.trim(), 300);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  // Typing fires overlapping searches; only the latest one may update state
  const requestIdRef = useRef(0);

  const loadFirstPage = useCallback(async (q: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const page = await adminService.listUsers({ q, limit: PAGE_SIZE });
      if (requestId !== requestIdRef.current) return;
      setUsers(page.users);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFirstPage(debouncedQuery);
  }, [debouncedQuery, loadFirstPage]);

  const loadMore = async () => {
    if (!nextCursor) return;
    const requestId = requestIdRef.current;
    setIsLoadingMore(true);
    try {
      const page = await adminService.listUsers({
        q: debouncedQuery,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;
      setUsers((current) => [...current, ...page.users]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more users");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openUser = (id: string) => navigate(`/admin/users/${id}`);

  const handleCreated = (user: AdminUserSummary) => {
    setAddUserOpen(false);
    notifications.show({
      title: "User created",
      message: `${user.username} was created and added to your friends.`,
      color: "green",
    });
    openUser(user._id);
  };

  return (
    <>
      <Header />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-end" wrap="wrap">
            <div>
              <Title order={2}>Users</Title>
              <Text c="dimmed" size="sm">
                Select a user to edit their details or delete them.
              </Text>
            </div>
            <Group align="flex-end" gap="sm" wrap="wrap" w={{ base: "100%", xs: "auto" }}>
              <TextInput
                label="Search"
                placeholder="Username, unique ID or email"
                leftSection={<IconSearch size={16} />}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                maxLength={100}
                w={{ base: "100%", xs: 320 }}
              />
              <Button
                leftSection={<IconUserPlus size={16} />}
                onClick={() => setAddUserOpen(true)}
              >
                Add user
              </Button>
            </Group>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Couldn't load users">
              <Group justify="space-between" wrap="wrap">
                <Text size="sm">{error}</Text>
                <Button size="xs" variant="light" color="red" onClick={() => loadFirstPage(debouncedQuery)}>
                  Try again
                </Button>
              </Group>
            </Alert>
          )}

          <Paper withBorder radius="md">
            {isLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : users.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">
                  {debouncedQuery ? "No users match that search." : "No users yet."}
                </Text>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={640}>
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>User</Table.Th>
                      <Table.Th>Unique ID</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Joined</Table.Th>
                      <Table.Th w={32} aria-label="Open" />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {users.map((user) => (
                      <Table.Tr
                        key={user._id}
                        onClick={() => openUser(user._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar radius="xl" color="blue">
                              {(user.nickname || user.username).charAt(0).toUpperCase()}
                            </Avatar>
                            <div style={{ minWidth: 0 }}>
                              <Group gap={6} wrap="nowrap">
                                {/* The link keeps rows reachable by keyboard */}
                                <Anchor
                                  component={Link}
                                  to={`/admin/users/${user._id}`}
                                  fw={600}
                                  c="inherit"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {user.username}
                                </Anchor>
                                {user.isAdmin && (
                                  <Badge size="xs" variant="light">
                                    You
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed" truncate>
                                {user.nickname}
                              </Text>
                            </div>
                          </Group>
                        </Table.Td>
                        <Table.Td ff="monospace" fz="sm">
                          {user.uniqueId}
                        </Table.Td>
                        <Table.Td fz="sm">{user.email}</Table.Td>
                        <Table.Td fz="sm" c="dimmed">
                          {formatJoined(user.createdAt)}
                        </Table.Td>
                        <Table.Td>
                          <IconChevronRight size={16} aria-hidden="true" />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>

          {!isLoading && users.length > 0 && (
            <Group justify="space-between" wrap="wrap">
              <Text size="sm" c="dimmed">
                {debouncedQuery
                  ? `${users.length}${nextCursor ? "+" : ""} matching user${users.length === 1 ? "" : "s"}`
                  : `Showing ${users.length} user${users.length === 1 ? "" : "s"}${nextCursor ? " so far" : ""}, sorted by username`}
              </Text>
              {nextCursor && (
                <Button variant="default" onClick={loadMore} loading={isLoadingMore}>
                  Load more
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Container>

      <AddUserModal
        opened={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
};

export default AdminUsersPage;
