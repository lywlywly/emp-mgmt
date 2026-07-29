import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHTTPHandler } from "@trpc/server/adapters/standalone";
import path from "path";
import { defineConfig } from "vite";

import { mockAppRouter } from "./mock-trpc/router.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "mock-trpc-server",
      configureServer(server) {
        server.middlewares.use(
          "/trpc",
          createHTTPHandler({ router: mockAppRouter }),
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
