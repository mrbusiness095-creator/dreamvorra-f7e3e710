// Netlify deployment configuration for TanStack Start.
// The Netlify plugin provides the server/function runtime used by the payment server functions.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  // Netlify's TanStack Start plugin owns the server deployment wiring.
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [netlify()],
  },
});
