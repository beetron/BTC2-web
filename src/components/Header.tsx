/**
 * Header Component with Navigation
 */

import {
  Group,
  Button,
  Burger,
  Drawer,
  Stack,
  Container,
  Box,
  Text,
  Paper,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconUsers,
  IconEdit,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { notifications } from "@mantine/notifications";

interface HeaderProps {}

export const Header: React.FC<HeaderProps> = () => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      notifications.show({
        title: "Success",
        message: "Logged out successfully",
        color: "green",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
    }
  };

  const menuItems = [
    {
      label: "Friends",
      icon: IconUsers,
      onClick: () => {
        navigate("/friends");
        close();
      },
    },
    {
      label: "Edit Friends",
      icon: IconEdit,
      onClick: () => {
        navigate("/edit-friends");
        close();
      },
    },
    {
      label: "Settings",
      icon: IconSettings,
      onClick: () => {
        navigate("/settings");
        close();
      },
    },
  ];

  return (
    <Paper p="md">
      <Container size="sm">
        <Group justify="space-between" align="center">
          {/* Logo/Title */}
          <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/btc2-logo-400x400.png"
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

          {/* Desktop Navigation */}
          <Group gap="md" visibleFrom="sm">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="subtle"
                onClick={item.onClick}
                leftSection={<item.icon size={16} />}
              >
                {item.label}
              </Button>
            ))}
            <Button
              variant="light"
              color="red"
              onClick={handleLogout}
              leftSection={<IconLogout size={16} />}
            >
              Logout
            </Button>
          </Group>

          {/* Theme Toggle + Burger Menu */}
          <Group gap="md">
            <ThemeToggle />
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
          </Group>
        </Group>
      </Container>

      {/* Mobile Drawer Menu */}
      <Drawer
        opened={opened}
        onClose={close}
        title="Menu"
        position="right"
        padding="md"
      >
        <Stack gap="md">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant="subtle"
              onClick={item.onClick}
              fullWidth
              justify="flex-start"
              leftSection={<item.icon size={16} />}
            >
              {item.label}
            </Button>
          ))}
          <Button
            variant="light"
            color="red"
            onClick={handleLogout}
            fullWidth
            justify="flex-start"
            leftSection={<IconLogout size={16} />}
          >
            Logout
          </Button>
        </Stack>
      </Drawer>
    </Paper>
  );
};

export default Header;
