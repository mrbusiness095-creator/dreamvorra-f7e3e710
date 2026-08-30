// DreamVora deployment configuration
//
// The same source code can be deployed to both Netlify and Vercel:
// - Netlify uses the official TanStack Start Netlify Vite plugin.
// - Vercel uses Nitro's Vercel preset, which produces the server output
//   Vercel Functions expect.
//
// Do not use both deployment adapters in the same build. Selecting the
// adapter from the hosting platform keeps SSR, server functions and routes
// working without changing the application code.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

export default defineConfig({
  // Keep DreamVora's custom server entry and all existing server functions.
  tanstackStart: {
    server: { entry: "server" },
  },

  // Netlify and Vercel need different deployment adapters.
  //
  // On Vercel, the Lovable wrapper's Nitro integration is explicitly enabled
  // with the Vercel preset. This fixes the situation where the build succeeds
  // but Vercel serves its own 404 page because no Vercel Function was emitted.
  //
  // On Netlify, Nitro is disabled because the official Netlify TanStack Start
  // plugin below owns the server/function wiring.
  nitro: isVercel ? { preset: "vercel" } : false,

  vite: {
    // Only load the Netlify adapter on non-Vercel builds. This is important:
    // the Netlify adapter must not be allowed to replace the Vercel Nitro
    // output when the same Git repository is deployed on Vercel.
    plugins: isVercel ? [] : [netlify()],
  },
});
