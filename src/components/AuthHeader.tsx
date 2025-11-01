/**
 * Auth Header Component
 * Minimal header with theme toggle for login/signup/forgot pages
 */

import { Group, Container, Box, Text, Paper } from "@mantine/core";
import { ThemeToggle } from "./ThemeToggle";

export const AuthHeader: React.FC = () => {
  return (
    <Paper p="md">
      <Container size={420}>
        <Group justify="space-between" align="center">
          {/* Logo/Title */}
          <Box>
            <Text
              fw={700}
              size="lg"
              style={{
                fontFamily: "Greycliff CF, var(--mantine-font-family)",
              }}
            >
              BTC2
            </Text>
          </Box>

          {/* Theme Toggle */}
          <ThemeToggle />
        </Group>
      </Container>
    </Paper>
  );
};

export default AuthHeader;
