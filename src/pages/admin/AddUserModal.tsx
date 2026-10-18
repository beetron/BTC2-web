/**
 * Admin: create a user directly, without signup's invite step. The new
 * account starts out friends with the admin.
 */

import {
  Alert,
  Button,
  Group,
  Modal,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconKey } from "@tabler/icons-react";
import { useState } from "react";
import { adminService, AdminUserSummary } from "../../services/adminService";

// Same limits the API enforces (admin.controller.js createUser)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLACEHOLDER_EMAIL_DOMAIN = "users.invalid";

// No look-alike characters (0/O, 1/l/I) so a generated password can be
// read out or typed on a phone without mistakes
const PASSWORD_ALPHABET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GENERATED_PASSWORD_LENGTH = 12;

const generatePassword = () => {
  // Rejection sampling keeps every character equally likely
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  let password = "";
  while (password.length < GENERATED_PASSWORD_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_PASSWORD_LENGTH));
    for (const byte of bytes) {
      if (byte < limit && password.length < GENERATED_PASSWORD_LENGTH) {
        password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      }
    }
  }
  return password;
};

interface FormState {
  username: string;
  password: string;
  email: string;
  uniqueId: string;
  nickname: string;
}

const emptyForm: FormState = {
  username: "",
  password: "",
  email: "",
  uniqueId: "",
  nickname: "",
};

const validate = (form: FormState): Partial<Record<keyof FormState, string>> => {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const username = form.username.trim();
  const uniqueId = form.uniqueId.trim();
  const email = form.email.trim();

  if (username.length < 6 || username.length > 20) {
    errors.username = "Username must be 6 to 20 characters";
  }
  const passwordBytes = new TextEncoder().encode(form.password).length;
  if (form.password.length < 6 || passwordBytes > 72) {
    errors.password = "Password must be 6 to 72 characters";
  }
  if (uniqueId && (uniqueId.length < 6 || uniqueId.length > 20)) {
    errors.uniqueId = "Unique ID must be 6 to 20 characters";
  }
  if (form.nickname.trim().length > 20) {
    errors.nickname = "Nickname must be 20 characters or less";
  }
  if (email && (!EMAIL_REGEX.test(email) || email.length > 254)) {
    errors.email = "Enter a valid email address";
  }
  return errors;
};

interface AddUserModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (user: AdminUserSummary) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  opened,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  // Errors only show for fields the admin has left, not while first typing
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;
  const usernamePreview = form.username.trim().toLowerCase();

  const reset = () => {
    setForm(emptyForm);
    setTouched({});
    setShowPassword(false);
    setSaveError(null);
  };

  const close = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value;
      setForm((current) => ({ ...current, [key]: value }));
      setSaveError(null);
    },
    onBlur: () => setTouched((current) => ({ ...current, [key]: true })),
    error: touched[key] ? errors[key] : undefined,
  });

  const fillGeneratedPassword = () => {
    setForm((current) => ({ ...current, password: generatePassword() }));
    setTouched((current) => ({ ...current, password: true }));
    // Shown so it can be copied and passed on to whoever uses the account
    setShowPassword(true);
  };

  const submit = async () => {
    setTouched({ username: true, password: true, email: true, uniqueId: true, nickname: true });
    if (!isValid) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const user = await adminService.createUser({
        username: form.username.trim(),
        password: form.password,
        email: form.email.trim() || undefined,
        uniqueId: form.uniqueId.trim() || undefined,
        nickname: form.nickname.trim() || undefined,
      });
      reset();
      onCreated(user);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Add user" size="lg" centered>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Creates the account directly, with no signup or invite. The new user is added to your
            friends automatically and logs in with the username and password you set here.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Username"
              description="Used to log in. Saved in lowercase."
              required
              autoComplete="off"
              data-autofocus
              {...field("username")}
            />
            <PasswordInput
              label="Password"
              description="6 to 72 characters."
              required
              autoComplete="new-password"
              visible={showPassword}
              onVisibilityChange={setShowPassword}
              {...field("password")}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt={-8}>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconKey size={14} />}
              onClick={fillGeneratedPassword}
            >
              Generate password
            </Button>
          </Group>

          <TextInput
            label="Email"
            description={`Optional. Leave blank to use ${usernamePreview || "username"}@${PLACEHOLDER_EMAIL_DOMAIN}, which never receives mail.`}
            type="email"
            autoComplete="off"
            {...field("email")}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Unique ID"
              description="Optional. Defaults to the username."
              autoComplete="off"
              styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
              {...field("uniqueId")}
            />
            <TextInput
              label="Nickname"
              description="Optional. Defaults to the username."
              autoComplete="off"
              {...field("nickname")}
            />
          </SimpleGrid>

          {saveError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {saveError}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              Create user
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default AddUserModal;
