/**
 * Signup Page
 */

import {
  Button,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconId, IconMail, IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthHeader } from "../components/AuthHeader";

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !username || !uniqueId) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all fields",
        color: "red",
      });
      return;
    }

    if (password.length < 6) {
      notifications.show({
        title: "Validation Error",
        message: "Password must be at least 6 characters",
        color: "red",
      });
      return;
    }

    if (password !== confirmPassword) {
      notifications.show({
        title: "Validation Error",
        message: "Passwords do not match",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await signup(username, password, email, uniqueId);
      // Use server success message if available, otherwise use default
      const successMessage =
        response?.message || "Account created successfully";
      notifications.show({
        title: "Success",
        message: successMessage,
        color: "green",
      });
      navigate("/chat");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthHeader />
      <Container size={420} my={40}>
        <Title
          ta="center"
          style={{
            fontFamily: "Greycliff CF, var(--mantine-font-family)",
            fontWeight: 900,
          }}
          mb={20}
        >
          Create Account
        </Title>

        <Text ta="start" c="dimmed" size="sm" mb={30}>
          BTC2 is an invite-only chat application. You need a unique ID from an
          existing user to create an account.
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Email"
              placeholder="your@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} />}
              disabled={isLoading}
              required
            />

            <TextInput
              label="Username"
              placeholder="Username for log in"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              leftSection={<IconUser size={16} />}
              disabled={isLoading}
              required
            />

            <TextInput
              label="Friend's Unique ID"
              placeholder="Your friend's unique ID"
              value={uniqueId}
              onChange={(e) => setUniqueId(e.currentTarget.value)}
              leftSection={<IconId size={16} />}
              disabled={isLoading}
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              disabled={isLoading}
              required
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={isLoading}
              required
            />

            <Button type="submit" loading={isLoading} fullWidth>
              Sign up
            </Button>
          </Stack>
        </form>

        <Text ta="center" mt="xl">
          Already have an account?{" "}
          <Button variant="subtle" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </Text>
      </Container>
    </>
  );
};

export default SignupPage;
