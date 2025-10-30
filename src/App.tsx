/**
 * Main App Component
 */

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { AuthProvider } from "./contexts/AuthContext";
import { AppRouter } from "./router/AppRouter";
import { ThemeToggle } from "./components/ThemeToggle";
import { Box, Group } from "@mantine/core";

function App() {
  return (
    <MantineProvider
      theme={{
        primaryColor: "blue",
      }}
    >
      <Notifications />
      <AuthProvider>
        <Box>
          <AppRouter />
          <Group style={{ position: "fixed", right: 20, top: 20 }}>
            <ThemeToggle />
          </Group>
        </Box>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
