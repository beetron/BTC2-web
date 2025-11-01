/**
 * Login Page
 */

import {
  Button,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthHeader } from "../components/AuthHeader";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      notifications.show({
        title: "Missing Fields",
        message: "Please fill in all fields",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      notifications.show({
        title: "Success",
        message: "Logged in successfully",
        color: "green",
      });
      navigate("/chat");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
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
          mb={50}
        >
          bTC2
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Username"
              placeholder="Your username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              leftSection={<IconUser size={16} />}
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

            <Group justify="space-between" mt="lg">
              <Button
                variant="default"
                onClick={() => navigate("/forgot-password")}
                disabled={isLoading}
              >
                Forgot Password?
              </Button>
              <Button type="submit" loading={isLoading}>
                Sign in
              </Button>
            </Group>
          </Stack>
        </form>

        <Text ta="center" mt="xl">
          Don't have an account?{" "}
          <Button variant="subtle" onClick={() => navigate("/signup")}>
            Sign up
          </Button>
        </Text>
      </Container>
    </>
  );
};

export default LoginPage;
