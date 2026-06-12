import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // vite preview (used by Railway/Nixpacks deployment) — no proxy needed
  // since VITE_API_URL already points at the API's public URL.
  preview: {
    host: "0.0.0.0",
    port: 80,
    allowedHosts: "all",
  },
});
