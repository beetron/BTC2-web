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

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !nickname || !uniqueId) {
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

    setIsLoading(true);
    try {
      await signup(email, password, nickname, uniqueId);
      notifications.show({
        title: "Success",
        message: "Account created successfully",
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
    <Container size={420} my={40}>
      <Title
        ta="center"
        style={{
          fontFamily: "Greycliff CF, var(--mantine-font-family)",
          fontWeight: 900,
        }}
        mb={50}
      >
        Create Account
      </Title>

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
            label="Nickname"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.currentTarget.value)}
            leftSection={<IconUser size={16} />}
            disabled={isLoading}
            required
          />

          <TextInput
            label="Unique ID"
            placeholder="Your unique username"
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
  );
};

export default SignupPage;
