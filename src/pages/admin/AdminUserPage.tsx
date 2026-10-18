/**
 * Admin: manage one user
 * Edit username / unique ID / email / password, delete everything the user
 * sent, or delete the user. Every destructive action is confirmed by typing
 * the username.
 */

import {
  Alert,
  Anchor,
  Avatar,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconChevronLeft } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import {
  adminService,
  AdminUserDetail,
  AdminUserUpdate,
} from "../../services/adminService";
import { getProfileImageUrl } from "../../utils/profileImageUtils";

// Same limits the API enforces (admin.controller.js)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only changed fields are checked, so an older account whose stored value
// predates a rule can still have its other fields edited
const validate = (
  form: FormState,
  user: AdminUserDetail,
): Partial<Record<keyof FormState, string>> => {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const username = form.username.trim();
  const uniqueId = form.uniqueId.trim();
  const email = form.email.trim();

  if (username.toLowerCase() !== user.username && (username.length < 6 || username.length > 20)) {
    errors.username = "Username must be 6 to 20 characters";
  }
  if (uniqueId !== user.uniqueId && (uniqueId.length < 6 || uniqueId.length > 20)) {
    errors.uniqueId = "Unique ID must be 6 to 20 characters";
  }
  if (email !== user.email && (!EMAIL_REGEX.test(email) || email.length > 254)) {
    errors.email = "Enter a valid email address";
  }
  if (form.password) {
    const bytes = new TextEncoder().encode(form.password).length;
    if (form.password.length < 6 || bytes > 72) {
      errors.password = "Password must be 6 to 72 characters";
    }
  }
  return errors;
};

interface FormState {
  username: string;
  uniqueId: string;
  email: string;
  password: string;
}

const FIELD_LABELS: Record<string, string> = {
  username: "username",
  uniqueId: "unique ID",
  email: "email",
  password: "password",
};

const formFromUser = (user: AdminUserDetail): FormState => ({
  username: user.username,
  uniqueId: user.uniqueId,
  email: user.email,
  password: "",
});

// Only what actually changed, so the API never rewrites untouched fields
const changesFrom = (form: FormState, user: AdminUserDetail): AdminUserUpdate => {
  const changes: AdminUserUpdate = {};
  const username = form.username.trim().toLowerCase();
  if (username !== user.username) changes.username = username;
  if (form.uniqueId.trim() !== user.uniqueId) changes.uniqueId = form.uniqueId.trim();
  if (form.email.trim() !== user.email) changes.email = form.email.trim();
  if (form.password) changes.password = form.password;
  return changes;
};

type PendingAction = "messages" | "user" | null;

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <Text fz={22} fw={700} lh={1.2}>
      {value.toLocaleString()}
    </Text>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
  </div>
);

export const AdminUserPage: React.FC = () => {
  const { userId = "" } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    username: "",
    uniqueId: "",
    email: "",
    password: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const detail = await adminService.getUser(userId);
      setUser(detail);
      setForm(formFromUser(detail));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load user");
    }
  }, [userId]);

  useEffect(() => {
    setUser(null);
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setAvatarUrl(null);
    if (user?.profileImage) {
      getProfileImageUrl(user.profileImage)
        .then((url) => !cancelled && setAvatarUrl(url))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [user?.profileImage]);

  if (loadError) {
    return (
      <>
        <Header />
        <Container size="md" py="xl">
          <Stack>
            <Anchor component={Link} to="/admin">
              <Group gap={4}>
                <IconChevronLeft size={16} /> All users
              </Group>
            </Anchor>
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Couldn't load this user">
              <Group justify="space-between" wrap="wrap">
                <Text size="sm">{loadError}</Text>
                <Button size="xs" variant="light" color="red" onClick={load}>
                  Try again
                </Button>
              </Group>
            </Alert>
          </Stack>
        </Container>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <Center py={80}>
          <Loader />
        </Center>
      </>
    );
  }

  const errors = validate(form, user);
  const changes = changesFrom(form, user);
  const changedFields = Object.keys(changes);
  const hasChanges = changedFields.length > 0;
  const isSelf = user.isAdmin;

  const setField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setForm((current) => ({ ...current, [key]: value }));
    setSaveError(null);
  };

  const save = async () => {
    if (!hasChanges || Object.keys(errors).length > 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await adminService.updateUser(user._id, changes);
      notifications.show({
        title: "Saved",
        message: `Updated ${result.changed.map((k) => FIELD_LABELS[k] || k).join(", ")}. ${result.user.username} was signed out on every device.`,
        color: "green",
      });
      // Editing your own account ends your session too; the next request
      // will send you to the login screen
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const openConfirm = (action: PendingAction) => {
    setTyped("");
    setPending(action);
  };

  const closeConfirm = () => {
    if (isDeleting) return;
    setPending(null);
    setTyped("");
  };

  const confirm = async () => {
    if (typed !== user.username) return;
    setIsDeleting(true);
    try {
      if (pending === "messages") {
        const result = await adminService.deleteUserMessages(user._id);
        notifications.show({
          title: "Messages deleted",
          message: `Deleted ${result.deletedCount.toLocaleString()} message${result.deletedCount === 1 ? "" : "s"} sent by ${user.username}.`,
          color: "green",
        });
        setPending(null);
        await load();
      } else if (pending === "user") {
        await adminService.deleteUser(user._id);
        notifications.show({
          title: "User deleted",
          message: `${user.username} and their data were removed.`,
          color: "green",
        });
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      notifications.show({
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Header />
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Anchor component={Link} to="/admin" size="sm" fw={600}>
            <Group gap={4}>
              <IconChevronLeft size={16} /> All users
            </Group>
          </Anchor>

          <Paper withBorder radius="md" p="lg">
            <Group justify="space-between" wrap="wrap" gap="lg">
              <Group gap="md" wrap="nowrap">
                <Avatar src={avatarUrl} size={64} radius="xl" color="blue">
                  {(user.nickname || user.username).charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Title order={2}>{user.username}</Title>
                  <Text c="dimmed" size="sm">
                    Nickname {user.nickname} · joined{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </div>
              </Group>
              <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="lg" verticalSpacing="sm">
                <Stat label="Messages sent" value={user.messagesSent} />
                <Stat label="Groups" value={user.groupCount} />
                <Stat label="Friends" value={user.friendCount} />
                <Stat label="Signed-in devices" value={user.activeSessions} />
              </SimpleGrid>
            </Group>
          </Paper>

          {isSelf && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />} title="This is your own account">
              Saving changes here signs you out too. Your account can't be deleted from this page.
            </Alert>
          )}

          <Group align="flex-start" gap="lg" wrap="wrap">
            <Paper withBorder radius="md" p="lg" style={{ flex: "999 1 420px", minWidth: 0 }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <Stack gap="md">
                  <div>
                    <Title order={4}>Account details</Title>
                    <Text size="sm" c="dimmed">
                      Saving any change signs this user out on every device (iOS and web).
                    </Text>
                  </div>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="Username"
                      description="Used to log in. Saved in lowercase."
                      value={form.username}
                      onChange={setField("username")}
                      error={errors.username}
                      autoComplete="off"
                    />
                    <TextInput
                      label="Unique ID"
                      description="What friends search for."
                      value={form.uniqueId}
                      onChange={setField("uniqueId")}
                      error={errors.uniqueId}
                      autoComplete="off"
                      styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                    />
                    <TextInput
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={setField("email")}
                      error={errors.email}
                      autoComplete="off"
                    />
                    <PasswordInput
                      label="New password"
                      description="Leave blank to keep the current one."
                      value={form.password}
                      onChange={setField("password")}
                      error={errors.password}
                      autoComplete="new-password"
                    />
                  </SimpleGrid>

                  {saveError && (
                    <Alert color="red" icon={<IconAlertCircle size={16} />}>
                      {saveError}
                    </Alert>
                  )}

                  <Group justify="flex-end">
                    <Button
                      variant="default"
                      disabled={!hasChanges || isSaving}
                      onClick={() => {
                        setForm(formFromUser(user));
                        setSaveError(null);
                      }}
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      loading={isSaving}
                      disabled={!hasChanges || Object.keys(errors).length > 0}
                    >
                      Save changes
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>

            <Paper
              withBorder
              radius="md"
              p="lg"
              style={{ flex: "1 1 280px", minWidth: 0, borderColor: "var(--mantine-color-red-4)" }}
            >
              <Stack gap="md">
                <Title order={4} c="red">
                  Danger zone
                </Title>
                <Stack gap={6}>
                  <Text fw={600}>Delete all messages</Text>
                  <Text size="sm" c="dimmed">
                    Deletes every message this user sent, in direct chats and groups. Other
                    people's messages and the account stay.
                  </Text>
                  <Button
                    variant="outline"
                    color="red"
                    onClick={() => openConfirm("messages")}
                    disabled={user.messagesSent === 0}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Delete all messages
                  </Button>
                </Stack>
                <Divider />
                <Stack gap={6}>
                  <Text fw={600}>Delete user</Text>
                  <Text size="sm" c="dimmed">
                    Permanently deletes the account, everything they sent, and their direct chats
                    on both sides. They leave every group. This can't be undone.
                  </Text>
                  <Button
                    color="red"
                    onClick={() => openConfirm("user")}
                    disabled={isSelf}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Delete user
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Group>
        </Stack>
      </Container>

      <Modal
        opened={pending !== null}
        onClose={closeConfirm}
        title={pending === "user" ? "Delete this user?" : "Delete all messages?"}
        centered
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <Stack gap="md">
            <Text size="sm">
              {pending === "user"
                ? `${user.username}'s account, everything they sent, and their direct chats will be permanently deleted.`
                : `Every message ${user.username} sent, in direct chats and groups, will be deleted. Their account stays.`}
            </Text>
            <TextInput
              label={
                <>
                  Type <Text span ff="monospace" fw={700}>{user.username}</Text> to confirm
                </>
              }
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              autoComplete="off"
              data-autofocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeConfirm} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="red"
                loading={isDeleting}
                disabled={typed !== user.username}
              >
                {pending === "user" ? "Delete user" : "Delete messages"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};

export default AdminUserPage;
