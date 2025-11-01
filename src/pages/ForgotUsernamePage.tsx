/**
 * Forgot Username Page
 */

import {
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthHeader } from "../components/AuthHeader";

export const ForgotUsernamePage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { forgotUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      notifications.show({
        title: "Validation Error",
        message: "Please enter your email",
        color: "red",
      });
      return;
    }

    setIsLoading(true);
    try {
      await forgotUsername(email);
      setIsSubmitted(true);
      notifications.show({
        title: "Success",
        message: "Check your email for your username",
        color: "green",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <AuthHeader />
        <Container size={420} my={40}>
          <Box ta="center">
            <Title mb={30}>Check Your Email</Title>
            <Text color="dimmed" mb={30}>
              We've sent your username to the email address you provided. Please
              check your inbox and spam folder.
            </Text>
            <Button onClick={() => navigate("/login")} fullWidth>
              Back to Login
            </Button>
          </Box>
        </Container>
      </>
    );
  }

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
          Forgot Username
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb={20}>
          Enter your email address and we'll send you your username
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

            <Button type="submit" loading={isLoading} fullWidth>
              Send Username
            </Button>
          </Stack>
        </form>

        <Group justify="center" mt="xl">
          <Button variant="subtle" onClick={() => navigate("/login")}>
            Back to Login
          </Button>
          <Button variant="subtle" onClick={() => navigate("/forgot-password")}>
            Forgot Password?
          </Button>
        </Group>
      </Container>
    </>
  );
};

export default ForgotUsernamePage;
