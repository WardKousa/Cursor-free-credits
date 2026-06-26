import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Proxy API calls to the Fluxzero backend so the browser stays same-origin
    // (no CORS). Chat → /api/chat → :8080 → n8n. Run the backend on :8080.
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});
