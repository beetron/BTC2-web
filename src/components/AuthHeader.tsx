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
          <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/src/public/btc2-logo-400x400.png"
              alt="BTC2 Logo"
              style={{
                height: 40,
                width: 40,
                objectFit: "contain",
              }}
            />
            <Text
              fw={700}
              size="lg"
              style={{
                fontFamily: "Greycliff CF, var(--mantine-font-family)",
              }}
            >
              bTC2
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
