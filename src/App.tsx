/**
 * Main App Component
 */

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { AppRouter } from "./router/AppRouter";
import { Box } from "@mantine/core";
import { messageCacheService } from "./services/messageCacheService";

function App() {
  // Initialize message cache on app load
  useEffect(() => {
    const initCache = async () => {
      try {
        await messageCacheService.initializeDB();
      } catch (error) {
        console.error("Failed to initialize message cache:", error);
      }
    };

    initCache();
  }, []);

  return (
    <MantineProvider
      theme={{
        primaryColor: "blue",
      }}
      defaultColorScheme="dark"
    >
      <Notifications />
      <AuthProvider>
        <SocketProvider>
          <Box>
            <AppRouter />
          </Box>
        </SocketProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
