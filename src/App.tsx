/**
 * Main App Component
 */

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { AuthProvider } from "./contexts/AuthContext";
import { AppRouter } from "./router/AppRouter";
import { Box } from "@mantine/core";

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
        </Box>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
