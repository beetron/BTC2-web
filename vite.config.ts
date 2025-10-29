import vite from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vite()],
  server: {
    port: 5173,
    open: true,
  },
});
